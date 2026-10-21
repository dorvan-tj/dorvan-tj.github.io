/* Демо-админка салона Iris: записи со статусами, расписание мастеров, выходные, пример уведомления в Telegram.
   Всё хранится только в этом браузере (localStorage) и никуда не отправляется. Записи с сайта (booking.js) попадают сюда через ту же память,
   выходные из этой страницы убирают окна в онлайн-записи через js/data.js. */
(function () {
  "use strict";
  var D = window.IRIS;
  var loginEl = document.getElementById("login");
  var appEl = document.getElementById("app");
  if (!D || !loginEl || !appEl) return;
  var U = D.util, S = U.store;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var AUTH = "dorvan-demo-iris-auth";
  var PASS = "iris-demo";
  var DAYS = 14;
  var STATUSES = [
    { id: "new", label: "Новая" },
    { id: "confirmed", label: "Подтверждена" },
    { id: "done", label: "Выполнена" },
    { id: "cancelled", label: "Отменена" },
  ];
  var WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  var filter = "all";

  /* ---------- Помощники ---------- */
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var money = function (n) { return new Intl.NumberFormat("ru-RU").format(n).replace(/\s/g, " ") + " сом."; };
  var plural = function (n, f) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? f[1] : f[2]; };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var parseISO = function (s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var dayOf = function (offset) { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + offset); };
  var fmtDay = function (d) { return cap(new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "long" }).format(d)).replace(/(\d) /, "$1 "); };
  var fmtLong = function (d) { return new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(d).replace(/(\d) /, "$1 "); };
  var addMin = function (hhmm, min) { var p = hhmm.split(":"); return U.hhmm(+p[0] * 60 + +p[1] + min); };
  var label = function (id) { for (var i = 0; i < STATUSES.length; i++) if (STATUSES[i].id === id) return STATUSES[i].label; return id; };
  var say = function (el, text) { el.textContent = ""; setTimeout(function () { el.textContent = text; }, 30); };
  var authMem = false; // если браузер не даёт sessionStorage, вход держим в памяти страницы
  var isAuthed = function () { if (authMem) return true; try { return sessionStorage.getItem(AUTH) === "1"; } catch (e) { return false; } };
  var setAuthed = function (on) { authMem = on; try { if (on) sessionStorage.setItem(AUTH, "1"); else sessionStorage.removeItem(AUTH); } catch (e) { /* не страшно */ } };
  var toMin = function (t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; };
  var shortest = function (m) { // самая короткая услуга мастера: по ней считаем число свободных окон
    var list = D.services.filter(function (s) { return s.masters.indexOf(m.id) !== -1; });
    list.sort(function (a, b) { return a.min - b.min; });
    return list[0];
  };

  /* ---------- Примеры записей ----------
     Создаются на свежие даты в свободных окнах, поэтому занимают время и на сайте: отменили запись — окно снова свободно.
     Примеры, которых никто не трогал, на новый день пересоздаются; записи посетителя остаются. */
  var SEEDS = [
    { day: -1, at: "12:00", service: "mani-gel", name: "Нигора", phone: "+992 90 000 01 01", status: "done" },
    { day: 0, from: "15:00", service: "cut-w", name: "Фарзона", phone: "+992 90 000 01 02", status: "new" },
    { day: 1, from: "11:00", service: "brow-lam", name: "Мехрона", phone: "+992 90 000 01 03", status: "confirmed" },
    { day: 1, from: "15:00", service: "cut-m", name: "Азиз", phone: "+992 90 000 01 04", status: "new", comment: "Первый раз у вас" },
    { day: 2, from: "12:00", service: "clean", name: "Шахло", phone: "+992 90 000 01 05", status: "confirmed" },
    { day: 3, from: "13:00", service: "color", name: "Парвина", phone: "+992 90 000 01 06", status: "cancelled", comment: "Заболела, перенесёт запись" },
  ];
  function seed() {
    var today = U.iso(dayOf(0));
    if (S.get().seedDay === today) return;
    S.update(function (s) {
      s.bookings = s.bookings.filter(function (b) { return !(b.example && !b.touched); });
      s.seedDay = today;
    });
    SEEDS.forEach(function (x, idx) {
      var sv = U.byId(D.services, x.service), mid = sv.masters[0];
      var date = dayOf(x.day), time = x.at || null;
      for (var k = 0; !time && k < 6; k++) { // первое свободное окно не раньше нужного часа; нет окон — следующий день
        date = dayOf(x.day + k);
        var free = U.slots(mid, date, sv).filter(function (o) { return o.free && o.time >= x.from; });
        if (free.length) time = free[0].time;
      }
      if (!time) return;
      S.add({ example: true, status: x.status, created: Date.now() - 3 * 86400000 - idx * 60000, service: sv.id, master: mid, date: U.iso(date), time: time, min: sv.min, price: sv.price, name: x.name, phone: x.phone, comment: x.comment || "" });
    });
  }

  /* ---------- Данные для показа ---------- */
  var allBookings = function () {
    var list = S.get().bookings.slice();
    list.sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : (a.date + a.time) > (b.date + b.time) ? 1 : 0; });
    return list;
  };
  var counts = function (list) {
    var c = { all: list.length };
    STATUSES.forEach(function (s) { c[s.id] = 0; });
    list.forEach(function (b) { if (c[b.status] !== undefined) c[b.status]++; });
    return c;
  };
  var masterOffThatDay = function (b) { // выходной у мастера в день записи (по графику или поставленный здесь)
    var m = U.byId(D.masters, b.master), d = parseISO(b.date);
    return !!m && (m.off.indexOf(d.getDay()) !== -1 || S.isOff(m.id, d));
  };

  /* ---------- Рисуем ---------- */
  function renderToday() {
    var t = U.iso(dayOf(0));
    var list = S.get().bookings.filter(function (b) { return b.date === t && b.status !== "cancelled"; });
    var fresh = list.filter(function (b) { return b.status === "new"; }).length;
    $("#today").textContent = "Сегодня, " + fmtLong(dayOf(0)) + ": " + (list.length ? "записей — " + list.length + ", из них новых — " + fresh : "записей нет");
  }

  function renderFilters() {
    var c = counts(allBookings());
    var items = [{ id: "all", label: "Все" }].concat(STATUSES);
    $("#filters").innerHTML = items.map(function (f) {
      return '<button type="button" data-f="' + f.id + '" aria-pressed="' + (filter === f.id) + '">' + f.label + " · " + c[f.id] + "</button>";
    }).join("");
  }

  // две действующие записи к одному мастеру в пересекающееся время (бывает, если вернуть отменённую запись, а её окно уже заняли)
  function overlaps(b, all) {
    if (b.status !== "new" && b.status !== "confirmed") return false;
    var a0 = toMin(b.time), a1 = a0 + b.min;
    return all.some(function (o) { return o.id !== b.id && o.master === b.master && o.date === b.date && (o.status === "new" || o.status === "confirmed") && toMin(o.time) < a1 && a0 < toMin(o.time) + o.min; });
  }

  function bookingHTML(b, all) {
    var s = U.byId(D.services, b.service), m = U.byId(D.masters, b.master);
    var d = parseISO(b.date);
    var tags = "", warn = "";
    var fresh = !b.example && Date.now() - b.created < 20 * 60 * 1000; // сделана на сайте за последние 20 минут
    if (b.example) tags = '<span class="tag">пример</span>';
    else if (fresh) tags = '<span class="tag tag--new">только что с сайта</span>';
    if ((b.status === "new" || b.status === "confirmed") && masterOffThatDay(b)) warn = '<div class="bk__warn"><span class="tag tag--warn">У мастера выходной — перенесите запись</span></div>';
    if (overlaps(b, all)) warn += '<div class="bk__warn"><span class="tag tag--warn">Пересекается с другой записью к этому мастеру — проверьте время</span></div>';
    var opts = STATUSES.map(function (st) { return '<option value="' + st.id + '"' + (st.id === b.status ? " selected" : "") + ">" + st.label + "</option>"; }).join("");
    var who = esc(b.name) + ", " + fmtDay(d) + ", " + b.time;
    return '<li class="bk st-' + b.status + (fresh ? " is-fresh" : "") + '" data-id="' + b.id + '">' +
      '<div class="bk__when"><b>' + fmtDay(d) + "</b><span>" + b.time + "–" + addMin(b.time, b.min) + "</span>" + (tags ? '<div class="bk__tags">' + tags + "</div>" : "") + "</div>" +
      '<div class="bk__what"><b>' + esc(s.name) + "</b><span>" + esc(m.name) + " · " + money(b.price || s.price) + "</span></div>" +
      '<div class="bk__who"><b>' + esc(b.name) + '</b><a href="tel:' + esc(b.phone.replace(/[^\d+]/g, "")) + '">' + esc(b.phone) + "</a>" + (b.comment ? "<em>«" + esc(b.comment) + "»</em>" : "") + "</div>" +
      '<div class="bk__st"><label for="st-' + b.id + '">Статус<span class="sr-only"> записи: ' + who + '</span></label><select id="st-' + b.id + '" data-id="' + b.id + '">' + opts + "</select></div>" +
      warn + "</li>";
  }

  function renderList() {
    var all = allBookings();
    var list = all.filter(function (b) { return filter === "all" || b.status === filter; });
    $("#bklist").innerHTML = list.length ? list.map(function (b) { return bookingHTML(b, all); }).join("") : '<li class="bk-empty">В этой группе записей нет.</li>';
  }

  function dayHTML(m, sv, date, now) {
    var iso = U.iso(date);
    var wd = WD[date.getDay()], n = date.getDate();
    if (m.off.indexOf(date.getDay()) !== -1) {
      return '<li><div class="day day--fixed"><span class="day__wd">' + wd + '</span><span class="day__n">' + n + '</span><span class="day__f">по графику</span></div></li>';
    }
    var off = S.isOff(m.id, date);
    var booked = S.get().bookings.filter(function (b) { return b.master === m.id && b.date === iso && b.status !== "cancelled"; }).length;
    var free = off ? 0 : U.freeCount(m.id, date, sv, now);
    var note = off ? "выходной" : free ? free + " " + plural(free, ["окно", "окна", "окон"]) : "нет мест";
    var aria = "Выходной у мастера " + m.name + ", " + fmtLong(date) + ". " + (off ? "Окон на сайте нет." : "Окон на сайте: " + free + ".") + " Записей: " + booked + ".";
    return '<li><button type="button" class="day' + (off ? " is-off" : "") + '" aria-pressed="' + off + '" data-m="' + m.id + '" data-d="' + iso + '" aria-label="' + esc(aria) + '">' +
      '<span class="day__wd">' + wd + '</span><span class="day__n">' + n + '</span><span class="day__f">' + note + "</span>" +
      (booked ? '<span class="day__b" aria-hidden="true">' + booked + "</span>" : "") + "</button></li>";
  }

  function renderSchedule() {
    var now = new Date();
    $("#masters").innerHTML = D.masters.map(function (m) {
      var sv = shortest(m);
      var days = "";
      for (var i = 0; i < DAYS; i++) days += dayHTML(m, sv, dayOf(i), now);
      var weekly = m.off.map(function (w) { return WD[w]; }).join(", ");
      return '<article class="ms" aria-labelledby="ms-' + m.id + '"><header class="ms__head">' +
        '<span class="ms__ava" aria-hidden="true">' + esc(m.name.charAt(0)) + "</span>" +
        '<div><h3 id="ms-' + m.id + '">' + esc(m.name) + "</h3><p>" + esc(m.role) + " · выходной по графику: " + weekly + "</p></div>" +
        '<a class="ms__link" href="booking.html?service=' + sv.id + "&amp;master=" + m.id + '">Окна на сайте<span class="sr-only"> у мастера ' + esc(m.name) + "</span> →</a></header>" +
        '<ul class="days">' + days + "</ul></article>";
    }).join("");
  }

  function tgText(b) {
    var s = U.byId(D.services, b.service), m = U.byId(D.masters, b.master), d = parseISO(b.date);
    return "<b>🔔 Новая запись" + (b.example ? " (пример)" : "") + "</b>\n" +
      "Услуга: " + esc(s.name) + "\nМастер: " + esc(m.name) + "\nКогда: " + fmtDay(d) + ", " + b.time + "–" + addMin(b.time, b.min) + "\n" +
      "Клиент: " + esc(b.name) + ", " + esc(b.phone) + (b.comment ? "\nКомментарий: " + esc(b.comment) : "") + "\nСтоимость: " + money(b.price || s.price);
  }
  function renderTg() {
    var list = S.get().bookings.slice();
    list.sort(function (a, b) { return b.created - a.created; });
    var b = list[0];
    $("#tg-box").innerHTML = '<div class="tg__head"><span class="tg__ava" aria-hidden="true">I</span><div><b>Бот Iris</b><small>уведомления администратору</small></div></div>' +
      '<div class="tg__chat">' + (b ? '<div class="tg__msg">' + tgText(b) + "</div>" : '<p class="tg__empty">Пока нет ни одной записи.</p>') + "</div>";
  }

  var renderAll = function () { renderToday(); renderFilters(); renderList(); renderSchedule(); renderTg(); };
  // после перерисовки возвращаем фокус на тот же элемент (иначе клавиатурный пользователь «теряется» в начале страницы)
  function rerender() {
    var a = document.activeElement, sel = null;
    if (a && appEl.contains(a)) {
      if (a.matches("button.day")) sel = 'button.day[data-m="' + a.getAttribute("data-m") + '"][data-d="' + a.getAttribute("data-d") + '"]';
      else if (a.matches("[data-f]")) sel = '[data-f="' + a.getAttribute("data-f") + '"]';
      else if (a.id) sel = "#" + a.id;
    }
    renderAll();
    if (sel) { var el = $(sel); if (el) el.focus(); else $("#bk-t").focus(); }
  }

  /* ---------- Вход ---------- */
  function show() {
    var on = isAuthed();
    loginEl.hidden = on;
    appEl.hidden = !on;
    $("#logout").hidden = !on;
    if (on) {
      seed();
      $("#nostore").hidden = S.works();
      renderAll();
    }
  }
  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = $("#pw"), err = $("#pw-err");
    if (pw.value.trim() !== PASS) {
      err.textContent = "Пароль не подходит. Демо-пароль написан выше: " + PASS;
      pw.setAttribute("aria-invalid", "true");
      pw.setAttribute("aria-describedby", "pw-err");
      pw.focus();
      return;
    }
    err.textContent = "";
    pw.removeAttribute("aria-invalid");
    pw.value = "";
    setAuthed(true);
    show();
    $("#app-t").focus();
  });
  $("#fill-pass").addEventListener("click", function () { var pw = $("#pw"); pw.value = PASS; pw.focus(); });
  $("#logout").addEventListener("click", function () {
    setAuthed(false);
    show();
    $("#login-t").focus();
  });
  $("#reset").addEventListener("click", function () {
    S.reset();
    try { sessionStorage.removeItem("iris-booking"); } catch (e) { /* не страшно */ }
    filter = "all";
    if (isAuthed()) { seed(); renderAll(); say($("#bk-status"), "Демо сброшено: примеры записей вернулись, выходные убраны, ваши записи удалены."); }
    else say($("#lg-status"), "Демо сброшено: записи и выходные очищены.");
  });

  /* ---------- Действия ---------- */
  $("#filters").addEventListener("click", function (e) {
    var b = e.target.closest("[data-f]");
    if (!b) return;
    filter = b.getAttribute("data-f");
    rerender();
  });

  $("#bklist").addEventListener("change", function (e) {
    var sel = e.target.closest("select[data-id]");
    if (!sel) return;
    var id = sel.getAttribute("data-id"), next = sel.value, who = "";
    S.update(function (s) {
      s.bookings.forEach(function (b) {
        if (b.id !== id) return;
        b.status = next;
        if (b.example) b.touched = true;
        who = b.name;
      });
    });
    rerender();
    var extra = next === "cancelled" ? " Время освободилось, на сайте его снова можно выбрать." : "";
    say($("#bk-status"), "Запись «" + who + "»: статус «" + label(next).toLowerCase() + "»." + extra);
  });

  $("#masters").addEventListener("click", function (e) {
    var b = e.target.closest("button.day");
    if (!b) return;
    var mid = b.getAttribute("data-m"), iso = b.getAttribute("data-d"), nowOff = false;
    S.update(function (s) {
      var arr = s.off[mid] || (s.off[mid] = []);
      var i = arr.indexOf(iso);
      if (i === -1) { arr.push(iso); nowOff = true; } else arr.splice(i, 1);
      if (!arr.length) delete s.off[mid];
    });
    rerender();
    var m = U.byId(D.masters, mid), d = parseISO(iso);
    var has = S.get().bookings.filter(function (x) { return x.master === mid && x.date === iso && (x.status === "new" || x.status === "confirmed"); }).length;
    say($("#sc-status"), nowOff
      ? m.name + ", " + fmtLong(d) + ": выходной. Окна для записи на сайте убраны." + (has ? " Внимание: на этот день уже есть записи (" + has + "). Перенесите их: они отмечены в списке выше." : "")
      : m.name + ", " + fmtLong(d) + ": день снова рабочий, окна вернулись на сайт.");
  });

  window.addEventListener("storage", function (e) {
    if (e.key !== null && e.key !== S.KEY) return;
    if (isAuthed()) rerender(); // запись появилась в другой вкладке: перерисовываем и не теряем фокус
  });
  // «Назад» с сайта: браузер мог достать страницу из кэша со старым списком
  window.addEventListener("pageshow", function (e) { if (e.persisted && isAuthed()) renderAll(); });

  show();
})();
