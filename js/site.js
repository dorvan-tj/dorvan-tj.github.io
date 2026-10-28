/* Dorvan — сайт студии. Без сборки. Настройки — js/config.js. */
(() => {
  'use strict';
  const SITE = Object.assign({ telegram: 'dorvan_tj', endpoint: '', clientsLeft: '', review: {} }, window.SITE);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const tg = String(SITE.telegram || 'dorvan_tj').replace(/^@/, '');

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

  /* заявка: проверка полей → бот студии (Worker) → карточка в Telegram; не вышло — ссылка на чат с готовым текстом */
  const form = $('#lead');
  if (!form) return;
  const status = $('#lead-status'), btn = $('[type="submit"]', form), label = $('span', btn);
  const MSG = { name: 'Напишите, как к вам обращаться', what: 'Напишите, что нужно, хотя бы пару слов', contact: 'Укажите телефон или ник в Telegram, например @name' };
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
    const chat = 'https://t.me/' + tg + '?text=' + encodeURIComponent('Здравствуйте! Меня зовут ' + v.name + '. Мне нужно: ' + v.what + '. Связь: ' + contact);
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
      say('is-ok', 'Спасибо, ' + v.name + '! Заявка отправлена — ответим в Telegram или по телефону.');
    } catch (err) {
      btn.disabled = false; label.textContent = 'Отправить заявку';
      say('is-err', 'Не получилось отправить заявку.', chat, 'Написать в Telegram с готовым текстом');
    }
  });
})();
