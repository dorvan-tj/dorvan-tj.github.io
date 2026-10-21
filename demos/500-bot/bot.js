/* Iris · «Бот для клиентов» — схема-показ (концепт студии Dorvan).
   Всё живёт в памяти страницы: ничего не отправляется, ничего не сохраняется. Данные вымышлены.
   Устройство: две «переписки» (клиент и владелец) рисуются одним кодом. Кнопка под сообщением — это функция,
   которая вызывается при нажатии и отвечает новыми сообщениями. */
(function () {
  'use strict';

  /* ---------- Мелочи ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var mq = matchMedia('(prefers-reduced-motion: reduce)');
  var calm = function () { return mq.matches; }; // «уменьшить анимацию»: без «печатает…» и плавной прокрутки
  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function lc1(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function hhmm(m) { return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60); }
  function mins(t) { return +t.slice(0, 2) * 60 + +t.slice(3); }

  /* ---------- Вымышленные данные салона ---------- */
  var SERVICES = [ // услуги и мастера — как на сайте салона (../350-salon): у маникюра, бровей и чистки лица один мастер, у стрижки два
    { name: 'Маникюр с гель-лаком', price: 170, masters: ['Мадина'] },
    { name: 'Женская стрижка', price: 180, masters: ['Дилноза', 'Саида'] },
    { name: 'Коррекция бровей', price: 110, masters: ['Нигина'] },
    { name: 'Чистка лица', price: 320, masters: ['Зарина'] }
  ];
  var OFF = { 'Мадина': [1], 'Дилноза': [0], 'Саида': [1], 'Нигина': [2], 'Зарина': [0] }; // выходные по графику салона (0 — воскресенье)
  var POOL = [ // свободные окна по дням (показываем первые четыре); «завтра» — вторая строка, там есть 14:00
    ['10:00', '12:30', '14:00', '17:00', '18:30'],
    ['10:30', '12:00', '14:00', '16:30', '18:00'],
    ['11:00', '13:00', '14:30', '16:00', '17:30']
  ];
  function NB_PHONE(code, end) { return ['+992', code, '•••', '••', end].join('\u00a0'); } // маска телефона одним куском, без переноса
  var CLIENTS = [ // «База клиентов (пример)»
    ['Малика Н.', NB_PHONE('90', '12'), 12, 'вчера'],
    ['Фарзона К.', NB_PHONE('93', '47'), 7, '3 дня назад'],
    ['Сабрина Х.', NB_PHONE('98', '85'), 5, 'неделю назад'],
    ['Мехрангез Д.', NB_PHONE('91', '03'), 3, '2 недели назад'],
    ['Анжела С.', NB_PHONE('92', '66'), 1, 'месяц назад']
  ];
  var BCAST = 'На этой неделе −15% на брови и ресницы. Запишитесь в боте!';
  var LOGO = '<svg viewBox="0 0 32 32" width="28" height="28"><path d="M5 28V15a11 11 0 0 1 22 0v13z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="19" r="3.6" fill="currentColor"/><path d="M16 15c-2.4-3-1.4-6.4 0-8.6 1.4 2.2 2.4 5.6 0 8.6z" fill="currentColor" opacity=".55"/></svg>';

  /* ---------- Даты: считаем от сегодняшнего дня; «виртуальное время» уходит вперёд при перемотке ---------- */
  var MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var MONS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  var DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  var BASE = new Date(); BASE.setHours(0, 0, 0, 0);
  function date(abs) { var d = new Date(BASE); d.setDate(d.getDate() + abs); return d; }
  function dm(abs) { var d = date(abs); return d.getDate() + ' ' + MONS[d.getMonth()]; }
  function short(abs) { return (DOW[date(abs).getDay()] + ', ' + dm(abs)).replace(/ /g, '\u00a0'); } // «пт, 23 окт» не рвётся на строки
  function rel(abs) { var r = abs - S.d; return r <= 0 ? 'Сегодня' : r === 1 ? 'Завтра' : r === 2 ? 'Послезавтра' : 'Через ' + r + (r < 5 ? ' дня' : ' дней'); }
  function when(b) { return rel(b.abs) + ' (' + short(b.abs) + '), ' + b.time; }
  function card(b) { return b.s.name + '\nМастер: ' + b.m + '\nКогда: ' + when(b) + '\nСтоимость: ' + b.s.price + ' сомони'; }
  function week() { var end = -(BASE.getDay() || 7); return dm(end - 6) + ' – ' + dm(end); } // прошлая неделя, пн–вс

  /* ---------- Состояние ---------- */
  var S;          // всё состояние демо; «Сбросить» создаёт его заново
  var epoch = 0;  // номер «жизни» демо: после сброса отложенные сообщения старой жизни не выводятся
  var chats = {};
  var STEPS = [
    ['start', 'Нажмите «Начать» в телефоне клиента'],
    ['book', 'Запишитесь: услуга, мастер, день и время'],
    ['remind', 'Нажмите «Перемотать время» — бот сам напомнит о визите'],
    ['change', 'Ответьте на напоминание: перенесите или отмените запись'],
    ['owner', 'В телефоне владельца откройте «Отчёт за неделю» или «База клиентов»'],
    ['broadcast', 'Там же отправьте рассылку — она придёт в телефон клиента'],
    ['end', 'Готово! Нажмите «Сбросить демо» — и можно пройти заново']
  ];
  function fresh() { S = { d: 0, t: 9 * 60 + 12, started: false, b: null, n: 0, had: false, done: {}, unread: { client: 0, owner: 0 } }; }

  /* ---------- Вывод сообщений ---------- */
  function visible(c) { return c.root.offsetParent !== null; }
  function toEnd(c) { if (visible(c)) c.log.scrollTop = c.log.scrollHeight; }

  function rich(node, text) { // **жирный** без innerHTML: текст безопасен, даже если его напечатал посетитель
    text.split('**').forEach(function (s, i) {
      if (!s) return;
      if (i % 2) { var b = el('b'); b.textContent = s; node.appendChild(b); } else node.appendChild(document.createTextNode(s));
    });
  }

  function chip(c) { // разделитель дня, как в мессенджере
    if (c.day === S.d) return;
    c.day = S.d;
    var x = el('div', 'chip');
    x.textContent = S.d ? date(S.d).getDate() + ' ' + MON[date(S.d).getMonth()] : 'Сегодня';
    c.log.appendChild(x);
  }

  function keyboard(rows) {
    var kb = el('div', 'kb');
    kb.setAttribute('role', 'group'); kb.setAttribute('aria-label', 'Варианты ответа');
    rows.forEach(function (row) {
      var r = el('div', 'kb__row');
      row.forEach(function (x) { var b = el('button', 'kbtn'); b.type = 'button'; b.textContent = x.t; b._go = x.go; r.appendChild(b); });
      kb.appendChild(r);
    });
    return kb;
  }

  function render(c, who, m) {
    chip(c);
    var msg = el('div', 'msg msg--' + who + (m.wide ? ' msg--wide' : ''));
    var bub = el('div', 'bubble');
    if (m.text) { var p = el('p', 'bubble__text'); rich(p, m.text); bub.appendChild(p); }
    if (m.extra) bub.appendChild(m.extra);
    if (m.note) { var n = el('p', 'bubble__note'); n.textContent = m.note; bub.appendChild(n); }
    var tm = el('span', 'bubble__time'); tm.setAttribute('aria-hidden', 'true'); tm.textContent = hhmm(S.t); bub.appendChild(tm);
    msg.appendChild(bub);
    if (m.kb) msg.appendChild(keyboard(m.kb));
    c.log.appendChild(msg);
    msg.classList.add('is-new'); setTimeout(function () { msg.classList.remove('is-new'); }, 400);
    return msg;
  }

  function reveal(c, node) { // длинное сообщение показываем с начала, короткое — прижимаем к низу
    if (!visible(c)) return;
    var top = node.offsetHeight > c.log.clientHeight - 24 ? node.offsetTop - 8 : c.log.scrollHeight;
    c.log.scrollTo({ top: top, behavior: calm() ? 'auto' : 'smooth' });
  }

  function arrive(c, node, o) {
    if (!visible(c) && !o.quiet) { S.unread[c.who]++; badges(); } // пришло в скрытый телефон — отмечаем на переключателе
    reveal(c, node);
    if (o.focus && visible(c)) { // фокус переходит к новым кнопкам (или к полю), чтобы не потеряться
      var t = node.querySelector(o.focus === true ? '.kbtn' : o.focus);
      if (t) t.focus({ preventScroll: true });
    }
  }

  // очередь: сообщения одной переписки выходят по порядку
  function enqueue(c, fn) {
    var my = epoch;
    c.q = c.q.then(function () { if (my === epoch) return fn(); }).catch(function (e) { console.error(e); });
    return c.q;
  }
  function bot(c, m, o) {
    o = o || {};
    return enqueue(c, function () {
      var my = epoch, ms = calm() ? 0 : (o.delay == null ? 650 : o.delay), dots = null;
      if (ms) { dots = el('div', 'typing'); dots.setAttribute('aria-hidden', 'true'); dots.innerHTML = '<i></i><i></i><i></i>'; c.log.appendChild(dots); toEnd(c); }
      return wait(ms).then(function () {
        if (dots) dots.remove();
        if (my === epoch) arrive(c, render(c, 'bot', m), o);
      });
    });
  }
  function me(c, text) { return enqueue(c, function () { arrive(c, render(c, 'me', { text: text }), {}); }); }

  var B = function (t, go) { return { t: t, go: go }; };
  var say = function (m) { return bot(chats.client, m, { focus: true }); };            // ответ клиенту
  var own = function (m, focus) { return bot(chats.owner, m, { focus: focus || true }); }; // ответ владельцу на его нажатие
  var tell = function (m) { return bot(chats.owner, m, { delay: 900 }); };              // уведомление владельцу (фокус не трогаем)

  // нажатие кнопки: клавиатура запирается, выбранное остаётся отмеченным, в переписку попадает «ответ» посетителя
  function press(c, b) {
    var kb = b.closest('.kb');
    if (kb.classList.contains('is-used')) return;
    kb.classList.add('is-used');
    $$('.kbtn', kb).forEach(function (x) { x.setAttribute('aria-disabled', 'true'); x.tabIndex = -1; });
    b.classList.add('is-picked');
    S.t++;
    me(c, b.textContent);
    c.log.focus({ preventScroll: true }); // пока бот «печатает», фокус остаётся в переписке
    b._go();
  }

  /* ---------- Что клиент видит: меню, запись, мои записи ---------- */
  function menuRows() { return [[B('Записаться', book), B('Мои записи', mine)], [B('Прайс', price), B('Контакты', contacts)]]; }
  function menu() { say({ text: 'Главное меню. Что хотите сделать?', kb: menuRows() }); }

  function start() {
    S.started = true; S.t++; bar(); mark('start');
    chats.client.log.focus({ preventScroll: true });
    me(chats.client, '/start');
    say({ text: 'Здравствуйте! Я бот салона Iris. Помогу записаться, напомню о визите, а если планы изменятся — перенесу или отменю запись. Что хотите сделать?', kb: menuRows() });
  }

  function price() {
    say({ text: '**Прайс**\n' + SERVICES.map(function (s) { return s.name + ' — ' + s.price + ' сомони'; }).join('\n'), note: 'Цены вымышлены.', kb: [[B('Записаться', book), B('В меню', menu)]] });
  }
  function contacts() {
    say({ text: '**Iris beauty studio**\nДушанбе, ул. Образцовая, 7\nЕжедневно с 10:00 до 20:00', note: 'Адрес и часы вымышлены. В вашем боте будут ваши.', kb: [[B('Записаться', book), B('В меню', menu)]] });
  }

  // защита от «старых» кнопок: если запись уже изменена или отменена, бот честно об этом говорит
  function act(id, fn) {
    return function () {
      if (S.b && S.b.id === id) fn();
      else say({ text: 'Эта запись уже изменена или отменена.', kb: [[B('Мои записи', mine), B('В меню', menu)]] });
    };
  }

  function book() {
    var b = S.b;
    if (b) return say({ text: 'У вас уже есть запись:\n' + card(b) + '\nМожно перенести или отменить её.', kb: [[B('Перенести', act(b.id, move)), B('Отменить', act(b.id, ask))], [B('В меню', menu)]] });
    pickService();
  }
  function pickService() {
    say({ text: 'На какую услугу записать?', kb: SERVICES.map(function (s) { return [B(s.name + ' · ' + s.price + ' сомони', function () { pickMaster(s); })]; }).concat([[B('‹ В меню', menu)]]) });
  }
  function pickMaster(s) {
    if (s.masters.length === 1) return pickDay({ s: s, m: s.masters[0], title: '**' + s.name + '**\nМастер: **' + s.masters[0] + '**.', back: pickService, fin: save }); // мастер один — спрашивать нечего
    say({ text: '**' + s.name + '**\nВыберите мастера:', kb: [s.masters.map(function (m) { return B(m, function () { pickDay({ s: s, m: m, title: 'Мастер: **' + m + '**.', back: function () { pickMaster(s); }, fin: save }); }); }), [B('‹ Назад', pickService)]] });
  }
  // F — «ход записи»: услуга, мастер, заголовок, куда вернуться и что сделать в конце (сохранить запись или перенести её)
  function pickDay(F) {
    var days = [], off = OFF[F.m] || [];
    for (var k = 1; days.length < 3 && k < 15; k++) { // три ближайших дня, в которые мастер работает
      var abs = S.d + k;
      if (off.indexOf(date(abs).getDay()) !== -1) continue;
      days.push([B(rel(abs) + ' · ' + short(abs), (function (a) { return function () { pickTime(F, a); }; })(abs))]);
    }
    say({ text: F.title + '\nВыберите день:', kb: days.concat([[B('‹ Назад', F.back)]]) });
  }
  function pickTime(F, abs) {
    var cur = S.b;
    var ts = POOL[abs % POOL.length].filter(function (t) { return !(cur && cur.abs === abs && cur.time === t); }).slice(0, 4); // своё текущее окно не предлагаем
    var T = function (t) { return B(t, function () { F.fin(F, abs, t); }); };
    say({ text: rel(abs) + ' (' + short(abs) + '). Свободное время:', kb: [[T(ts[0]), T(ts[1])], [T(ts[2]), T(ts[3])], [B('‹ Назад', function () { pickDay(F); })]] });
  }

  function save(F, abs, time) {
    if (S.b) return book(); // запись уже есть (например, открыт второй список услуг): ничего не дублируем
    S.b = { id: ++S.n, s: F.s, m: F.m, abs: abs, time: time, rem: false };
    S.had = true; mark('book'); sync();
    say({ text: '**Запись сохранена.** Напомню за день до визита.\n\n' + card(S.b), kb: [[B('Мои записи', mine), B('В меню', menu)]] });
    tell({ text: '**Новая запись**\n' + card(S.b) + '\nКлиент: Вы (демо), ' + NB_PHONE('90', '00') });
  }

  function mine() {
    var b = S.b;
    if (!b) return say({ text: 'У вас пока нет записей.', kb: [[B('Записаться', book), B('В меню', menu)]] });
    say({ text: '**Ваша запись**\n' + card(b) + '\n' + (b.rem ? 'Напоминание отправлено.' : 'Напоминание придёт за день до визита.'), kb: [[B('Перенести', act(b.id, move)), B('Отменить', act(b.id, ask))], [B('В меню', menu)]] });
  }

  /* ---------- Напоминание, перенос, отмена ---------- */
  function remind() { // кнопка «Перемотать время» вне телефона
    var b = S.b;
    if (!b || b.rem) return;
    b.rem = true;
    var day = b.abs - 1; // бот пишет ровно за сутки до визита
    if (day > S.d) { S.d = day; S.t = mins(b.time); } else S.t = Math.max(S.t, mins(b.time));
    mark('remind'); sync(); setView('client');
    chats.client.log.focus({ preventScroll: true });
    chats.client.root.scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' });
    bot(chats.client, { text: 'Напоминаю: **' + rel(b.abs).toLowerCase() + ' в ' + b.time + '** — ' + lc1(b.s.name) + ', мастер ' + b.m + '.\nПридёте?', kb: [[B('Приду', act(b.id, come)), B('Перенести', act(b.id, move)), B('Отменить', act(b.id, ask))]] }, { focus: true });
  }
  function come() {
    var b = S.b;
    say({ text: 'Отлично, ждём вас ' + rel(b.abs).toLowerCase() + ' в ' + b.time + '! Адрес: Душанбе, ул. Образцовая, 7.', kb: [[B('Мои записи', mine), B('В меню', menu)]] });
    tell({ text: '**Клиент подтвердил визит**\n' + b.s.name + ' · ' + b.m + '\n' + when(b) });
  }

  function move() {
    var b = S.b;
    pickDay({ s: b.s, m: b.m, id: b.id, title: 'Переносим запись: **' + b.s.name + '**, мастер ' + b.m + '.', back: mine, fin: shift });
  }
  function shift(F, abs, time) {
    if (!S.b || S.b.id !== F.id) return say({ text: 'Эта запись уже изменена или отменена.', kb: [[B('Мои записи', mine), B('В меню', menu)]] });
    var b = S.b, was = when(b);
    b.abs = abs; b.time = time; b.rem = false;
    mark('change'); sync();
    say({ text: '**Запись перенесена.**\nБыло: ' + was + '\nСтало: ' + when(b) + '\nНапомню за день до нового визита.', kb: [[B('Мои записи', mine), B('В меню', menu)]] });
    tell({ text: '**Клиент перенёс запись**\n' + b.s.name + ' · ' + b.m + '\nБыло: ' + was + '\nСтало: ' + when(b) });
  }

  function ask() {
    var b = S.b;
    say({ text: 'Точно отменить запись?\n' + b.s.name + ' · ' + when(b), kb: [[B('Да, отменить', act(b.id, cancel)), B('Нет', act(b.id, keep))]] });
  }
  function keep() { say({ text: 'Хорошо, запись остаётся в силе.\n' + when(S.b), kb: [[B('Мои записи', mine), B('В меню', menu)]] }); }
  function cancel() {
    var b = S.b;
    S.b = null; mark('change'); sync();
    say({ text: '**Запись отменена.** Окно ' + when(b).toLowerCase() + ' освободилось. Если планы изменятся — записывайтесь снова.', kb: [[B('Записаться', book), B('В меню', menu)]] });
    tell({ text: '**Клиент отменил запись**\n' + b.s.name + ' · ' + b.m + '\nОкно свободно: ' + when(b).toLowerCase() + '.' });
  }

  /* ---------- Что видит владелец ---------- */
  function ownerMenu() { return [[B('Отчёт за неделю', report), B('Рассылка', compose)], [B('База клиентов', base)]]; }

  function dl(rows) {
    var d = el('dl', 'dl');
    rows.forEach(function (r) { var w = el('div'), t = el('dt'), v = el('dd'); t.textContent = r[0]; v.textContent = r[1]; w.appendChild(t); w.appendChild(v); d.appendChild(w); });
    return d;
  }
  function people(rows) {
    var ul = el('ul', 'people');
    rows.forEach(function (r) {
      var li = el('li'), a = el('b'), v = el('b', 'r'), ph = el('span'), l = el('span', 'r');
      a.textContent = r[0]; v.textContent = r[2]; ph.textContent = r[1]; l.textContent = r[3];
      if (r[4]) { var tg = el('span', 'tag'); tg.textContent = 'новый'; a.appendChild(document.createTextNode(' ')); a.appendChild(tg); }
      li.appendChild(a); li.appendChild(v); li.appendChild(ph); li.appendChild(l); ul.appendChild(li);
    });
    return ul;
  }

  function report() {
    mark('owner');
    own({ text: '**Отчёт за неделю** (пример)\n' + week(), extra: dl([['Записей', '48'], ['Переносов', '9'], ['Отмен', '5'], ['Новых клиентов', '17'], ['Самая популярная услуга', 'Маникюр с гель-лаком']]), note: 'Цифры вымышлены. Бот присылает отчёт сам, каждый понедельник.', kb: [[B('Рассылка', compose), B('База клиентов', base)]] });
  }
  function base() {
    mark('owner');
    var rows = CLIENTS.map(function (r) { return [r[0], r[1], r[2] + ' ' + (r[2] === 1 ? 'визит' : r[2] < 5 ? 'визита' : 'визитов'), r[3]]; });
    if (S.had) rows.unshift(['Вы (демо)', NB_PHONE('90', '00'), S.b ? 'запись есть' : 'запись отменена', S.b ? when(S.b) : 'окно свободно', true]);
    own({ text: '**База клиентов** (пример)\nВсего 128 клиентов. Справа — число визитов и последний визит.', extra: people(rows), note: 'Новые клиенты попадают сюда сами, когда записываются в боте.', wide: true, kb: [[B('Отчёт за неделю', report), B('Рассылка', compose)]] });
  }

  function composer() {
    var id = 'bc' + (++S.n), box = el('div', 'compose');
    var lab = el('label'); lab.htmlFor = id; lab.textContent = 'Текст рассылки (до 200 знаков)';
    var ta = el('textarea'); ta.id = id; ta.rows = 4; ta.maxLength = 200; ta.value = BCAST; ta.setAttribute('aria-describedby', id + '-n');
    var cnt = el('p', 'compose__c'); cnt.id = id + '-n';
    var err = el('p', 'compose__e'); err.setAttribute('role', 'alert');
    var btn = el('button', 'compose__b'); btn.type = 'button'; btn.textContent = 'Отправить всем (128 клиентов — пример)';
    var count = function () { cnt.textContent = ta.value.length + ' из 200'; };
    ta.addEventListener('input', count); count();
    btn.addEventListener('click', function () {
      if (box.classList.contains('is-sent')) return;
      var text = ta.value.trim();
      if (!text) { err.textContent = 'Напишите текст рассылки.'; ta.focus(); return; }
      err.textContent = '';
      box.classList.add('is-sent'); ta.readOnly = true; btn.setAttribute('aria-disabled', 'true'); btn.textContent = 'Отправлено';
      S.t++; mark('broadcast');
      if (S.started) bot(chats.client, { text: text, kb: [[B('Записаться', book)]] }, { delay: 700 }); // рассылка приходит в телефон клиента
      own({ text: S.started
        ? '**Рассылка отправлена.** Её получили 128 клиентов (пример). В телефоне клиента она уже появилась.'
        : '**Рассылка отправлена.** Её получат 128 клиентов (пример). В телефон клиента она пока не дойдёт: бот пишет только тем, кто его запускал, а вы ещё не нажали «Начать».',
        kb: [[B('Отчёт за неделю', report), B('База клиентов', base)]] });
    });
    [lab, ta, cnt, err, btn].forEach(function (x) { box.appendChild(x); });
    return box;
  }
  function compose() { own({ text: '**Рассылка клиентам**\nНапишите текст — бот отправит его всем клиентам с кнопкой «Записаться».', extra: composer() }, 'textarea'); }

  /* ---------- Табло: шаги, переключатель, кнопки под телефоном ---------- */
  function mark(k) { S.done[k] = true; steps(); }
  function steps() {
    var ol = $('#steps'), cur = false;
    ol.textContent = '';
    STEPS.forEach(function (s) {
      var li = el('li'); li.textContent = s[1];
      if (S.done[s[0]]) li.className = 'is-done';
      else if (!cur) { cur = true; li.setAttribute('aria-current', 'step'); }
      ol.appendChild(li);
    });
  }
  function badges() {
    $$('.seg__b').forEach(function (b) {
      var n = S.unread[b.dataset.view], tag = $('.seg__n', b);
      tag.hidden = !n; tag.textContent = n || '';
      if (n) b.setAttribute('aria-label', (b.dataset.view === 'client' ? 'Клиент' : 'Владелец') + ', новых сообщений: ' + n); else b.removeAttribute('aria-label');
    });
  }
  function setView(v) {
    $('#phones').dataset.view = v;
    $$('.seg__b').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === v)); });
    S.unread[v] = 0; badges(); toEnd(chats[v]);
  }
  function sync() { // кнопка перемотки живёт, пока есть запись без напоминания
    var b = S.b;
    $('#rewind').disabled = !b || b.rem;
    $('#rewind-note').textContent = !b ? 'доступно после записи' : b.rem ? 'напоминание отправлено' : 'бот напишет клиенту';
  }
  function bar() { // до «Начать» внизу большая кнопка, потом — условная строка ввода
    $('#start').hidden = S.started;
    $('.fake', chats.client.root).hidden = !S.started;
  }

  function init() {
    var intro = el('div', 'intro');
    intro.innerHTML = '<span class="ava" aria-hidden="true">' + LOGO + '</span><b>Iris · запись</b><span>Бот записывает на услуги салона, напоминает о визите, переносит и отменяет записи.</span>';
    chats.client.log.appendChild(intro);
    bar(); sync(); steps(); badges();
    bot(chats.owner, { text: '**Режим владельца.** Сюда приходят новые записи, переносы и отмены. Каждый понедельник бот сам присылает отчёт за неделю. Отсюда же — рассылки и база клиентов.', kb: ownerMenu() }, { delay: 0, quiet: true });
  }
  function reset() {
    epoch++; fresh();
    Object.keys(chats).forEach(function (w) { var c = chats[w]; c.log.textContent = ''; c.q = Promise.resolve(); c.day = -1; });
    init(); setView('client');
    $('#sr').textContent = 'Демо сброшено. Начните сначала: кнопка «Начать» в телефоне клиента.';
  }

  /* ---------- Запуск ---------- */
  fresh();
  ['client', 'owner'].forEach(function (w) {
    var root = $('.phone[data-who="' + w + '"]');
    var c = chats[w] = { who: w, root: root, log: $('.log', root), q: Promise.resolve(), day: -1 };
    c.log.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('button.kbtn'); if (b) press(c, b); });
  });
  $('#start').addEventListener('click', start);
  $('#rewind').addEventListener('click', remind);
  $('#reset').addEventListener('click', reset);
  $$('.seg__b').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });
  init();
})();
