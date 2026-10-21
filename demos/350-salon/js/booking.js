/* Онлайн-запись: услуга → мастер → день и время → контакты → «Вы записаны».
   В демо запись НИКУДА не отправляется — всё происходит в браузере. */
(function () {
  "use strict";
  var D = window.IRIS;
  var flow = document.getElementById("flow");
  if (!D || !flow) return;
  var U = D.util;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var stepperEl = document.getElementById("stepper");
  var summaryEl = document.getElementById("summary");
  var barEl = document.getElementById("bar");
  var announceEl = document.getElementById("announce");

  var STEPS = [
    { id: "service", label: "Услуга", title: "Выберите услугу" },
    { id: "master", label: "Мастер", title: "Выберите мастера" },
    { id: "time", label: "Время", title: "Выберите день и время" },
    { id: "contacts", label: "Контакты", title: "Оставьте контакты" },
  ];
  var KEY = "iris-booking";
  var DAYS_AHEAD = 14;

  var blank = function () {
    return { cat: "all", service: null, master: null, date: null, time: null, assigned: null, name: "", phone: "", comment: "", consent: false, done: false };
  };
  var state = blank();
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY));
    if (saved && typeof saved === "object") state = Object.assign(blank(), saved);
  } catch (e) { /* память браузера недоступна — начнём с нуля */ }
  var save = function () { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* не страшно */ } };

  var step = "service";
  var preMaster = null; // пришли по ссылке «Записаться к мастеру»

  /* ---------- Мелкие помощники ---------- */
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var money = function (n) { return new Intl.NumberFormat("ru-RU").format(n).replace(/\s/g, " ") + " сом."; };
  var dur = function (m) { return m >= 60 ? Math.floor(m / 60) + " ч" + (m % 60 ? " " + (m % 60) + " мин" : "") : m + " мин"; };
  var plural = function (n, f) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? f[1] : f[2]; };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var svc = function () { return state.service ? U.byId(D.services, state.service) : null; };
  var master = function () { return state.master && state.master !== "any" ? U.byId(D.masters, state.master) : null; };
  var parseISO = function (s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var fmtLong = function (d) { return cap(new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(d)); };
  var fmtWd = function (d) { return new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(d); };
  var addMin = function (hhmm, min) { var p = hhmm.split(":"); return U.hhmm(+p[0] * 60 + +p[1] + min); };
  var now = function () { return new Date(); };
  var dates = function () {
    var n = now(), out = [];
    for (var i = 0; i < DAYS_AHEAD; i++) out.push(new Date(n.getFullYear(), n.getMonth(), n.getDate() + i));
    return out;
  };
  var said = function (msg) { if (announceEl) { announceEl.textContent = ""; setTimeout(function () { announceEl.textContent = msg; }, 50); } };

  var masterName = function () {
    var m = master();
    if (m) return m.name;
    if (state.master === "any") {
      var a = state.assigned && U.byId(D.masters, state.assigned);
      return a ? a.name + " (подобран салоном)" : "Любой свободный";
    }
    return null;
  };
  var whenLabel = function () {
    if (!state.date || !state.time) return null;
    var s = svc();
    return fmtLong(parseISO(state.date)) + ", " + state.time + (s ? "–" + addMin(state.time, s.min) : "");
  };

  /* Ближайшее окно мастера (или любого) для выбранной услуги */
  var nearestFor = function (mid) {
    var s = svc();
    var ds = dates();
    for (var i = 0; i < ds.length; i++) {
      var list = U.daySlots(mid, ds[i], s, now()).filter(function (x) { return x.free; });
      if (list.length) {
        var when = i === 0 ? "сегодня" : i === 1 ? "завтра" : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(ds[i]);
        return when + " в " + list[0].time;
      }
    }
    return "нет окон на 2 недели";
  };

  /* ---------- Проверки шагов ---------- */
  var timeStillFree = function () {
    if (!state.service || !state.master || !state.date || !state.time) return false;
    var list = U.daySlots(state.master, parseISO(state.date), svc(), now());
    for (var i = 0; i < list.length; i++) if (list[i].time === state.time) return list[i].free;
    return false;
  };
  // телефон: цифры, пробелы, скобки, дефис и плюс в начале; не меньше 9 и не больше 15 цифр
  var phoneOk = function (v) { v = v.trim(); var n = v.replace(/\D/g, "").length; return /^\+?[\d\s().\-–]+$/.test(v) && n >= 9 && n <= 15; };
  // примеры пожеланий в поле «Комментарий» — по направлению выбранной услуги
  var HINTS = {
    hair: "Например: хочу светлее на два тона",
    nails: "Например: короткие ногти, спокойный оттенок",
    face: "Например: чувствительная кожа",
    brows: "Например: хочу более естественную форму",
    makeup: "Например: образ для праздника, спокойные тона",
  };
  var canNext = function () {
    if (step === "service") return !!state.service;
    if (step === "master") return !!state.master;
    if (step === "time") return !!(state.date && state.time && timeStillFree());
    return true;
  };
  var guard = function (id) {
    if (id === "done") return state.done ? "done" : "service";
    var order = ["service", "master", "time", "contacts"];
    if (order.indexOf(id) === -1) return "service";
    if (id !== "service" && !state.service) return "service";
    if ((id === "time" || id === "contacts") && !state.master) return "master";
    if (id === "contacts" && !timeStillFree()) return "time";
    return id;
  };

  /* ---------- Шаг 1: услуга ---------- */
  var serviceList = function () {
    var pm = preMaster;
    var list = D.services.filter(function (s) { return (state.cat === "all" || s.cat === state.cat) && (!pm || s.masters.indexOf(pm) !== -1); });
    if (!list.length) return '<p class="empty">В этой категории нет услуг.</p>';
    var html = '<fieldset class="opts" style="border:0;padding:0;margin:20px 0 0;min-width:0"><legend class="sr-only">Услуга</legend>';
    var lastCat = null, firstGroup = true;
    list.forEach(function (s) {
      if (state.cat === "all" && s.cat !== lastCat) {
        lastCat = s.cat;
        var cn = D.categories.filter(function (c) { return c.id === s.cat; })[0].name;
        html += '<h3 class="opts__group" style="margin-top:' + (firstGroup ? "0" : "14px") + '">' + esc(cn) + "</h3>";
        firstGroup = false;
      }
      html += '<label class="opt"><input type="radio" name="service" value="' + s.id + '"' + (state.service === s.id ? " checked" : "") + '><span class="opt__card"><span class="opt__t">' + esc(s.name) + '</span><span class="opt__d">' + esc(s.text) + '</span><span class="opt__m"><b>' + money(s.price) + "</b>" + dur(s.min) + "</span></span></label>";
    });
    return html + "</fieldset>";
  };
  var viewService = function () {
    var pm = preMaster ? U.byId(D.masters, preMaster) : null;
    // если пришли «к мастеру», показываем только те направления, где у него есть услуги
    var cats = [{ id: "all", name: "Все" }].concat(D.categories.filter(function (c) { return !pm || pm.cats.indexOf(c.id) !== -1; }));
    if (!cats.some(function (c) { return c.id === state.cat; })) state.cat = "all";
    var hint = pm
      ? 'Услуги мастера: <b>' + esc(pm.name) + '</b>. <button type="button" class="linkbtn" data-act="clear-master">Показать все услуги</button>'
      : "Цена и длительность указаны у каждой услуги.";
    return '<h2 class="panel__title" id="st-title" tabindex="-1">Выберите услугу</h2><p class="panel__hint">' + hint + "</p>" +
      '<div class="pills" role="group" aria-label="Категория услуг">' +
      cats.map(function (c) { return '<button type="button" data-cat="' + c.id + '" aria-pressed="' + (state.cat === c.id) + '">' + esc(c.name) + "</button>"; }).join("") +
      '</div><div id="svc-list">' + serviceList() + "</div>" + actionsInline();
  };

  /* ---------- Шаг 2: мастер ---------- */
  var viewMaster = function () {
    var s = svc();
    var list = s.masters.map(function (id) { return U.byId(D.masters, id); });
    var html = '<h2 class="panel__title" id="st-title" tabindex="-1">Выберите мастера</h2><p class="panel__hint">Услуга: <b>' + esc(s.name) + "</b>, " + dur(s.min) + ", " + money(s.price) + "</p>";
    html += '<fieldset class="mpick" style="border:0;padding:0;min-width:0"><legend class="sr-only">Мастер</legend>';
    if (list.length > 1) {
      html += '<label class="opt"><input type="radio" name="master" value="any"' + (state.master === "any" ? " checked" : "") + '><span class="opt__card"><span class="mpick__ph" aria-hidden="true">✦</span><span><span class="opt__t">Любой свободный мастер</span><br><span class="opt__d">Подберём того, кто свободен в удобное вам время</span></span><span class="opt__m">ближайшее окно<b>' + nearestFor("any") + "</b></span></span></label>";
    }
    list.forEach(function (m) {
      html += '<label class="opt"><input type="radio" name="master" value="' + m.id + '"' + (state.master === m.id ? " checked" : "") + '><span class="opt__card"><span class="mpick__ph"><img src="' + m.photo + '" alt="" width="112" height="112" loading="lazy"></span><span><span class="opt__t">' + esc(m.name) + '</span><br><span class="opt__d">' + esc(m.role) + " · " + esc(m.exp) + '</span></span><span class="opt__m">ближайшее окно<b>' + nearestFor(m.id) + "</b></span></span></label>";
    });
    return html + "</fieldset>" + actionsInline();
  };

  /* ---------- Шаг 3: день и время ---------- */
  var firstAvailableDate = function () {
    var ds = dates();
    for (var i = 0; i < ds.length; i++) if (U.freeCount(state.master, ds[i], svc(), now()) > 0) return U.iso(ds[i]);
    return null;
  };
  var timesHTML = function () {
    var s = svc();
    if (!state.date) return '<p class="empty">На ближайшие две недели свободных окон нет. ' + (s.masters.length > 1 ? "Выберите другого мастера или позвоните нам." : "Позвоните нам — найдём время.") + "</p>";
    var list = U.daySlots(state.master, parseISO(state.date), s, now());
    if (!list.length) return '<p class="empty">В этот день мастер не работает. Выберите другой день.</p>';
    var html = '<fieldset style="border:0;padding:0;margin:0;min-width:0"><legend class="sr-only">Время начала</legend><div class="times">';
    list.forEach(function (x) {
      html += '<label class="time"><input type="radio" name="time" value="' + x.time + '"' + (x.free ? "" : " disabled") + (state.time === x.time && x.free ? " checked" : "") + '><span class="time__card">' + x.time + "</span></label>";
    });
    return html + '</div></fieldset><p class="legend"><span>свободно</span><span class="l-busy">занято</span><span class="l-sel">выбрано</span></p>';
  };
  var viewTime = function () {
    var s = svc();
    var ds = dates();
    // выбранный день должен быть в ленте (не прошёл, если вкладку оставили с вечера) и иметь свободные окна
    var inStrip = state.date && ds.some(function (d) { return U.iso(d) === state.date; });
    if (!inStrip || U.freeCount(state.master, parseISO(state.date), s, now()) === 0) {
      state.date = firstAvailableDate();
      state.time = null;
    } else if (state.time && !timeStillFree()) state.time = null;
    var html = '<h2 class="panel__title" id="st-title" tabindex="-1">Выберите день и время</h2><p class="panel__hint">Показываем окна, в которые уместится «' + esc(s.name) + '» (' + dur(s.min) + ").</p>";
    html += '<fieldset class="dates" id="dates" style="border:0;padding:0 0 6px;min-width:0"><legend class="sr-only">День</legend>';
    ds.forEach(function (d) {
      var iso = U.iso(d);
      var n = U.freeCount(state.master, d, s, now());
      var all = U.daySlots(state.master, d, s, now());
      var note = !all.length ? "выходной" : n ? n + " " + plural(n, ["окно", "окна", "окон"]) : "нет мест";
      html += '<label class="date"><input type="radio" name="date" value="' + iso + '"' + (n ? "" : " disabled") + (state.date === iso ? " checked" : "") + '><span class="date__card"><span class="date__wd">' + fmtWd(d) + '</span><span class="date__n">' + d.getDate() + '</span><span class="date__f">' + note + "</span></span></label>";
    });
    html += "</fieldset>";
    html += '<p class="monthlbl" id="day-label">' + (state.date ? fmtLong(parseISO(state.date)) : "") + '</p><div id="times">' + timesHTML() + "</div>";
    return html + actionsInline();
  };

  /* ---------- Шаг 4: контакты ---------- */
  var viewContacts = function () {
    return '<h2 class="panel__title" id="st-title" tabindex="-1">Оставьте контакты</h2><p class="panel__hint">Имя и телефон — чтобы подтвердить запись.</p>' +
      '<dl class="ticket only-mobile" style="margin-top:16px;max-width:none">' + miniSummary() + "</dl>" +
      '<form class="form" id="cform" novalidate style="margin-top:20px">' +
      '<div class="field"><label for="f-name">Ваше имя <span aria-hidden="true">*</span></label><input id="f-name" type="text" autocomplete="name" value="' + esc(state.name) + '" required><p class="err" id="f-name-err" aria-live="polite"></p></div>' +
      '<div class="field"><label for="f-phone">Телефон <span aria-hidden="true">*</span></label><input id="f-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+992 90 000 00 00" value="' + esc(state.phone) + '" required><p class="err" id="f-phone-err" aria-live="polite"></p></div>' +
      '<div class="field"><label for="f-comment">Комментарий (необязательно)</label><textarea id="f-comment" rows="3" placeholder="' + esc(HINTS[(svc() || {}).cat] || "Например: пожелания к визиту") + '">' + esc(state.comment) + "</textarea></div>" +
      '<div class="field"><label class="check" for="f-consent"><input id="f-consent" type="checkbox"' + (state.consent ? " checked" : "") + '><span>Согласен на обработку персональных данных (<a href="privacy.html" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;text-underline-offset:4px">политика</a>)</span></label><p class="err" id="f-consent-err" aria-live="polite"></p></div>' +
      '<div class="actions actions--inline" style="margin-top:8px"><button type="button" class="btn btn--ghost" data-act="back">Назад</button><button type="submit" class="btn btn--primary">Записаться</button></div>' +
      "</form>";
  };
  var miniSummary = function () {
    var s = svc();
    return "<div><dt>Услуга</dt><dd>" + esc(s.name) + "</dd></div><div><dt>Мастер</dt><dd>" + esc(masterName()) + "</dd></div><div><dt>Когда</dt><dd>" + esc(whenLabel()) + "</dd></div><div><dt>Стоимость</dt><dd>" + money(s.price) + " (ориентировочно)</dd></div>";
  };

  /* ---------- Готово ---------- */
  var viewDone = function () {
    var s = svc();
    var first = state.name.trim().split(/\s+/)[0] || "";
    return '<div class="done"><svg class="done__mark" viewBox="0 0 88 88" aria-hidden="true" focusable="false"><circle cx="44" cy="44" r="40"/><path d="M27 45l12 12 23-26"/></svg>' +
      '<h2 id="st-title" tabindex="-1">Вы записаны' + (first ? ", " + esc(first) : "") + "!</h2>" +
      "<p>Ждём вас в салоне. Если понадобится уточнить детали, мы позвоним по телефону " + esc(state.phone) + ".</p>" +
      '<dl class="ticket"><div><dt>Услуга</dt><dd>' + esc(s.name) + "</dd></div><div><dt>Мастер</dt><dd>" + esc(masterName()) + "</dd></div><div><dt>Когда</dt><dd>" + esc(whenLabel()) + "</dd></div><div><dt>Адрес</dt><dd>" + esc(D.brand.address) + "</dd></div><div><dt>Стоимость</dt><dd>" + money(s.price) + " (ориентировочно)</dd></div></dl>" +
      '<p class="done__demo">Это концепт: запись никуда не отправлена. В настоящем салоне она пришла бы администратору в Telegram и появилась в расписании мастера.</p>' +
      '<div class="done__btns"><button type="button" class="btn btn--primary" data-act="ics">Добавить в календарь</button><button type="button" class="btn btn--ghost" data-act="again">Записаться ещё</button><a class="btn btn--ghost" href="index.html">На главную</a></div></div>';
  };

  /* ---------- Кнопки, шаги, итог ---------- */
  var actionsInline = function () {
    return '<div class="actions actions--inline">' + (step !== "service" ? '<button type="button" class="btn btn--ghost" data-act="back">Назад</button>' : "") + '<button type="button" class="btn btn--primary" data-act="next"' + (canNext() ? "" : " disabled") + ">Далее</button></div>";
  };
  var renderStepper = function () {
    var idx = step === "done" ? 4 : STEPS.map(function (s) { return s.id; }).indexOf(step);
    stepperEl.innerHTML = STEPS.map(function (s, i) {
      var cls = i < idx ? "is-done" : i === idx ? "is-current" : "";
      var back = i < idx && step !== "done" ? '<button type="button" data-go="' + s.id + '" aria-label="Вернуться к шагу «' + s.label + '»"></button>' : "";
      return '<li class="' + cls + '"' + (i === idx ? ' aria-current="step"' : "") + ">" + back + s.label + "</li>";
    }).join("");
  };
  var row = function (k, v) { return "<div><dt>" + k + "</dt><dd" + (v ? "" : ' class="is-empty"') + ">" + (v ? esc(v) : "—") + "</dd></div>"; };
  var renderSummary = function () {
    var s = svc();
    summaryEl.innerHTML = "<h2>Ваша запись</h2><dl>" + row("Услуга", s && s.name) + row("Мастер", masterName()) + row("Дата и время", whenLabel()) + row("Длительность", s && dur(s.min)) +
      '</dl><div class="summary__total"><span>Итого (ориентировочно)</span><b>' + (s ? money(s.price) : "—") + '</b></div><p class="summary__note">Оплата после услуги, на месте. Предоплата не нужна. Точную стоимость подтвердит мастер.</p>';
  };
  var renderBar = function () {
    if (step === "done") { barEl.hidden = true; return; }
    var s = svc();
    var line = s ? s.name + (whenLabel() ? " · " + state.time : "") : "Выберите услугу";
    barEl.hidden = false;
    var isLast = step === "contacts";
    barEl.innerHTML = (step !== "service" ? '<button type="button" class="btn btn--ghost" data-act="back" aria-label="Назад">←</button>' : "") +
      '<div class="bar__sum"><small>' + esc(line) + "</small><b>" + (s ? money(s.price) : "—") + "</b></div>" +
      '<button type="button" class="btn btn--primary" data-act="' + (isLast ? "submit" : "next") + '"' + (canNext() ? "" : " disabled") + ">" + (isLast ? "Записаться" : "Далее") + "</button>";
  };
  var updateChrome = function () {
    renderSummary();
    renderBar();
    document.querySelectorAll(".actions--inline [data-act='next']").forEach(function (b) { b.disabled = !canNext(); });
  };

  var render = function () {
    renderStepper();
    flow.innerHTML = { service: viewService, master: viewMaster, time: viewTime, contacts: viewContacts, done: viewDone }[step]();
    updateChrome();
    var book = document.querySelector(".book");
    if (book) book.setAttribute("data-step", step);
    if (step === "time") {
      var sel = flow.querySelector("#dates input:checked");
      var strip = $("#dates");
      if (sel && strip) {
        // двигаем только ленту дней, страницу не трогаем
        var left = sel.parentNode.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
        strip.scrollLeft = Math.max(0, left - 16);
      }
    }
  };

  var focusTitle = function () {
    var t = $("#st-title");
    if (t) t.focus({ preventScroll: true });
    var top = stepperEl.getBoundingClientRect().top;
    if (top < 70 || top > 400) stepperEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Какие шаги лежат в истории браузера: кнопка «Назад» на странице тогда работает как «Назад» в браузере,
  // а не добавляет новые записи (иначе после неё кнопка браузера возвращала бы туда, откуда только что ушли).
  var trail = [];
  var pos = 0;
  var go = function (next, push) {
    step = next;
    if (push !== false) {
      pos += 1;
      trail = trail.slice(0, pos);
      trail[pos] = next;
      history.pushState({ step: next, pos: pos }, "", "#" + next);
    }
    render();
    focusTitle();
    var i = STEPS.map(function (s) { return s.id; }).indexOf(next);
    said(next === "done" ? "Вы записаны" : "Шаг " + (i + 1) + " из 4: " + STEPS[i].title);
  };

  /* ---------- Действия ---------- */
  var reset = function () {
    state = blank();
    preMaster = null;
    save();
    go("service");
  };

  /* Файл календаря (.ics). Время салона — по Душанбе (UTC+5, без перехода на летнее), в файле оно записано в UTC (с «Z»),
     поэтому на любом телефоне и в любом часовом поясе визит встанет на нужное время. Текст экранируется и переносится по правилам RFC 5545. */
  var icsText = function (s) { return String(s).replace(/\u00A0/g, " ").replace(/\u2060/g, "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); };
  var icsFold = function (line) {
    var enc = new TextEncoder(), out = "", cur = "", bytes = 0;
    Array.from(line).forEach(function (ch) {
      var b = enc.encode(ch).length;
      if (bytes + b > 75) { out += cur + "\r\n "; cur = ""; bytes = 1; } // не длиннее 75 байт; продолжение начинается с пробела
      cur += ch; bytes += b;
    });
    return out + cur;
  };
  var p2 = function (n) { return (n < 10 ? "0" : "") + n; };
  var icsUTC = function (date, hhmm) {
    var p = hhmm.split(":");
    var u = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), +p[0] - 5, +p[1]));
    return u.getUTCFullYear() + p2(u.getUTCMonth() + 1) + p2(u.getUTCDate()) + "T" + p2(u.getUTCHours()) + p2(u.getUTCMinutes()) + "00Z";
  };
  var makeICS = function () {
    var s = svc();
    var d = parseISO(state.date);
    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Iris beauty studio (concept)//RU", "BEGIN:VEVENT",
      "UID:" + Date.now() + "@iris.example", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""),
      "DTSTART:" + icsUTC(d, state.time), "DTEND:" + icsUTC(d, addMin(state.time, s.min)),
      "SUMMARY:" + icsText("Iris: " + s.name), "LOCATION:" + icsText(D.brand.address),
      "DESCRIPTION:" + icsText("Мастер: " + masterName() + ". Концепт студии Dorvan — запись демонстрационная."),
      "END:VEVENT", "END:VCALENDAR",
    ];
    var blob = new Blob([lines.map(icsFold).join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "iris-zapis.ics";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  var submit = function () {
    var errs = {};
    if (!state.name.trim()) errs.name = "Введите имя";
    if (!phoneOk(state.phone)) errs.phone = "Введите телефон, например +992 90 000 00 00";
    if (!state.consent) errs.consent = "Нужно согласие на обработку данных";
    var map = { name: "f-name", phone: "f-phone", consent: "f-consent" };
    var first = null;
    Object.keys(map).forEach(function (k) {
      var input = document.getElementById(map[k]);
      var err = document.getElementById(map[k] + "-err");
      if (err) err.textContent = errs[k] || "";
      if (input) { if (errs[k]) { input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", map[k] + "-err"); if (!first) first = input; } else { input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); } }
    });
    if (first) { first.focus(); return; }
    state.done = true;
    save();
    go("done");
  };

  /* ---------- События ---------- */
  flow.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "service") {
      state.service = t.value;
      var s = svc();
      // мастер и время зависят от услуги — сбрасываем, если больше не подходят
      if (state.master && state.master !== "any" && s.masters.indexOf(state.master) === -1) state.master = null;
      if (preMaster && s.masters.indexOf(preMaster) !== -1) state.master = preMaster;
      if (s.masters.length === 1) state.master = s.masters[0];
      state.time = null; state.assigned = null;
    } else if (t.name === "master") {
      state.master = t.value;
      state.time = null; state.assigned = null;
    } else if (t.name === "date") {
      state.date = t.value; state.time = null; state.assigned = null;
      $("#times").innerHTML = timesHTML();
      $("#day-label").textContent = fmtLong(parseISO(state.date));
    } else if (t.name === "time") {
      state.time = t.value;
      var list = U.daySlots(state.master, parseISO(state.date), svc(), now());
      state.assigned = null;
      list.forEach(function (x) { if (x.time === state.time) state.assigned = x.master || (master() && master().id) || null; });
    } else if (t.id === "f-consent") {
      state.consent = t.checked;
      var ce = document.getElementById("f-consent-err");
      if (ce && t.checked) { ce.textContent = ""; t.removeAttribute("aria-invalid"); }
    }
    save();
    updateChrome();
  });

  flow.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "f-name") state.name = t.value;
    else if (t.id === "f-phone") state.phone = t.value;
    else if (t.id === "f-comment") state.comment = t.value;
    else return;
    save();
  });

  flow.addEventListener("focusout", function (e) {
    var t = e.target;
    if (t.id === "f-name" && !t.value.trim()) { document.getElementById("f-name-err").textContent = "Введите имя"; t.setAttribute("aria-invalid", "true"); }
    else if (t.id === "f-name") { document.getElementById("f-name-err").textContent = ""; t.removeAttribute("aria-invalid"); }
    if (t.id === "f-phone" && t.value && !phoneOk(t.value)) { document.getElementById("f-phone-err").textContent = "Введите телефон, например +992 90 000 00 00"; t.setAttribute("aria-invalid", "true"); }
    else if (t.id === "f-phone") { document.getElementById("f-phone-err").textContent = ""; t.removeAttribute("aria-invalid"); }
  });

  var onClick = function (e) {
    var b = e.target.closest("[data-act],[data-cat],[data-go]");
    if (!b) return;
    var act = b.getAttribute("data-act");
    if (b.hasAttribute("data-cat")) {
      state.cat = b.getAttribute("data-cat");
      flow.querySelectorAll("[data-cat]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      $("#svc-list").innerHTML = serviceList();
      return;
    }
    if (b.hasAttribute("data-go")) { go(b.getAttribute("data-go")); return; }
    if (act === "clear-master") { preMaster = null; render(); return; }
    if (act === "back") {
      var prev = STEPS[Math.max(0, STEPS.map(function (s) { return s.id; }).indexOf(step) - 1)].id;
      if (pos > 0 && trail[pos - 1] === prev) history.back(); else go(prev);
      return;
    }
    if (act === "next") { if (!canNext()) return; var order = ["service", "master", "time", "contacts"]; go(order[order.indexOf(step) + 1]); return; }
    if (act === "submit") { submit(); return; }
    if (act === "ics") { makeICS(); return; }
    if (act === "again") { reset(); return; }
  };
  flow.addEventListener("click", onClick);
  barEl.addEventListener("click", onClick);
  stepperEl.addEventListener("click", onClick);
  flow.addEventListener("submit", function (e) { e.preventDefault(); submit(); });

  window.addEventListener("popstate", function () {
    var h = location.hash.replace("#", "");
    pos = history.state && typeof history.state.pos === "number" ? history.state.pos : 0;
    step = guard(h);
    trail[pos] = step;
    render();
    focusTitle();
  });

  /* ---------- Старт ---------- */
  var q = new URLSearchParams(location.search);
  var qs = q.get("service"), qm = q.get("master");
  var startStep = guard(location.hash.replace("#", ""));
  if (qs && U.byId(D.services, qs)) {
    state = Object.assign(blank(), { service: qs });
    var sv = U.byId(D.services, qs);
    if (sv.masters.length === 1) state.master = sv.masters[0];
    startStep = "master";
    save();
  } else if (qm && U.byId(D.masters, qm)) {
    state = blank();
    preMaster = qm;
    startStep = "service";
    save();
  }
  startStep = guard(startStep);
  if (state.done && startStep !== "done") { state = blank(); startStep = "service"; save(); }
  step = startStep;
  // после перезагрузки страницы в истории может уже быть несколько шагов: позицию берём из неё, а предыдущие шаги нам неизвестны
  pos = history.state && typeof history.state.pos === "number" ? history.state.pos : 0;
  trail = [];
  trail[pos] = step;
  history.replaceState({ step: step, pos: pos }, "", location.pathname + "#" + step); // адрес без ?service=…: перезагрузка не сбросит выбор
  render();
})();
