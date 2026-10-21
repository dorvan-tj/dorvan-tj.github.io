/* ОТАШ · скрипт страницы: искры, меню на весь экран, хиты шефа, МЕНЮ С ФИЛЬТРАМИ, галерея, бронь стола. */
(() => {
  'use strict';
  const d = document, root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s), $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const qs = new URLSearchParams(location.search);
  if (qs.has('og')) root.classList.add('is-og');
  if (qs.has('shot')) root.classList.add('is-shot');
  let DATA = {}; try { DATA = JSON.parse($('#site-data').textContent); } catch (e) { /* без данных часы не показываются */ }
  // — демо-админка (admin-demo/): цены, стоп-лист и «закрыто сегодня» хранятся только в браузере посетителя и никуда не отправляются —
  const ADMIN_KEY = 'dorvan-demo-otash-v1';
  const todayIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  // «закрыто сегодня» хранится с датой и после полуночи само перестаёт действовать (как в настоящем боте)
  // из памяти берём только то, что похоже на правду (после старой версии демо там может лежать что угодно)
  const readAdmin = () => { try { const v = JSON.parse(localStorage.getItem(ADMIN_KEY)); if (!v || typeof v !== 'object') return {}; const prices = {}; if (v.prices && typeof v.prices === 'object') Object.keys(v.prices).forEach((id) => { const n = v.prices[id]; if (Number.isInteger(n) && n > 0 && n < 100000) prices[id] = n; }); return { prices, stop: Array.isArray(v.stop) ? v.stop.filter((x) => typeof x === 'string') : [], closed: v.closed === todayIso() }; } catch (e) { return {}; } };
  let adm = readAdmin(), nextOpen = '12:00';
  const adminHooks = [];

  // — искры (рисуем на canvas, останавливаем, когда не видно) —
  function Embers(canvas, count) {
    const ctx = canvas.getContext('2d'); let w = 0, h = 0, raf = 0, on = false, ps = [];
    const size = () => { const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); w = r.width; h = r.height; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const make = (init) => ({ x: Math.random() * w, y: init ? Math.random() * h : h + 8, r: 0.6 + Math.random() * 2.1, vy: 0.35 + Math.random() * 1.2, vx: (Math.random() - 0.5) * 0.3, s: Math.random() * 6.28, ds: 0.012 + Math.random() * 0.02, a: 0.35 + Math.random() * 0.65, hue: 22 + Math.random() * 28 });
    const draw = (still) => {
      ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        if (!still) { p.y -= p.vy; p.s += p.ds; p.x += p.vx + Math.sin(p.s) * 0.4; if (p.y < -10) Object.assign(p, make(false)); }
        const t = 1 - p.y / h, al = p.a * clamp(t * 7, 0, 1) * clamp(1.15 - t, 0, 1);
        ctx.fillStyle = `hsla(${p.hue},100%,58%,${(al * 0.14).toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.6, 0, 6.283); ctx.fill();
        ctx.fillStyle = `hsla(${p.hue},100%,62%,${al.toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    };
    const loop = () => { draw(false); raf = on ? requestAnimationFrame(loop) : 0; };
    size(); ps = Array.from({ length: count }, () => make(true)); draw(true);
    addEventListener('resize', () => { size(); draw(true); });
    return { start() { if (reduce || on) return; on = true; raf = requestAnimationFrame(loop); }, stop() { on = false; } };
  }
  const heroEm = Embers($('.embers'), innerWidth < 700 ? 34 : 70), ovEm = Embers($('.ov-embers'), 46);
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { const on = es[0].isIntersecting; on ? heroEm.start() : heroEm.stop(); $('.hero').classList.toggle('off', !on); }, { threshold: 0 }).observe($('.hero')); else heroEm.start();
  d.addEventListener('visibilitychange', () => { if (d.hidden) heroEm.stop(); });
  const hero = $('.hero');
  if (fine && !reduce) hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--mx', (e.clientX - r.left) + 'px'); hero.style.setProperty('--my', (e.clientY - r.top) + 'px'); });

  // — шапка и меню на весь экран —
  const hdr = $('.hdr'), burger = $('.burger'), ov = $('#menu-ov'), lock = $$('#main, .ftr, .fab');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    ov.classList.toggle('open', open); ov.setAttribute('aria-hidden', String(!open)); hdr.classList.toggle('menu-open', open);
    lock.forEach((el) => { el.inert = open; }); root.style.overflow = open ? 'hidden' : '';
    open ? ovEm.start() : ovEm.stop(); if (open) setTimeout(() => $('a', ov).focus({ preventScroll: true }), 300);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  ov.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (ov.classList.contains('open')) { setMenu(false); burger.focus(); } fab && fab.classList.remove('open'); } });
  matchMedia('(min-width:1040px)').addEventListener('change', (e) => { if (e.matches && ov.classList.contains('open')) setMenu(false); });

  // — появление блоков —
  const rev = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rev.forEach((el) => io.observe(el));
  } else rev.forEach((el) => el.classList.add('in'));

  // — прокрутка: фон героя, параллакс фото, подсветка пунктов меню —
  const bg = $('.hero-bg'), pimgs = $$('[data-parallax-img]'), navLinks = $$('.nav a'), secs = navLinks.map((a) => $(a.getAttribute('href')));
  let queued = false;
  const frame = () => {
    queued = false; const vh = innerHeight;
    hdr.classList.toggle('solid', scrollY > 24);
    if (!reduce) {
      if (scrollY < vh * 1.2) bg.style.setProperty('--py', (scrollY * 0.22).toFixed(1) + 'px');
      pimgs.forEach((el) => { const r = el.getBoundingClientRect(); el.style.setProperty('--iy', (clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1) * -40).toFixed(1) + 'px'); });
    }
    let cur = null; secs.forEach((s) => { if (s && s.getBoundingClientRect().top < vh * 0.4) cur = s; });
    navLinks.forEach((a) => a.classList.toggle('on', !!cur && a.getAttribute('href') === '#' + cur.id));
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', queue, { passive: true }); addEventListener('resize', queue); frame();

  // — хиты шефа: стрелки, перетаскивание, полоса прогресса —
  const rail = $('#hits-rail');
  if (rail) {
    const prog = $('#hits-prog'), step = () => Math.max(260, rail.clientWidth * 0.6);
    const upd = () => { const max = rail.scrollWidth - rail.clientWidth, w = rail.clientWidth / rail.scrollWidth; prog.style.setProperty('--w', (w * 100).toFixed(1) + '%'); prog.style.setProperty('--x', ((max > 0 ? rail.scrollLeft / max : 0) * (1 - w) / w * 100).toFixed(1) + '%'); };
    $('#hits-prev').addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }));
    $('#hits-next').addEventListener('click', () => rail.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }));
    rail.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    let down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft; });
    addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); if (moved > 4) { rail.classList.add('drag'); rail.scrollLeft = sl - dx; } });
    addEventListener('pointerup', () => { down = false; setTimeout(() => rail.classList.remove('drag'), 0); });
    rail.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') rail.scrollBy({ left: 200 }); if (e.key === 'ArrowLeft') rail.scrollBy({ left: -200 }); });
  }

  // — МЕНЮ С ФИЛЬТРАМИ —
  const grid = $('#dishes');
  if (grid) {
    const items = $$('.dish', grid), count = $('#count'), empty = $('#empty');
    const catBtns = $$('.chip', $('#filters')), tagBtns = $$('.tog', $('#filters'));
    let cat = 'all', tag = null;
    const match = (el) => (cat === 'all' || el.dataset.cat === cat) && (!tag || el.dataset.tags.split(' ').includes(tag));
    const label = () => (tag ? tagBtns.find((b) => b.dataset.tag === tag).textContent.trim() : catBtns.find((b) => b.dataset.cat === cat).firstChild.textContent.trim());
    const finish = (n) => {
      count.textContent = 'Показано ' + n + ' из ' + items.length; empty.hidden = n > 0;
      if (!n) $('[data-empty-tag]', empty).textContent = tag ? tagBtns.find((b) => b.dataset.tag === tag).textContent.trim() : '';
    };
    const apply = () => {
      const want = new Set(items.filter(match)), stay = items.filter((el) => !el.hidden && want.has(el)), leave = items.filter((el) => !el.hidden && !want.has(el)), enter = items.filter((el) => el.hidden && want.has(el));
      if (reduce || (!leave.length && !enter.length)) { items.forEach((el) => { el.hidden = !want.has(el); }); finish(want.size); return; }
      leave.forEach((el) => el.classList.add('out'));
      setTimeout(() => {
        const first = new Map(stay.map((el) => [el, el.getBoundingClientRect()]));
        leave.forEach((el) => { el.hidden = true; el.classList.remove('out'); }); enter.forEach((el) => { el.hidden = false; });
        stay.forEach((el) => { const f = first.get(el), l = el.getBoundingClientRect(), dx = f.left - l.left, dy = f.top - l.top; if (dx || dy) el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.16,1,.3,1)' }); });
        enter.forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(22px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: 60 + i * 45, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
        finish(want.size);
      }, leave.length ? 190 : 0);
    };
    const pop = (b) => { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); };
    catBtns.forEach((b) => b.addEventListener('click', () => { cat = b.dataset.cat; catBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); pop(b); apply(); }));
    tagBtns.forEach((b) => b.addEventListener('click', () => { tag = tag === b.dataset.tag ? null : b.dataset.tag; tagBtns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.tag === tag))); pop(b); apply(); }));
    $('#reset').addEventListener('click', () => { cat = 'all'; tag = null; catBtns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cat === 'all'))); tagBtns.forEach((x) => x.setAttribute('aria-pressed', 'false')); apply(); });
    finish(items.length);
  }

  // — галерея —
  const lb = $('#lb'), tiles = $$('.tile');
  if (lb && tiles.length) {
    let idx = 0; const im = $('img', lb), cap = $('p', lb);
    const show = (i) => { idx = (i + tiles.length) % tiles.length; const t = tiles[idx]; im.src = t.dataset.full; im.alt = t.dataset.alt; cap.textContent = t.dataset.cap; };
    tiles.forEach((t, i) => t.addEventListener('click', () => { show(i); lb.showModal ? lb.showModal() : lb.setAttribute('open', ''); }));
    $('.lb-prev', lb).addEventListener('click', () => show(idx - 1)); $('.lb-next', lb).addEventListener('click', () => show(idx + 1)); $('.lb-close', lb).addEventListener('click', () => lb.close());
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb-in')) lb.close(); });
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
  }

  // — часы работы —
  const tzNow = (tz) => { const o = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).forEach((p) => { o[p.type] = p.value; }); return { wd: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday], min: (+o.hour % 24) * 60 + +o.minute }; };
  const toMin = (t) => { const [h, m] = t.split(':'); return +h * 60 + +m; };
  const show24 = (t) => (t === '24:00' ? '00:00' : t);
  let now = null, paintHours = () => {};
  if (DATA.hours) {
    try { now = tzNow(DATA.tz); } catch (e) { const t = new Date(); now = { wd: t.getDay(), min: t.getHours() * 60 + t.getMinutes() }; }
    const slot = (wd) => DATA.hours.find((h) => h.days.includes(wd));
    $$('.hours li').forEach((li) => li.classList.toggle('today', li.dataset.days.split(',').map(Number).includes(now.wd)));
    paintHours = () => {
      const t = slot(now.wd), s = slot((now.wd + 1) % 7); let msg, closed = true;
      nextOpen = s ? s.open : '12:00';
      if (adm.closed) msg = 'Сегодня закрыто · откроемся завтра в ' + nextOpen; // «закрыто сегодня» из демо-админки
      else if (t && now.min >= toMin(t.open) && now.min < toMin(t.close)) { msg = 'Сейчас открыто · до ' + show24(t.close); closed = false; }
      else if (t && now.min < toMin(t.open)) msg = 'Сейчас закрыто · откроемся сегодня в ' + t.open;
      else msg = 'Сейчас закрыто · откроемся завтра в ' + nextOpen;
      $$('[data-open-status]').forEach((el) => { el.innerHTML = '<i></i><span></span>'; $('span', el).textContent = msg; el.classList.toggle('is-closed', closed); });
      const line = $('[data-open-line]'); if (line) line.textContent = closed ? msg : 'Открыто сейчас · до ' + show24(t.close);
    };
    paintHours();
  }

  // — бронь: день, время, гости, форма —
  const form = $('#lead');
  if (form) {
    const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], WDL = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];
    const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    let base; try { const p = new Intl.DateTimeFormat('en-CA', { timeZone: DATA.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-').map(Number); base = new Date(Date.UTC(p[0], p[1] - 1, p[2])); } catch (e) { const t = new Date(); base = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())); }
    const daysBox = $('#days'), slots = $$('#times .slot'); let day = null, time = null, guests = 2;
    for (let i = 0; i < 7; i++) {
      const dt = new Date(base.getTime() + i * 864e5), wd = dt.getUTCDay(), b = d.createElement('button');
      b.type = 'button'; b.className = 'slot day'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.dataset.i = i; b.dataset.dn = dt.getUTCDate();
      b.title = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : WDL[wd] + ', ' + dt.getUTCDate() + ' ' + MON[dt.getUTCMonth()];
      b.dataset.label = (i === 0 ? 'сегодня' : i === 1 ? 'завтра' : 'в ' + WDL[wd]) + ', ' + dt.getUTCDate() + ' ' + MON[dt.getUTCMonth()]; b.dataset.wd = wd;
      b.innerHTML = `<small>${WD[wd]}</small><b>${dt.getUTCDate()}</b>`; daysBox.appendChild(b);
    }
    const refresh = () => slots.forEach((s, k) => {
      const [h, m] = s.dataset.t.split(':').map(Number); let off = false;
      if (day) { const busy = +day.dataset.wd === 5 || +day.dataset.wd === 6 ? 3 : 5; off = (+day.dataset.dn * 7 + k * 11) % busy === 0; if (day.dataset.i === '0' && now) off = off || h * 60 + m < now.min + 60; }
      s.disabled = off; if (off && s.getAttribute('aria-checked') === 'true') { s.setAttribute('aria-checked', 'false'); time = null; }
    });
    const radio = (g, btn) => $$('[role=radio]', g).forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
    daysBox.addEventListener('click', (e) => { const b = e.target.closest('.day'); if (!b) return; day = b; radio(daysBox, b); refresh(); daysBox.closest('.bf-block').classList.remove('err'); });
    $('#times').addEventListener('click', (e) => { const b = e.target.closest('.slot'); if (!b || b.disabled) return; time = b; radio($('#times'), b); $('#times').closest('.bf-block').classList.remove('err'); });
    const out = $('#g-out'), note = $('#g-note'), plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'персону' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'персоны' : 'персон');
    const setG = (n) => { guests = clamp(n, 1, 12); out.textContent = guests; note.textContent = guests === 1 ? 'за столом на одного' : guests === 2 ? 'за столом на двоих' : guests === 3 ? 'за столом втроём' : guests >= 8 ? 'большая компания — лучше позвонить' : 'за столом на ' + guests + ' ' + plural(guests); $('#g-minus').disabled = guests === 1; $('#g-plus').disabled = guests === 12; };
    $('#g-minus').addEventListener('click', () => setG(guests - 1)); $('#g-plus').addEventListener('click', () => setG(guests + 1)); setG(2);
    const f = { name: form.elements.name, phone: form.elements.phone, agree: form.elements.agree };
    const fmt = (v) => { let g = v.replace(/\D/g, ''); if (g.startsWith('992')) g = g.slice(3); g = g.slice(0, 9); const p = [g.slice(0, 2), g.slice(2, 5), g.slice(5, 7), g.slice(7, 9)].filter(Boolean); return g ? '+992 ' + p.join(' ') : ''; };
    f.phone.addEventListener('input', () => { f.phone.value = fmt(f.phone.value); });
    const bad = (el, msg) => { const w = el.closest('.field'); w.classList.add('err'); const m = $('.err-msg', w); if (m) m.textContent = msg; el.setAttribute('aria-invalid', 'true'); return el; };
    form.addEventListener('input', (e) => { const w = e.target.closest('.field'); if (w) { w.classList.remove('err'); e.target.removeAttribute('aria-invalid'); } });
    form.addEventListener('submit', (e) => {
      e.preventDefault(); $$('.err', form).forEach((w) => w.classList.remove('err')); $$('[aria-invalid]', form).forEach((x) => x.removeAttribute('aria-invalid'));
      let first = null; const fail = (el, m) => { const x = bad(el, m); first = first || x; };
      if (!day || !time) { const blk = (day ? $('#times') : daysBox).closest('.bf-block'); blk.classList.add('err'); $('#e-slot').textContent = !day ? 'Выберите день' : 'Выберите время'; first = first || $$('.slot:not(:disabled)', blk)[0]; }
      if (f.name.value.trim().length < 2) fail(f.name, 'Напишите, как к вам обращаться');
      if (f.phone.value.replace(/\D/g, '').replace(/^992/, '').length !== 9) fail(f.phone, 'Введите номер полностью, например +992 90 123 45 67');
      if (!f.agree.checked) fail(f.agree, 'Нужно согласие на обработку данных');
      if (first) { first.focus(); return; }
      const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Отправляем…';
      setTimeout(() => {
        $('[data-ok-name]', form).textContent = f.name.value.trim(); $('[data-ok-phone]', form).textContent = f.phone.value; $('[data-ok-when]', form).textContent = day.dataset.label + ' в ' + time.dataset.t; $('[data-ok-guests]', form).textContent = guests + ' ' + plural(guests);
        form.classList.add('sent'); btn.disabled = false; btn.textContent = 'Забронировать стол'; $('.bf-ok h3', form).focus();
      }, reduce ? 0 : 900);
    });
    $('[data-again]', form).addEventListener('click', () => { form.reset(); day = time = null; $$('[role=radio]', form).forEach((b) => b.setAttribute('aria-checked', 'false')); setG(2); refresh(); form.classList.remove('sent'); f.name.focus(); });
    refresh();
    // «закрыто сегодня» из демо-админки: на сегодня записаться нельзя
    adminHooks.push(() => {
      const b0 = $('.day[data-i="0"]', daysBox); if (!b0) return;
      b0.disabled = !!adm.closed; b0.title = adm.closed ? 'Сегодня закрыто' : 'Сегодня';
      if (adm.closed && b0.getAttribute('aria-checked') === 'true') { b0.setAttribute('aria-checked', 'false'); day = null; time = null; $$('[role=radio]', $('#times')).forEach((x) => x.setAttribute('aria-checked', 'false')); refresh(); }
    });
  }

  // — политика и кнопка связи —
  const pol = $('#pol');
  $$('[data-pol]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); pol.showModal ? pol.showModal() : pol.setAttribute('open', ''); }));
  pol && pol.addEventListener('click', (e) => { if (e.target === pol || e.target.closest('[data-pol-close]')) pol.close(); });
  const fab = $('.fab');
  if (fab) { const btn = $('.fab-btn', fab); btn.addEventListener('click', () => { const o = fab.classList.toggle('open'); btn.setAttribute('aria-expanded', String(o)); }); d.addEventListener('click', (e) => { if (!fab.contains(e.target)) { fab.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } }); }

  // — применяем демо-админку: цены, стоп-лист, плашка «Сегодня закрыто» —
  function applyAdmin() {
    const pr = adm.prices || {}, stop = new Set(adm.stop || []), closed = !!adm.closed;
    $$('b[data-price]').forEach((el) => {
      if (!('base' in el.dataset)) el.dataset.base = el.textContent;
      const v = +pr[el.closest('[data-id]').dataset.id], changed = Number.isFinite(v) && v > 0;
      el.textContent = changed ? Math.round(v) + ' сом.' : el.dataset.base;
      el.classList.toggle('is-new', changed);
      if (changed) el.title = 'Цена изменена в демо-админке (было ' + el.dataset.base + ')'; else el.removeAttribute('title');
    });
    $$('.dish[data-id], .hit[data-id]').forEach((el) => {
      const on = stop.has(el.dataset.id), box = $('.dish-img, .hit-img', el);
      el.classList.toggle('is-stop', on);
      let b = $('.stop-badge', box);
      if (on && !b) { b = d.createElement('span'); b.className = 'stop-badge'; b.textContent = 'Стоп-лист · нет сегодня'; box.appendChild(b); }
      if (b) b.hidden = !on;
    });
    // плашки кладём внутрь первого экрана (а не поверх страницы): так они не закрывают ни фильтры меню, ни кнопку связи
    const host = () => { let h = $('.dm-notes'); if (!h) { h = d.createElement('div'); h.className = 'dm-notes'; ($('.hero') || d.body).appendChild(h); } return h; };
    let bar = $('.closed-bar');
    if (closed && !bar) { bar = d.createElement('div'); bar.className = 'closed-bar'; bar.setAttribute('role', 'status'); host().appendChild(bar); }
    if (bar) { bar.hidden = !closed; bar.innerHTML = '<b>Сегодня закрыто.</b> Откроемся завтра в ' + nextOpen + '.<span class="more"> Стол можно забронировать на другой день — <a href="#book">форма ниже</a>.</span>'; }
    const n = Object.keys(pr).length + stop.size + (closed ? 1 : 0);
    let chip = $('.admin-chip');
    if (n && !chip) {
      chip = d.createElement('div'); chip.className = 'admin-chip'; chip.setAttribute('role', 'region'); chip.setAttribute('aria-label', 'Изменения из демо-админки');
      chip.innerHTML = '<span>Меню изменено в демо-админке</span><a href="admin-demo/index.html">Открыть админку</a><button type="button">Сбросить демо</button>';
      host().appendChild(chip);
      $('button', chip).addEventListener('click', () => { try { localStorage.removeItem(ADMIN_KEY); } catch (e) { /* не страшно */ } adm = {}; paintHours(); applyAdmin(); });
    }
    if (chip) chip.hidden = !n;
    // плашки лежат в верхней части первого экрана: даём этому месту отступ, чтобы они не наезжали на заголовок
    const hero = $('.hero'), box = $('.dm-notes');
    if (hero) hero.style.setProperty('--notes-h', box && box.offsetHeight ? box.offsetHeight + 16 + 'px' : '0px');
    adminHooks.forEach((f) => f());
  }
  applyAdmin();
  addEventListener('resize', () => { const hero = $('.hero'), box = $('.dm-notes'); if (hero) hero.style.setProperty('--notes-h', box && box.offsetHeight ? box.offsetHeight + 16 + 'px' : '0px'); });
  // админку могли изменить в другой вкладке — перерисовываем сразу
  addEventListener('storage', (e) => { if (e.key === ADMIN_KEY || e.key === null) { adm = readAdmin(); paintHours(); applyAdmin(); } });
  // «Назад» из админки: страницу могли достать из кэша браузера — перечитываем изменения
  addEventListener('pageshow', (e) => { if (e.persisted) { adm = readAdmin(); paintHours(); applyAdmin(); } });
})();
