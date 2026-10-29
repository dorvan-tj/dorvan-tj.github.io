/* Dorvan · общий скрипт концептов клиник: язык RU/TJ, запись (панель + окно), «до/после», меню, подсказки вместо живых контактов.
   Данные клиники — window.CLINIC (подставляет build.py), таджикские тексты — window.TJ. Форма ничего никуда не отправляет (это концепт). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var C = window.CLINIC || {};
  var TJ = window.TJ || {};
  var lang = 'ru';
  var ruText = new Map(), ruAttr = new Map();
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* без памяти браузера тоже работает */ } }
  };
  var MONTHS = {
    ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    tg: ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр']
  };
  var MSG = {
    ru: {
      demo: 'Это концепт. Здесь будет ссылка: ',
      name: 'Напишите, как вас зовут.',
      tel: 'Проверьте номер телефона: нужно не меньше 9 цифр.',
      ok: 'Поставьте галочку согласия на обработку данных.',
      sum: function (d, doc, date) { return '<b>' + d + '</b><small>' + doc + ' · ' + date + '</small>'; },
      anyDoc: 'любой врач'
    },
    tg: {
      demo: 'Ин консепт аст. Дар ин ҷо истиноди клиника мешавад: ',
      name: 'Номатонро нависед.',
      tel: 'Рақами телефонро санҷед: на камтар аз 9 рақам лозим аст.',
      ok: 'Розигӣ барои коркарди маълумотро қайд кунед.',
      sum: function (d, doc, date) { return '<b>' + d + '</b><small>' + doc + ' · ' + date + '</small>'; },
      anyDoc: 'ҳар духтур'
    }
  };

  /* ——— язык ——— */
  function setLang(l, save) {
    lang = l === 'tg' ? 'tg' : 'ru';
    root.lang = lang;
    $$('[data-t]').forEach(function (el) {
      if (!ruText.has(el)) ruText.set(el, el.innerHTML);
      var v = lang === 'tg' ? TJ[el.getAttribute('data-t')] : null;
      el.innerHTML = v != null ? v : ruText.get(el);
    });
    $$('[data-ta]').forEach(function (el) {
      var saved = ruAttr.get(el) || {};
      el.getAttribute('data-ta').split('|').forEach(function (pair) {
        var i = pair.indexOf(':'), a = pair.slice(0, i), k = pair.slice(i + 1);
        if (!(a in saved)) saved[a] = el.getAttribute(a) || '';
        var v = lang === 'tg' ? TJ[k] : null;
        el.setAttribute(a, v != null ? v : saved[a]);
      });
      ruAttr.set(el, saved);
    });
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'); });
    if (C.title) document.title = lang === 'tg' ? C.title.tg : C.title.ru;
    var md = $('meta[name="description"]');
    if (md && C.desc) md.setAttribute('content', lang === 'tg' ? C.desc.tg : C.desc.ru);
    if (save) store.set('clinic-lang', lang);
    refreshSummary();
  }
  $$('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang, true); }); });

  /* ——— меню на телефоне ——— */
  var burger = $('.burger'), menu = $('.menu');
  function closeMenu() { if (!menu) return; menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.nav')) closeMenu(); });
  }

  /* ——— подсказка вместо живых контактов ——— */
  var toast = $('#toast'), tt;
  function say(text) {
    if (!toast) return;
    toast.textContent = text; toast.classList.add('on');
    clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('on'); }, 3800);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-demo]');
    if (!a) return;
    e.preventDefault();
    say(MSG[lang].demo + a.getAttribute('data-demo'));
  });

  /* ——— запись ——— */
  var dir = $('#b-dir'), doc = $('#b-doc'), date = $('#b-date'), dlg = $('#dlg'), pol = $('#pol');
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  if (date) {
    var today = new Date(), next = new Date(today.getTime() + 864e5);
    date.min = iso(today); date.value = iso(next);
  }
  function filterDocs() {
    if (!doc) return;
    var d = dir ? dir.value : '';
    $$('option[data-dirs]', doc).forEach(function (o) {
      var ok = !d || o.dataset.dirs.split(' ').indexOf(d) > -1;
      o.hidden = !ok; o.disabled = !ok;
    });
    var cur = doc.selectedOptions[0];
    if (cur && cur.disabled) doc.value = '';
  }
  if (dir) dir.addEventListener('change', filterDocs);
  filterDocs();

  function fmtDate(v) {
    var p = (v || '').split('-');
    if (p.length < 3) return '';
    return Number(p[2]) + ' ' + MONTHS[lang][Number(p[1]) - 1];
  }
  var sum = $('#dlg-sum');
  function selText(sel) { var o = sel && sel.selectedOptions[0]; return o ? o.textContent.trim() : ''; }
  function refreshSummary() {
    if (!sum || !dlg || !dlg.open) return;
    var dText = selText(dir), docText = doc && doc.value ? selText(doc) : MSG[lang].anyDoc;
    sum.innerHTML = MSG[lang].sum(dText, docText, fmtDate(date && date.value));
  }
  function openDialog() {
    if (!dlg) return;
    $('.dlg__form', dlg).hidden = false; $('.dlg__ok', dlg).hidden = true;
    $('#dlg-err').textContent = '';
    $$('input', dlg).forEach(function (i) { i.removeAttribute('aria-invalid'); });
    closeMenu();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    refreshSummary();
    var n = $('#f-name'); if (n) setTimeout(function () { n.focus({ preventScroll: true }); }, 60);
  }
  var bookForm = $('#book');
  if (bookForm) bookForm.addEventListener('submit', function (e) { e.preventDefault(); openDialog(); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-book]');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.dir && dir) { dir.value = b.dataset.dir; filterDocs(); }
    if (b.dataset.doc && doc) {
      doc.value = b.dataset.doc;
      var o = doc.selectedOptions[0];
      if (o && o.dataset.dirs && dir && o.dataset.dirs.split(' ').indexOf(dir.value) < 0) { dir.value = o.dataset.dirs.split(' ')[0]; filterDocs(); doc.value = b.dataset.doc; }
    }
    openDialog();
  });
  function closeDlg(d) { if (d && d.close) d.close(); else if (d) d.removeAttribute('open'); }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeDlg(e.target.closest('dialog'));
    var back = e.target;
    if (back.tagName === 'DIALOG') closeDlg(back);
  });
  var dform = $('#dlg-form');
  if (dform) dform.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#f-name'), tel = $('#f-tel'), ok = $('#f-ok'), err = $('#dlg-err'), m = MSG[lang];
    [name, tel].forEach(function (i) { i.removeAttribute('aria-invalid'); });
    if (name.value.trim().length < 2) { name.setAttribute('aria-invalid', 'true'); err.textContent = m.name; name.focus(); return; }
    if (tel.value.replace(/\D/g, '').length < 9) { tel.setAttribute('aria-invalid', 'true'); err.textContent = m.tel; tel.focus(); return; }
    if (!ok.checked) { err.textContent = m.ok; ok.focus(); return; }
    err.textContent = '';
    $('.dlg__form', dlg).hidden = true; $('.dlg__ok', dlg).hidden = false;
    $('.dlg__ok .btn', dlg).focus();
  });
  document.addEventListener('click', function (e) {
    var p = e.target.closest('[data-privacy]');
    if (!p || !pol) return;
    e.preventDefault();
    if (pol.showModal) pol.showModal(); else pol.setAttribute('open', '');
  });

  /* ——— до / после ——— */
  $$('.ba').forEach(function (b) {
    var r = $('.ba__range', b);
    var set = function () { b.style.setProperty('--pos', r.value + '%'); r.setAttribute('aria-valuetext', r.value + '%'); };
    r.addEventListener('input', set); set();
  });

  /* ——— ленты врачей и отзывов: если не помещаются, их можно прокручивать с клавиатуры ——— */
  var rows = $$('.row');
  function fixRows() {
    rows.forEach(function (r) { if (r.scrollWidth > r.clientWidth + 1) r.setAttribute('tabindex', '0'); else r.removeAttribute('tabindex'); });
  }
  fixRows(); window.addEventListener('resize', fixRows); window.addEventListener('load', fixRows);

  /* ——— старт ——— */
  var q = new URLSearchParams(location.search).get('lang');
  setLang(q === 'tg' || q === 'ru' ? q : (store.get('clinic-lang') || 'ru'), false);
})();
