/* ОТАШ · демо-админка: чат с ботом, который меняет меню сайта.
   Всё хранится только в браузере посетителя (localStorage, ключ dorvan-demo-otash-v1) и никуда не отправляется.
   Главная страница (../app.js) читает тот же ключ и показывает новые цены, стоп-лист и плашку «Сегодня закрыто». */
(() => {
  'use strict';
  const d = document, $ = (s, c = d) => c.querySelector(s);
  const KEY = 'dorvan-demo-otash-v1';
  const MENU = JSON.parse($('#menu-data').textContent);
  const byId = Object.fromEntries(MENU.map((m) => [m.id, m]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const log = $('#log'), input = $('#chat-input'), quickBox = $('#quick');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const hhmm = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const money = (n) => n + ' сом.'; // неразрывный пробел, как на сайте

  /* ---------- состояние: храним только изменения ---------- */
  let mem = null; // если браузер не даёт сохранять, живём в памяти страницы
  // берём из памяти только то, что похоже на правду: после старой версии демо там может лежать что угодно; «закрыто» хранится датой дня
  const clean = (v) => {
    v = v && typeof v === 'object' ? v : {};
    const prices = {};
    if (v.prices && typeof v.prices === 'object') Object.keys(v.prices).forEach((id) => { const n = v.prices[id]; if (byId[id] && Number.isInteger(n) && n > 0 && n < 100000) prices[id] = n; });
    const stop = Array.isArray(v.stop) ? [...new Set(v.stop.filter((id) => typeof id === 'string' && byId[id]))] : [];
    return { prices, stop, closed: v.closed === today() };
  };
  const read = () => {
    if (mem) return clean(mem);
    try { return clean(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return clean(null); }
  };
  const write = (s) => {
    const out = { ...s, closed: s.closed ? today() : false };
    mem = null;
    try { if (Object.keys(s.prices).length || s.stop.length || s.closed) localStorage.setItem(KEY, JSON.stringify(out)); else localStorage.removeItem(KEY); }
    catch (e) { mem = out; /* хранилище недоступно или переполнено — работаем в памяти страницы */ }
  };
  const change = (fn) => { const s = read(); fn(s); write(s); render(); };
  const priceOf = (s, id) => (s.prices[id] != null ? s.prices[id] : byId[id].price);

  /* ---------- поиск блюда по началу слов (с простыми окончаниями) ---------- */
  const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[«»"'`]/g, '').replace(/[:;]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = (s) => norm(s).split(/[^a-zа-я0-9]+/).filter(Boolean);
  const wordHit = (q, w) => w.startsWith(q) || (w.length > 3 && q.startsWith(w.slice(0, Math.max(4, w.length - 2))));
  const noPrep = (s) => s.replace(/^(?:на|в|для)\s+/, '').replace(/\s+на$/, ''); // «цена на шашлык 45», «стоп на плов»
  const PREP = new Set(['с', 'со', 'из', 'на', 'по', 'без', 'в', 'для', 'и']); // предлоги сами по себе блюдо не называют
  const findDishes = (q) => {
    const qw = words(q).filter((w) => !PREP.has(w));
    if (!qw.length) return [];
    const exact = MENU.filter((m) => norm(m.name) === norm(q));
    if (exact.length) return exact;
    return MENU.filter((m) => { const nw = words(m.name); return qw.every((x) => nw.some((w) => wordHit(x, w))); });
  };

  /* ---------- разбор сообщения ---------- */
  const PRICE = /^(?:цена|цену|цены|ц|price)\s+(.+?)\s+(?:на\s+|=\s*)?(\d+(?:\s\d{3})*(?:[.,]\d+)?)\s*(?:сом(?:\.|ов|они)?|сомони|смн|somoni|с\.?|tjs)?\s*\.?$/;
  const PRICE_NO_NUM = /^(?:цена|цену|цены|ц|price)\s+(.+)$/;
  const STOP_OFF = /^(?:вернуть в меню|вернуть|верни|снять стоп|убрать стоп|старт|снова есть|есть)\s+(.+)$/;
  const STOP_ON = /^(?:стоп-лист|стоп|нет в наличии|нет|убрать|закончилось|закончился|закончилась|закончились)\s+(.+)$/;
  const HELP = /^(?:\/start|\/help|start|help|помощь|помоги|команды|что умеешь|привет|здравствуй[а-я]*|добрый (?:день|вечер))$/;
  const LIST = /^(?:список|статус|что сейчас|что изменено|состояние|стоп-?лист|стоп лист|стоп)$/;
  const RESET = /^(?:сброс|сбросить|сбросить демо|reset|вернуть все|все как было)$/;
  const CLOSE = /^(?:закрыто|закрыть|закрыты|закрываемся|не работаем|выходной)(?:\s+сегодня)?$|^сегодня (?:закрыто|закрыты|выходной)$/;
  const OPEN = /^(?:открыто|открыть|открыты|открылись|работаем)(?:\s+сегодня)?$|^сегодня (?:открыто|открыты)$/;

  /* ---------- сообщения бота ---------- */
  const HELP_TEXT = 'Вот что я умею:\n• **цена Шашлык 45** — поменять цену\n• **стоп Плов** — убрать блюдо на сегодня (стоп-лист)\n• **вернуть Плов** — снова в меню\n• **закрыто сегодня** — на сайте плашка «Сегодня закрыто»\n• **открыто** — убрать плашку\n• **список** — что сейчас изменено\nБлюдо можно писать как удобно: достаточно начала названия.';
  const listText = (s) => {
    const rows = [];
    if (s.closed) rows.push('• Сегодня **закрыто** — на сайте плашка, бронь на сегодня выключена');
    if (s.stop.length) rows.push('• Стоп-лист (' + s.stop.length + '): ' + s.stop.map((id) => '**' + byId[id].name + '**').join(', '));
    Object.keys(s.prices).forEach((id) => rows.push('• ' + byId[id].name + ': ' + byId[id].price + ' → **' + money(s.prices[id]) + '**'));
    return rows.length ? 'Сейчас на сайте изменено:\n' + rows.join('\n') : 'Пока всё как в меню: ничего не менялось. Попробуйте, например, **цена Шашлык 45**.';
  };
  const SITE_LINK = '<a class="opt-link" href="../index.html#menu">Открыть меню на сайте →</a>';
  const optsFor = (verb, list, tail) => '<div class="opts">' + list.map((m) => { const cmd = verb + ' ' + m.name + (tail ? ' ' + tail : ''); return '<button type="button" data-cmd="' + esc(cmd) + '">' + esc(m.name) + '</button>'; }).join('') + '</div>';

  /* ---------- чат ---------- */
  const add = (who, html, extra = '', hidden) => {
    const row = d.createElement('div');
    row.className = 'msg ' + who;
    if (hidden) row.setAttribute('aria-hidden', 'true');
    row.innerHTML = '<div class="bubble">' + html + extra + '</div>' + (who === 'bot typing' ? '' : '<time>' + hhmm() + '</time>');
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  };
  // say: текст бота с разметкой **жирный**; всё, что пришло от посетителя, экранируется (extra — готовые кнопки и ссылки)
  const say = (text, extra) => new Promise((done) => {
    if (reduce) { add('bot', fmt(text), extra); return done(); }
    const t = add('bot typing', '<span class="dots"><i></i><i></i><i></i></span>', '', true);
    setTimeout(() => { t.remove(); add('bot', fmt(text), extra); done(); }, 380);
  });

  const answer = async (text) => {
    const t = norm(text).replace(/\s*[!?]+$/, '');
    let m;
    if (!t && /^[!?\s]+$/.test(text)) return say(HELP_TEXT);
    if (HELP.test(t)) return say(t.startsWith('при') || t.startsWith('здрав') || t.startsWith('добр') ? 'Здравствуйте! Пишите, что поменять в меню, — например, **цена Шашлык 45**.\n\n' + HELP_TEXT : HELP_TEXT);
    if (LIST.test(t)) return say(listText(read()));
    if (RESET.test(t)) { change((s) => { s.prices = {}; s.stop = []; s.closed = false; }); return say('✅ Всё как в обычном меню: цены, стоп-лист и «закрыто» сброшены.', SITE_LINK); }
    if (CLOSE.test(t)) { const was = read().closed; change((s) => { s.closed = true; }); return say(was ? 'Сегодня уже отмечено как **закрыто**. Чтобы убрать плашку, напишите «открыто».' : '✅ На сайте плашка **«Сегодня закрыто»**, бронь на сегодня выключена. Чтобы убрать, напишите «открыто».', SITE_LINK); }
    if (OPEN.test(t)) { const was = read().closed; change((s) => { s.closed = false; }); return say(was ? '✅ Плашка убрана, сайт снова принимает брони на сегодня.' : 'Сегодня и так открыто — плашки на сайте нет.'); }

    if ((m = t.match(PRICE))) {
      const found = findDishes(noPrep(m[1])), num = parseFloat(m[2].replace(/\s/g, '').replace(',', '.')), val = Math.round(num);
      if (!(num > 0 && num < 100000)) return say('Цена должна быть числом больше нуля, например **цена Шашлык 45**.');
      if (num !== val) return say('Цена — целое число сомони, например **цена Шашлык 45**.');
      if (!found.length) return say('Не нашёл блюдо «' + m[1] + '» в меню. Напишите начало названия, например «шашлык», «лосось» или «плов».');
      if (found.length > 1) return say('Нашёл несколько блюд. Какое именно?', optsFor('цена', found, String(val)));
      const dish = found[0], was = priceOf(read(), dish.id);
      if (was === val) return say('**' + dish.name + '** уже стоит **' + money(val) + '**.');
      change((s) => { if (val === dish.price) delete s.prices[dish.id]; else s.prices[dish.id] = val; });
      return say('✅ Готово. **' + dish.name + '**: ' + was + ' → **' + money(val) + '** На сайте цена уже обновлена.', SITE_LINK);
    }
    if (PRICE_NO_NUM.test(t)) return say('Какая цена? Напишите так: **цена Шашлык 45**.');

    if ((m = t.match(STOP_OFF))) {
      const found = findDishes(noPrep(m[1]));
      if (!found.length) return say('Не нашёл блюдо «' + m[1] + '» в меню. Посмотрите «список» — там то, что сейчас в стоп-листе.');
      if (found.length > 1) return say('Нашёл несколько блюд. Какое именно?', optsFor('вернуть', found));
      const dish = found[0];
      if (!read().stop.includes(dish.id)) return say('**' + dish.name + '** и так в меню — в стоп-листе его нет.');
      change((s) => { s.stop = s.stop.filter((x) => x !== dish.id); });
      return say('✅ **' + dish.name + '** снова в меню.', SITE_LINK);
    }
    if ((m = t.match(STOP_ON))) {
      const found = findDishes(noPrep(m[1]));
      if (!found.length) return say('Не нашёл блюдо «' + m[1] + '» в меню. Напишите начало названия, например «плов» или «лосось».');
      if (found.length > 1) return say('Нашёл несколько блюд. Какое именно?', optsFor('стоп', found));
      const dish = found[0];
      if (read().stop.includes(dish.id)) return say('**' + dish.name + '** уже в стоп-листе.');
      change((s) => { s.stop.push(dish.id); });
      return say('✅ **' + dish.name + '** в стоп-листе. На сайте блюдо помечено «нет сегодня». Вернуть: **вернуть ' + dish.name.split(' ')[0] + '**.', SITE_LINK);
    }
    return say('Не понял «' + text.trim() + '». Напишите, например: **цена Шашлык 45**, **стоп Плов** или **закрыто сегодня**. Все команды — «помощь».');
  };

  const send = async (text, fromTyping) => {
    text = text.trim();
    if (!text) return;
    add('me', esc(text));
    input.value = '';
    await answer(text);
    if (fromTyping) input.focus({ preventScroll: true });
  };

  /* ---------- правая панель: что видят гости ---------- */
  const render = () => {
    const s = read();
    const stopNames = s.stop.map((id) => ({ id, name: byId[id].name }));
    const rows = [];
    rows.push('<div class="st-row"><span class="st-l">Сайт сегодня</span><div class="st-v">' + (s.closed
      ? '<span class="pill warn">Закрыто сегодня <button type="button" class="x" data-undo="closed" aria-label="Открыть сайт сегодня">×</button></span>'
      : '<span class="pill ok">Открыт</span>') + '</div></div>');
    rows.push('<div class="st-row"><span class="st-l">Стоп-лист</span><div class="st-v">' + (stopNames.length
      ? stopNames.map((x) => '<span class="pill">' + esc(x.name) + ' <button type="button" class="x" data-undo="stop" data-id="' + x.id + '" aria-label="Вернуть в меню: ' + esc(x.name) + '">×</button></span>').join('')
      : '<span class="muted">пусто</span>') + '</div></div>');
    const ids = Object.keys(s.prices);
    rows.push('<div class="st-row"><span class="st-l">Новые цены</span><div class="st-v">' + (ids.length
      ? ids.map((id) => '<span class="pill">' + esc(byId[id].name) + ': <s>' + byId[id].price + '</s> → <b>' + money(s.prices[id]) + '</b> <button type="button" class="x" data-undo="price" data-id="' + id + '" aria-label="Вернуть прежнюю цену: ' + esc(byId[id].name) + '">×</button></span>').join('')
      : '<span class="muted">как в меню</span>') + '</div></div>');
    $('#status').innerHTML = rows.join('');
    $('#mini-closed').hidden = !s.closed;
    $('#mini').innerHTML = MENU.map((m) => {
      const stop = s.stop.includes(m.id), ch = s.prices[m.id] != null;
      return '<li class="' + (stop ? 'is-stop' : '') + '"><span class="n">' + esc(m.name) + (stop ? ' <em>нет сегодня</em>' : '') + '</span><span class="p' + (ch ? ' new' : '') + '">' + money(ch ? s.prices[m.id] : m.price) + '</span></li>';
    }).join('');
  };
  $('#status').addEventListener('click', (e) => {
    const b = e.target.closest('button.x');
    if (!b) return;
    const id = b.dataset.id;
    change((s) => { if (b.dataset.undo === 'closed') s.closed = false; else if (b.dataset.undo === 'stop') s.stop = s.stop.filter((x) => x !== id); else delete s.prices[id]; });
    $('#status').focus({ preventScroll: true }); // кнопка × исчезла — фокус остаётся рядом, а не пропадает
  });
  addEventListener('storage', (e) => { if (e.key === KEY || e.key === null) render(); }); // изменили в другой вкладке

  /* ---------- быстрые команды, ввод, сброс ---------- */
  ['цена Шашлык 45', 'стоп Плов', 'закрыто сегодня', 'открыто', 'список', 'помощь'].forEach((c) => {
    const b = d.createElement('button'); b.type = 'button'; b.textContent = c; b.dataset.cmd = c; quickBox.appendChild(b);
  });
  d.addEventListener('click', (e) => { const b = e.target.closest('button[data-cmd]'); if (b) send(b.dataset.cmd, false); });
  $('#composer').addEventListener('submit', (e) => { e.preventDefault(); send(input.value, true); });

  const greet = () => {
    add('bot', fmt('Здравствуйте! Я помощник ОТАШ: через меня вы меняете меню на сайте. Пишите, как в обычном чате:\n• **цена Шашлык 45**\n• **стоп Плов**\n• **закрыто сегодня**\n\nЭто демо: сообщения никуда не уходят, всё хранится только в вашем браузере.'));
    const s = read();
    if (s.closed || s.stop.length || Object.keys(s.prices).length) add('bot', fmt(listText(s) + '\n\nЧтобы вернуть всё как было, нажмите «Сбросить демо».'));
  };
  $('#reset').addEventListener('click', () => {
    write({ prices: {}, stop: [], closed: false });
    log.innerHTML = '';
    greet(); render();
    input.focus({ preventScroll: true });
  });

  // «Сбросить демо» из плашки на сайте и правки в другой вкладке тоже должны оставаться понятными: панель всегда перерисовывается из хранилища
  greet(); render();
})();
