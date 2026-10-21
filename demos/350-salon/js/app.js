/* Общее для всех страниц: меню, появление блоков, плашка студии, «ближайшее окно», форма вопроса. */
(function () {
  "use strict";
  var doc = document;
  var D = window.IRIS;

  /* ---------- Мобильное меню ---------- */
  var burger = doc.querySelector(".burger");
  var mnav = doc.getElementById("mnav");
  if (burger && mnav) {
    var setMenu = function (open) {
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      mnav.hidden = !open;
    };
    burger.addEventListener("click", function () { setMenu(mnav.hidden); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !mnav.hidden) { setMenu(false); burger.focus(); }
    });
    mnav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  }

  /* ---------- Плавное появление блоков ---------- */
  var reveals = doc.querySelectorAll(".reveal");
  if (reveals.length) {
    if (!("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
      // Страховка: всё, что выше нижней границы экрана, обязательно должно быть видно
      // (если прокрутили слишком быстро, а браузер не успел сообщить, что блок «вошёл в кадр»).
      var rafId = 0;
      var sweep = function () {
        rafId = 0;
        var line = window.innerHeight * 0.95;
        doc.querySelectorAll(".reveal:not(.is-in)").forEach(function (el) {
          if (el.getBoundingClientRect().top < line) { el.classList.add("is-in"); io.unobserve(el); }
        });
      };
      var onScroll = function () { if (!rafId) rafId = requestAnimationFrame(sweep); };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    }
  }

  /* ---------- Плашка студии: текст для Telegram копируем на всякий случай ---------- */
  var plateBtn = doc.querySelector("[data-copy]");
  if (plateBtn) {
    plateBtn.addEventListener("click", function () {
      try { navigator.clipboard && navigator.clipboard.writeText(plateBtn.getAttribute("data-copy")).catch(function () {}); } catch (e) { /* буфер недоступен */ }
    });
  }

  /* ---------- Главная: «ближайшее окно» ---------- */
  var slot = doc.querySelector("[data-nearest]");
  if (slot && D) {
    var n = D.util.nearest("mani-gel");
    if (n) {
      var m = D.util.byId(D.masters, n.master);
      var when = n.days === 0 ? "сегодня" : n.days === 1 ? "завтра" : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(n.date);
      slot.innerHTML = '<span><span class="dotlive" aria-hidden="true"></span>Ближайшее окно</span><b>' + when + " в " + n.time + "</b><span>" + n.service.name + " · " + m.name + "</span>";
      slot.hidden = false;
    }
  }

  /* ---------- Услуги: подсветка раздела при прокрутке ---------- */
  var tabs = doc.querySelectorAll(".tabs a[data-tab]");
  if (tabs.length && "IntersectionObserver" in window) {
    var byTab = {};
    tabs.forEach(function (a) { byTab[a.getAttribute("data-tab")] = a; });
    var groups = doc.querySelectorAll(".svcgroup");
    var inBand = {};
    // подсвечиваем раздел, который сейчас в «полосе чтения»; если ни один не в ней (самый верх страницы) — подсветку снимаем
    var mark = function () {
      var cur = null;
      groups.forEach(function (g) { if (!cur && inBand[g.id]) cur = g.id; });
      tabs.forEach(function (a) { a.removeAttribute("aria-current"); });
      if (cur && byTab[cur]) { byTab[cur].setAttribute("aria-current", "true"); }
    };
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { inBand[en.target.id] = en.isIntersecting; });
      mark();
    }, { rootMargin: "-35% 0px -55% 0px" });
    groups.forEach(function (g) { so.observe(g); });
  }

  /* ---------- Форма «Задать вопрос» (в демо никуда не отправляется) ---------- */
  var form = doc.querySelector("[data-demo-form]");
  if (form) {
    // телефон: цифры, пробелы, скобки, дефис и плюс в начале; не меньше 9 и не больше 15 цифр
    var phoneOk = function (v) { v = v.trim(); var n = v.replace(/\D/g, "").length; return /^\+?[\d\s().\-–]+$/.test(v) && n >= 9 && n <= 15; };
    var setErr = function (id, msg, input) {
      var el = doc.getElementById(id);
      if (el) el.textContent = msg || "";
      if (input) { if (msg) { input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", id); } else { input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); } }
    };
    var fields = {
      name: { el: form.elements.name, err: "c-name-err", test: function (v) { return v.trim() ? "" : "Введите имя"; } },
      phone: { el: form.elements.phone, err: "c-phone-err", test: function (v) { return phoneOk(v) ? "" : "Введите телефон, например +992 90 000 00 00"; } },
    };
    var consent = form.elements.consent;
    var check = function () {
      var bad = null;
      Object.keys(fields).forEach(function (k) {
        var f = fields[k];
        var msg = f.test(f.el.value);
        setErr(f.err, msg, f.el);
        if (msg && !bad) bad = f.el;
      });
      var cm = consent.checked ? "" : "Нужно согласие на обработку данных";
      setErr("c-ok-err", cm, consent);
      if (cm && !bad) bad = consent;
      return bad;
    };
    Object.keys(fields).forEach(function (k) {
      fields[k].el.addEventListener("blur", function () { setErr(fields[k].err, fields[k].test(fields[k].el.value), fields[k].el); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = check();
      if (bad) { bad.focus(); return; }
      var box = form.parentNode;
      form.hidden = true;
      var ok = doc.createElement("div");
      ok.className = "sent";
      ok.setAttribute("role", "status");
      ok.innerHTML = '<svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true" focusable="false" style="fill:none;stroke:#9C4A40;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-7"/></svg><h3>Сообщение принято</h3><p>Мы перезвоним в течение рабочего дня.</p><p class="sent__demo">Это концепт: данные никуда не отправлены. В настоящем салоне сообщение пришло бы администратору в Telegram.</p><button class="btn btn--ghost" type="button">Написать ещё</button>';
      box.appendChild(ok);
      ok.setAttribute("tabindex", "-1");
      ok.style.outline = "none";
      ok.focus({ preventScroll: true }); // форма исчезла — фокус переходит на сообщение «принято», а не теряется
      ok.querySelector("button").addEventListener("click", function () { form.reset(); form.hidden = false; ok.remove(); fields.name.el.focus(); });
    });
  }
})();
