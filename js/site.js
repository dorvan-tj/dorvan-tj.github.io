/* Dorvan — сайт студии. Без сборки. Настройки — js/config.js. */
(() => {
  'use strict';
  const SITE = Object.assign({ whatsapp: '992119921803', endpoint: '', clientsLeft: '', review: {} }, window.SITE);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const wa = String(SITE.whatsapp || '992119921803').replace(/\D/g, '');

  /* меню «три полоски» на телефоне */
  const burger = $('.burger'), menu = $('#menu'), hdr = $('.hdr');
  if (burger && menu) {
    const set = (on) => { burger.setAttribute('aria-expanded', String(on)); menu.hidden = !on; };
    burger.addEventListener('click', () => set(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); burger.focus(); } });
    document.addEventListener('click', (e) => { if (!menu.hidden && !hdr.contains(e.target)) set(false); });
    matchMedia('(min-width:760px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  }

  /* переключатели (услуги, примеры): стрелки, Home и End — как у обычных вкладок; выбранная вкладка всегда видна в строке; без перезагрузки */
  const calmMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('[data-tabs]').forEach((list) => {
    const tabs = $$('[role="tab"]', list), panel = document.getElementById(tabs[0].getAttribute('aria-controls')), parts = $$('[data-g]', panel);
    const into = (t) => { // вкладка целиком в видимой части строки (на телефоне строка прокручивается вбок)
      const to = t.offsetLeft - (list.clientWidth - t.offsetWidth) / 2;
      if (list.scrollWidth > list.clientWidth + 1) list.scrollTo({ left: Math.max(0, to), behavior: calmMotion ? 'auto' : 'smooth' });
    };
    const pick = (t, focus, first) => {
      const f = t.dataset.f;
      tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
      panel.setAttribute('aria-labelledby', t.id); panel.dataset.view = f;
      parts.forEach((g) => { g.hidden = !(f === 'all' || g.dataset.g === f); });
      if (!calmMotion && !first) { panel.classList.remove('is-swap'); void panel.offsetWidth; panel.classList.add('is-swap'); } // панель плавно сменяется (CSS html.motion .is-swap)
      into(t); if (focus) t.focus();
    };
    panel.addEventListener('animationend', (e) => { if (e.target === panel) panel.classList.remove('is-swap'); });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(t));
      t.addEventListener('keydown', (e) => {
        const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (to == null) return;
        e.preventDefault(); pick(tabs[(to + tabs.length) % tabs.length], true);
      });
    });
  });

  /* калькулятор: галочки → сумма «от $…»; две услуги и больше — скидка 10%; «срочно» +30%; кнопка отправляет готовый текст в WhatsApp.
     Цены берутся из data-price у вариантов (их пишет gen-services.py из той же таблицы, что и карточки). Проценты применяются по очереди, сумма — в целых долларах */
  const calc = $('#calc');
  if (calc) {
    const form = $('#calc-form'), lines = $('#calc-lines'), empty = $('#calc-empty'), totalRow = $('#calc-total'), sumEl = $('#calc-sum'), live = $('#calc-live'), send = $('#calc-send'), rush = $('#calc-rush');
    const usd = (n) => '$' + n, row = (cls, name, val) => { const li = document.createElement('li'), b = document.createElement('b'); if (cls) li.className = cls; li.append(name, b); b.textContent = val; return li; };
    let shown = 0, raf = 0, tid = 0;
    const count = (to) => { // число в «Итого» плавно догоняет новое значение; запасной таймер ставит точное число, даже если вкладка скрыта и кадры не рисуются
      cancelAnimationFrame(raf); clearTimeout(tid); const from = shown; shown = to;
      if (calmMotion || from === to) { sumEl.textContent = 'от ' + usd(to); return; }
      const t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / 320); sumEl.textContent = 'от ' + usd(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step); tid = setTimeout(() => { cancelAnimationFrame(raf); sumEl.textContent = 'от ' + usd(to); }, 420);
    };
    const update = () => {
      const sel = $$('input[data-price]:checked', form);
      const sum = sel.reduce((n, i) => n + Number(i.dataset.price), 0);
      const disc = sel.length >= 2 ? Math.round(sum * 0.1) : 0, after = sum - disc;
      const extra = rush.checked && sel.length ? Math.round(after * 0.3) : 0, total = after + extra;
      lines.replaceChildren(...sel.map((i) => row('', i.dataset.name, (i.dataset.from ? 'от ' : '') + usd(i.dataset.price))),
        ...(disc ? [row('is-disc', 'Скидка за связку −10%', '−' + usd(disc))] : []), ...(extra ? [row('is-rush', 'Срочно (2–3 дня) +30%', '+' + usd(extra))] : []));
      empty.hidden = sel.length > 0; totalRow.hidden = !sel.length;
      count(total);
      live.textContent = sel.length ? 'Итого от ' + total + ' долларов' + (disc ? ', скидка за связку десять процентов' : '') : 'Ничего не выбрано';
      if (sel.length) {
        const msg = ['Здравствуйте! Хочу заказать:', ...sel.map((i) => '• ' + i.dataset.name + ' — ' + (i.dataset.from ? 'от ' : '') + usd(i.dataset.price)),
          ...(disc ? ['Скидка за связку −10%: −' + usd(disc)] : []), ...(extra ? ['Срочно (2–3 дня) +30%: +' + usd(extra)] : []), 'Итого: от ' + usd(total), 'Цена ориентировочная.'].join('\n');
        send.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg); send.removeAttribute('aria-disabled');
      } else { send.removeAttribute('href'); send.setAttribute('aria-disabled', 'true'); }
    };
    form.addEventListener('change', update); form.addEventListener('submit', (e) => e.preventDefault()); update();
  }

  /* шапка: подсвечиваем раздел, который сейчас на экране («Услуги» — вместе с «Почему без риска», «Как работаем» — до подвала) */
  const links = $$('.nav a[href^="#"]'), zones = links.map((a) => $(a.getAttribute('href'))), foot = $('.ftr');
  if (links.length && zones.every(Boolean)) {
    let raf = 0;
    const spy = () => {
      raf = 0;
      const line = innerHeight * 0.4; // «линия чтения»: раздел считается текущим, когда его верх поднялся выше неё
      let on = -1;
      zones.forEach((z, i) => { if (z.getBoundingClientRect().top <= line) on = i; });
      if (foot && foot.getBoundingClientRect().top <= line) on = -1;
      links.forEach((a, i) => { if (i === on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(spy); };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); spy();
  }

  /* акция «Первые 10»: число — только в config.js; 0 и меньше — плашка скрывается; числа нет — плашка без счётчика */
  const left = SITE.clientsLeft === '' || SITE.clientsLeft == null ? NaN : Number(SITE.clientsLeft);
  $$('[data-promo]').forEach((p) => {
    if (Number.isFinite(left)) { if (left <= 0) p.hidden = true; else $$('[data-left]', p).forEach((b) => { b.textContent = String(left); }); }
    else $$('[data-count]', p).forEach((c) => { c.hidden = true; });
  });

  /* отзыв Melty: показывается, только когда его вписали в config.js */
  const rv = SITE.review || {}, quote = $('[data-review]');
  if (quote && String(rv.text || '').trim()) {
    $('p', quote).textContent = String(rv.text).trim();
    $('footer', quote).textContent = rv.by ? '— ' + rv.by : '';
    quote.hidden = false;
  }

  /* заявка: проверка полей → бот студии (Worker) → карточка владельцу в Telegram; не вышло — ссылка на чат WhatsApp с готовым текстом */
  const form = $('#lead');
  if (!form) return;
  const status = $('#lead-status'), btn = $('[type="submit"]', form), label = $('span', btn);
  const MSG = { name: 'Напишите, как к вам обращаться', what: 'Напишите, что нужно, хотя бы пару слов', contact: 'Укажите номер телефона, например +992 90 000 00 00' };
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const phoneOK = (s) => /^[+\d][\d\s()\-.]*$/.test(s) && (s.match(/\d/g) || []).length >= 7;
  const nick = (s) => { const m = /^(?:https?:\/\/)?(?:t\.me\/|@)?([A-Za-z][A-Za-z0-9_]{4,31})$/.exec(s); return m ? '@' + m[1] : ''; };
  const kind = (s) => {
    s = s.toLowerCase();
    if (/сайт|лендинг|визитк|страниц/.test(s)) return ['site', 'Сайт / лендинг'];
    if (/(^|[^а-яё])бот|bot/.test(s)) return ['bot', 'Telegram-бот'];
    if (/приложени/.test(s)) return ['app', 'Приложение / кабинет'];
    if (/дизайн|логотип|баннер|карусел|оформлен/.test(s)) return ['design', 'Дизайн / соцсети'];
    return ['other', 'Другое'];
  };
  const flag = (name, msg) => {
    const el = form.elements[name], e = $('#e-' + name);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    e.textContent = msg || ''; e.hidden = !msg;
    return !msg;
  };
  const say = (cls, text, href, linkText) => {
    status.className = 'status ' + cls; status.textContent = text; status.hidden = false;
    if (href) { const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = linkText; status.append(' ', a); }
  };
  ['name', 'what', 'contact'].forEach((n) => form.elements[n].addEventListener('input', () => flag(n, '')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = { name: norm(form.elements.name.value), what: norm(form.elements.what.value), contact: norm(form.elements.contact.value) };
    const contact = phoneOK(v.contact) ? v.contact : nick(v.contact);
    const ok = [flag('name', v.name.length >= 2 ? '' : MSG.name), flag('what', v.what.length >= 3 ? '' : MSG.what), flag('contact', contact ? '' : MSG.contact)];
    if (!ok.every(Boolean)) { form.elements[['name', 'what', 'contact'][ok.indexOf(false)]].focus(); return; }

    const k = kind(v.what);
    const chat = 'https://wa.me/' + wa + '?text=' + encodeURIComponent('Здравствуйте! Меня зовут ' + v.name + '. Мне нужно: ' + v.what + '. Связь: ' + contact);
    btn.disabled = true; label.textContent = 'Отправляю…'; status.hidden = true;
    try {
      if (!SITE.endpoint) throw new Error('нет адреса бота');
      // text/plain — «простой» запрос без предварительной проверки (CORS); бот сам разбирает JSON
      const r = await fetch(SITE.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ lang: 'ru', type: k[1], typeCode: k[0], message: 'Имя: ' + v.name + '\nЧто нужно: ' + v.what, contact, hp: form.elements.hp.value, t: Math.round(performance.now()) })
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      form.classList.add('is-done');
      say('is-ok', 'Спасибо, ' + v.name + '! Заявка отправлена — ответим в WhatsApp или по телефону.');
    } catch (err) {
      btn.disabled = false; label.textContent = 'Отправить заявку';
      say('is-err', 'Не получилось отправить заявку.', chat, 'Написать в WhatsApp с готовым текстом');
    }
  });
})();
