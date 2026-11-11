/* Dorvan — анкета (#order). Без библиотек и сборки.
   1) Кнопки с data-order (первый экран, тарифы, «Хочу похожее решение» в листе работ, меню, нижняя полоска) подставляют в анкету
      пример, тариф и «что нужно», прокручивают к анкете, подсвечивают её и ставят курсор в первое пустое обязательное поле.
   2) Адрес /?concept=…&pack=…&need=…#order делает то же при открытии страницы.
   3) Проверка полей → POST на SITE.endpoint (бот dorvan-orders присылает владельцу карточку в Telegram). Не вышло — ссылка в WhatsApp с готовым текстом.
   4) Черновик анкеты живёт в sessionStorage до успешной отправки. */
(() => {
  'use strict';
  const form = document.getElementById('order-form');
  if (!form) return;
  const SITE = Object.assign({ whatsapp: '992119921803', endpoint: '' }, window.SITE);
  const WA = 'https://wa.me/' + String(SITE.whatsapp || '992119921803').replace(/\D/g, '');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const byId = (id) => document.getElementById(id);
  const f = (n) => form.elements.namedItem(n);
  const sec = byId('order'), card = form.closest('.ord__card') || form, done = byId('order-done');
  const btn = $('[type="submit"]', form), btnText = $('span', btn), status = byId('order-status');
  const picked = byId('order-picked'), pickEx = byId('order-pick-ex'), pickPack = byId('order-pick-pack'), example = f('example');
  const KEY = 'dorvan-order';
  const FIELDS = ['name', 'via', 'contact', 'biz', 'need', 'task', 'example', 'link', 'has', 'time', 'budget'];
  const NEEDS = ['site', 'catalog', 'booking', 'bot', 'app', 'other'], CODES = ['site', 'bot', 'app', 'other']; // CODES — что бот знает как typeCode
  const HAS = ['логотип', 'тексты', 'фото'];
  // в номере-образце неразрывные пробелы: он не рвётся между строками
  const MSG = { name: 'Напишите, как к вам обращаться', contact: 'Укажите номер, например +992 90 000 00 00, или ник в Telegram', biz: 'Напишите название и сферу бизнеса', need: 'Выберите, что нужно' };
  const st = { pack: '', source: '' }; // тариф и «откуда пришли»: полей для них нет, видно фишкой «Тариф: …»
  let busy = false, sent = false;

  const motion = () => document.documentElement.classList.contains('motion');
  const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const lines = (s) => String(s || '').replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  const abs = (u) => { try { return new URL(u, 'https://dorvan.pro/').href; } catch (_) { return ''; } };
  const glide = (node, block) => { try { node.scrollIntoView({ behavior: motion() ? 'smooth' : 'instant', block }); } catch (_) { node.scrollIntoView(block !== 'end'); } };

  // значение поля: строка; у группы флажков — массив отмеченных
  const get = (n) => {
    const x = f(n);
    if (!(x instanceof RadioNodeList)) return x ? x.value : '';
    const on = Array.from(x).filter((i) => i.checked).map((i) => i.value);
    return x[0].type === 'checkbox' ? on : on[0] || '';
  };
  const set = (n, v) => {
    const x = f(n);
    if (!(x instanceof RadioNodeList)) { x.value = v; return; }
    Array.from(x).forEach((i) => { i.checked = Array.isArray(v) ? v.includes(i.value) : i.value === v; });
  };

  /* работы для списка «Пример, который нравится» — из реестра works (контракт 1); нет реестра — только «Не выбран» */
  const works = Object.create(null); // без прототипа: ?concept=__proto__ и подобное не находит «работу»
  try { JSON.parse(byId('works-data').textContent).forEach((w) => { if (w && w.id && w.name) works[w.id] = w; }); } catch (_) { /* реестра нет */ }
  [['real', 'Реальный проект'], ['concept', 'Концепты']].forEach(([kind, label]) => {
    const list = Object.values(works).filter((w) => (w.kind === 'real' ? 'real' : 'concept') === kind);
    if (!list.length) return;
    const g = document.createElement('optgroup');
    g.label = label;
    list.forEach((w) => g.append(new Option(w.name + (w.niche ? ' — ' + w.niche : ''), w.id)));
    example.append(g);
  });

  /* черновик: случайная перезагрузка не стирает введённое */
  const save = () => {
    if (sent) return;
    try {
      const d = { pack: st.pack, source: st.source };
      FIELDS.forEach((n) => { d[n] = get(n); });
      sessionStorage.setItem(KEY, JSON.stringify(d));
    } catch (_) { /* хранилище недоступно — без черновика */ }
  };
  const restore = () => {
    let d = null;
    try { d = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (_) { /* битый черновик */ }
    if (!d || typeof d !== 'object') return;
    FIELDS.forEach((n) => {
      const v = d[n];
      if (typeof v !== 'string' && !Array.isArray(v)) return;
      if (n === 'example' && v && !works[v]) return;
      set(n, v);
    });
    if (typeof d.pack === 'string') st.pack = d.pack.slice(0, 80);
    if (typeof d.source === 'string') st.source = d.source.slice(0, 80);
  };

  /* фишки «Похоже на: …» и «Тариф: …» над анкетой */
  const paint = () => {
    const w = works[example.value];
    pickEx.hidden = !w;
    pickPack.hidden = !st.pack;
    if (w) { $('b', pickEx).textContent = w.name; $('button', pickEx).setAttribute('aria-label', 'Убрать пример: ' + w.name); }
    if (st.pack) { $('b', pickPack).textContent = st.pack; $('button', pickPack).setAttribute('aria-label', 'Убрать тариф: ' + st.pack); }
    picked.classList.toggle('is-on', !!w || !!st.pack);
  };
  /* подсказка в поле связи меняется вместе с переключателем WhatsApp / Telegram */
  const hint = () => {
    const tg = get('via') === 'Telegram', c = f('contact');
    c.placeholder = tg ? '@ник' : '+992 …';
    c.setAttribute('inputmode', tg ? 'text' : 'tel');
    c.setAttribute('autocomplete', tg ? 'off' : 'tel');
  };

  /* проверка: имя ≥ 2, контакт — телефон (7–15 цифр) или ник Telegram (@ник, t.me/ник, 5–32 знака), бизнес ≥ 3, хотя бы одна фишка «Что нужно» */
  const digits = (s) => (s.match(/\d/g) || []).length;
  const phone = (s) => (/^\+?[\d\s().-]+$/.test(s) && digits(s) >= 7 && digits(s) <= 15 ? s : '');
  const nick = (s, tg) => {
    const m = /^(?:https?:\/\/)?(?:www\.)?(?:t\.me\/|telegram\.me\/|@)([A-Za-z][A-Za-z0-9_]{4,31})\/?$/i.exec(s) || (tg ? /^([A-Za-z][A-Za-z0-9_]{4,31})$/.exec(s) : null);
    return m ? '@' + m[1] : '';
  };
  const contactOf = () => { const s = norm(get('contact')); return phone(s) || nick(s, get('via') === 'Telegram'); };
  const wrong = { name: () => norm(get('name')).length < 2, contact: () => !contactOf(), biz: () => norm(get('biz')).length < 3, need: () => !get('need').length };
  const input = (n) => (n === 'need' ? $('input[name="need"]', form) : f(n));
  const flag = (n, bad) => {
    const box = byId('o-' + n + '-e');
    (n === 'need' ? $$('input[name="need"]', form) : [f(n)]).forEach((i) => { if (bad) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); });
    box.textContent = bad ? MSG[n] : '';
    box.hidden = !bad;
    return !bad;
  };
  const firstBad = () => { const n = ['name', 'contact', 'biz', 'need'].find((k) => wrong[k]()); return n ? input(n) : null; };

  /* переход к анкете: прокрутка, короткая подсветка, курсор в первое пустое обязательное поле */
  let litT = 0;
  const light = () => {
    card.classList.remove('is-lit'); void card.offsetWidth; card.classList.add('is-lit');
    clearTimeout(litT); litT = setTimeout(() => card.classList.remove('is-lit'), 1900);
  };
  const go = () => {
    glide(sec, 'start');
    if (sent) { byId('order-done-h').focus({ preventScroll: true }); return; }
    (firstBad() || f('name')).focus({ preventScroll: true });
    light();
  };
  const apply = (o) => {
    if (o.concept && works[o.concept]) example.value = o.concept;
    if (o.pack) st.pack = clip(norm(o.pack), 80);
    if (o.need && NEEDS.includes(o.need)) { $('input[name="need"][value="' + o.need + '"]', form).checked = true; flag('need', false); }
    if (o.source) st.source = clip(norm(o.source), 80);
    paint(); save();
  };

  // контракт 2: любая кнопка <a href="#order" data-order …> на странице, в том числе добавленная позже (ловим на document)
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-order]');
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (!sent) {
      const d = a.dataset, w = works[d.orderConcept];
      apply({ concept: d.orderConcept, pack: d.orderPack, need: d.orderNeed,
        source: d.orderSource || (w ? 'карточка «' + w.name + '»' : d.orderPack ? 'кнопка «Заказать» у тарифа «' + d.orderPack + '»' : '') });
    }
    setTimeout(go, 0); // после того как works.js закроет лист работ и вернёт прокрутку странице
  });

  picked.addEventListener('click', (e) => {
    const b = e.target.closest('[data-unpick]');
    if (!b) return;
    if (b.dataset.unpick === 'pack') st.pack = ''; else example.value = '';
    paint(); save();
    const next = $('.ord__pick:not([hidden]) button', picked);
    (next || f('name')).focus({ preventScroll: true });
  });

  const edit = (e) => {
    const n = e.target.name;
    if (n === 'via') hint();
    if (n === 'example') paint();
    // ввели @ник или t.me/… — значит, писать в Telegram
    if (n === 'contact' && get('via') !== 'Telegram' && /^@|t\.me\//i.test(e.target.value.trim())) { set('via', 'Telegram'); hint(); }
    if (MSG[n]) flag(n, false); // ошибка уходит, как только поле начали исправлять
    save();
  };
  form.addEventListener('input', edit);
  form.addEventListener('change', edit);
  // вышли из заполненного поля с ошибкой — подсказываем сразу, не дожидаясь отправки
  form.addEventListener('focusout', (e) => { const n = e.target.name; if ((n === 'name' || n === 'contact' || n === 'biz') && norm(e.target.value) && wrong[n]()) flag(n, true); });

  /* отправка */
  const finish = (name, via) => {
    sent = true;
    try { sessionStorage.removeItem(KEY); } catch (_) { /* нет хранилища */ }
    byId('order-done-p').textContent = 'Спасибо, ' + name + '! Мы напишем вам в ' + via + ', чтобы уточнить детали.';
    form.hidden = true;
    done.hidden = false;
    glide(done, 'center');
    byId('order-done-h').focus({ preventScroll: true });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy || sent) return;
    const bad = ['name', 'contact', 'biz', 'need'].filter((n) => !flag(n, wrong[n]()));
    if (bad.length) {
      const i = input(bad[0]);
      glide(i.closest('.field, .ord__set') || i, 'center');
      i.focus({ preventScroll: true });
      return;
    }
    const contact = contactOf();
    if (contact[0] === '@') { set('via', 'Telegram'); hint(); } // ник есть только в Telegram
    const via = get('via') || 'WhatsApp';
    const needs = $$('input[name="need"]:checked', form);
    const type = needs.map((i) => i.parentNode.textContent.trim()).join(' + ').slice(0, 80);
    const codes = needs.map((i) => i.value).filter((v) => CODES.includes(v));
    const w = works[get('example')], has = get('has');
    const v = { name: norm(get('name')).slice(0, 60), biz: norm(get('biz')).slice(0, 100), task: lines(get('task')).slice(0, 500), link: norm(get('link')).slice(0, 200) };
    const build = () => [
      'Имя: ' + v.name,
      'Связь: ' + via,
      'Бизнес: ' + v.biz,
      'Что нужно: ' + type,
      v.task && 'Задача: ' + v.task,
      w && 'Похоже на: ' + w.name + (w.niche ? ' (' + w.niche + ')' : '') + (w.url ? ' — ' + abs(w.url) : ''),
      v.link && 'Свой пример: ' + v.link,
      has.length && 'Есть: ' + HAS.map((k) => k + ' — ' + (has.includes(k) ? 'да' : 'нет')).join('; '),
      st.source && 'Откуда: ' + st.source,
    ].filter(Boolean).join('\n');
    let message = build();
    // свободные поля укорачиваем, пока текст не уложится в 1100 знаков (бот принимает до 1200)
    for (const k of ['task', 'link', 'biz', 'name']) {
      const over = message.length - 1100;
      if (over <= 0) break;
      const keep = v[k].length - over - 1;
      v[k] = keep > 0 ? v[k].slice(0, keep).trimEnd() + '…' : '';
      message = build();
    }
    const body = { lang: 'ru', type, typeCode: codes.length === 1 ? codes[0] : '', pack: st.pack, budget: get('budget'), time: get('time'), contact, message, hp: f('hp').value, t: Math.round(performance.now()) };
    const chat = WA + '?text=' + encodeURIComponent(['Здравствуйте! Хочу обсудить проект.', message, 'Контакт: ' + contact,
      st.pack && 'Тариф: ' + st.pack, body.time && 'Когда: ' + body.time, body.budget && 'Бюджет: ' + body.budget].filter(Boolean).join('\n'));

    busy = true; btn.disabled = true; btnText.textContent = 'Отправляю…'; status.hidden = true;
    let ok = false;
    try {
      if (!SITE.endpoint) throw new Error('нет адреса бота');
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = setTimeout(() => ctl && ctl.abort(), 15000); // бот молчит 15 с — считаем, что не вышло
      // text/plain — «простой» запрос без предварительной проверки (CORS); бот сам разбирает JSON
      const r = await fetch(SITE.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined });
      clearTimeout(timer);
      ok = r.ok;
    } catch (_) { ok = false; }
    busy = false;
    if (ok) { finish(v.name, via); return; }
    btn.disabled = false; btnText.textContent = 'Отправить заявку';
    const a = document.createElement('a');
    a.href = chat; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Написать в WhatsApp с готовым текстом';
    status.replaceChildren('Не получилось отправить заявку. ', a);
    status.hidden = false;
    if (!form.contains(document.activeElement)) btn.focus({ preventScroll: true });
  });

  /* запуск: черновик → параметры адреса (?concept= ?pack= ?need=) → кнопка «Отправить» включается */
  restore();
  const q = new URLSearchParams(location.search);
  if (['concept', 'pack', 'need'].some((k) => q.get(k))) {
    apply({ concept: q.get('concept'), pack: q.get('pack'), need: q.get('need'), source: 'ссылка (' + Array.from(q, ([k, val]) => k + '=' + val).join(', ') + ')' });
    if (location.hash === '#order') light();
  }
  hint(); paint();
  btn.disabled = false;
})();
