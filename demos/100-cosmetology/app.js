/* ZEBO · скрипт страницы: меню, появление и параллакс, слова при прокрутке, услуги, слайдер «до/после», таймлайн, запись. */
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
  let DATA = {}; try { DATA = JSON.parse($('#site-data').textContent); } catch (e) { /* без данных часы просто не показываются */ }
  try { sessionStorage.setItem('zebo-seen', '1'); } catch (e) { /* приватный режим */ }

  // — шапка и полноэкранное меню —
  const hdr = $('.hdr'), burger = $('.burger'), menu = $('#menu');
  const lock = $$('#main, .ftr, .fab');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.classList.toggle('open', open); menu.setAttribute('aria-hidden', String(!open)); hdr.classList.toggle('menu-open', open);
    lock.forEach((el) => { el.inert = open; }); root.style.overflow = open ? 'hidden' : '';
    if (open) setTimeout(() => $('a', menu).focus({ preventScroll: true }), 350);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (menu.classList.contains('open')) { setMenu(false); burger.focus(); } fab && fab.classList.remove('open'); } });
  matchMedia('(min-width:1040px)').addEventListener('change', (e) => { if (e.matches && menu.classList.contains('open')) setMenu(false); });

  // — появление блоков —
  const rev = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rev.forEach((el) => io.observe(el));
  } else rev.forEach((el) => el.classList.add('in'));

  // — слова утверждения загораются по мере прокрутки —
  const stm = $('[data-words]'); let words = [];
  if (stm && !reduce) { stm.innerHTML = stm.textContent.trim().split(/\s+/).map((w) => `<span class="w" style="opacity:.16">${w}</span>`).join(' '); words = $$('.w', stm); }

  // — всё, что зависит от прокрутки, в одном кадре —
  const par = $$('[data-parallax]'), parImg = $$('[data-parallax-img]');
  const tl = $('#timeline'), steps = $$('.tl-step'), navLinks = $$('.nav a'), secs = navLinks.map((a) => $(a.getAttribute('href')));
  let queued = false;
  const frame = () => {
    queued = false;
    const vh = innerHeight;
    hdr.classList.toggle('solid', scrollY > 24);
    if (!reduce) {
      par.forEach((el) => { const r = el.getBoundingClientRect(); el.style.setProperty('--py', (-(r.top + r.height / 2 - vh / 2) * +el.dataset.parallax).toFixed(1) + 'px'); });
      parImg.forEach((el) => { const r = el.getBoundingClientRect(); el.style.setProperty('--iy', (clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1) * -44).toFixed(1) + 'px'); });
      if (words.length) {
        const r = stm.getBoundingClientRect(), p = clamp((vh * 0.86 - r.top) / (vh * 0.46 + r.height), 0, 1);
        words.forEach((w, i) => { w.style.opacity = (0.16 + 0.84 * clamp((p * 1.2 - i / words.length) * 7, 0, 1)).toFixed(2); });
      }
    }
    if (tl) {
      const r = tl.getBoundingClientRect();
      tl.style.setProperty('--p', clamp((vh * 0.62 - r.top) / (r.height - 80), 0, 1).toFixed(3));
      steps.forEach((s) => s.classList.toggle('on', s.getBoundingClientRect().top < vh * 0.62));
    }
    let cur = null; secs.forEach((s) => { if (s && s.getBoundingClientRect().top < vh * 0.4) cur = s; });
    navLinks.forEach((a) => a.classList.toggle('on', !!cur && a.getAttribute('href') === '#' + cur.id));
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', queue, { passive: true }); addEventListener('resize', queue); frame();

  // — магнитные кнопки —
  if (fine && !reduce) $$('.magnetic').forEach((b) => {
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px'); b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + 'px'); });
    b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
  });

  // — услуги: раскрывающиеся строки + превью у курсора —
  const svcs = $$('.svc');
  svcs.forEach((li) => {
    const head = $('.svc-head', li);
    head.addEventListener('click', () => {
      const open = !li.classList.contains('open');
      svcs.forEach((o) => { if (o !== li && o.classList.contains('open')) { o.classList.remove('open'); $('.svc-head', o).setAttribute('aria-expanded', 'false'); } });
      li.classList.toggle('open', open); head.setAttribute('aria-expanded', String(open));
      if (open) $('.svc-preview').classList.remove('on');
    });
  });
  const pv = $('.svc-preview');
  if (pv && fine && !reduce) {
    const pvi = $('img', pv); let tx = 0, ty = 0, cx = 0, cy = 0, on = false, raf = 0;
    const loop = () => { cx += (tx - cx) * 0.14; cy += (ty - cy) * 0.14; pv.style.setProperty('--x', cx.toFixed(1) + 'px'); pv.style.setProperty('--y', cy.toFixed(1) + 'px'); raf = on || Math.hypot(tx - cx, ty - cy) > 0.6 ? requestAnimationFrame(loop) : 0; };
    svcs.forEach((li) => {
      li.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse' || li.classList.contains('open')) return; pvi.src = li.dataset.img; tx = cx = e.clientX + 36; ty = cy = e.clientY - 150; on = true; pv.classList.add('on'); if (!raf) loop(); });
      li.addEventListener('pointermove', (e) => { tx = e.clientX + 36; ty = e.clientY - 150; if (li.classList.contains('open')) pv.classList.remove('on'); });
      li.addEventListener('pointerleave', () => { on = false; pv.classList.remove('on'); });
    });
  }

  // — до / после —
  const ba = $('#ba');
  if (ba) {
    const range = $('.ba-range', ba), bimgs = $$('.ba-img', ba), cases = DATA.cases || [];
    let demoRaf = 0;
    const setPos = (v) => { ba.style.setProperty('--pos', v); range.value = v; };
    const glide = (from, to, ms, done) => {
      cancelAnimationFrame(demoRaf); const t0 = performance.now();
      const step = (t) => { const k = clamp((t - t0) / ms, 0, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; setPos((from + (to - from) * e).toFixed(2)); if (k < 1) demoRaf = requestAnimationFrame(step); else done && done(); };
      demoRaf = requestAnimationFrame(step);
    };
    range.addEventListener('input', () => { cancelAnimationFrame(demoRaf); ba.style.setProperty('--pos', range.value); ba.classList.add('touched'); });
    ['pointerdown'].forEach((t) => range.addEventListener(t, () => { cancelAnimationFrame(demoRaf); ba.classList.add('drag', 'touched'); }));
    ['pointerup', 'pointercancel', 'blur'].forEach((t) => range.addEventListener(t, () => ba.classList.remove('drag')));
    if ('IntersectionObserver' in window && !reduce) {
      const o = new IntersectionObserver((es) => { if (es[0].isIntersecting) { o.disconnect(); setTimeout(() => { if (!ba.classList.contains('touched')) glide(50, 26, 900, () => !ba.classList.contains('touched') && glide(26, 70, 1400, () => !ba.classList.contains('touched') && glide(70, 50, 900))); }, 700); } }, { threshold: 0.6 });
      o.observe(ba);
    }
    const tabs = $$('.ba-tab'), card = $('.ba-card');
    cases.forEach((c) => { const i = new Image(); i.src = c.img; });
    tabs.forEach((t) => t.addEventListener('click', () => {
      const c = cases[+t.dataset.i]; if (!c) return;
      tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
      bimgs.forEach((im) => { im.src = c.img; im.alt = im.classList.contains('after') ? 'После процедур. ' + c.alt : 'До процедур. ' + c.alt; });
      ba.style.setProperty('--tint', c.tint);
      $('[data-ba=course]', card).textContent = c.course; $('[data-ba=name]', card).textContent = c.name; $('[data-ba=what]', card).textContent = c.what;
      card.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.16,1,.3,1)' });
      if (!reduce) glide(+range.value, 50, 700); else setPos(50);
    }));
  }

  // — прайс: вкладки —
  const ptabs = $$('.ptabs-bar button');
  const pick = (i) => { ptabs.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; $('#pp-' + j).hidden = i !== j; }); };
  ptabs.forEach((b, i) => { b.tabIndex = i ? -1 : 0; b.addEventListener('click', () => pick(i)); b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = (i + (e.key === 'ArrowRight' ? 1 : ptabs.length - 1)) % ptabs.length; pick(n); ptabs[n].focus(); } }); });

  // — часы работы —
  const tzNow = (tz) => { const o = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).forEach((p) => { o[p.type] = p.value; }); return { wd: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday], min: (+o.hour % 24) * 60 + +o.minute }; };
  const toMin = (t) => { const [h, m] = t.split(':'); return +h * 60 + +m; };
  if (DATA.hours) {
    let now; try { now = tzNow(DATA.tz); } catch (e) { const t = new Date(); now = { wd: t.getDay(), min: t.getHours() * 60 + t.getMinutes() }; }
    const slot = (wd) => DATA.hours.find((h) => h.days.includes(wd));
    $$('.hours li').forEach((li) => li.classList.toggle('today', li.dataset.days.split(',').map(Number).includes(now.wd)));
    const t = slot(now.wd); let msg = '', closed = true;
    if (t && t.open && now.min >= toMin(t.open) && now.min < toMin(t.close)) { msg = 'Сейчас открыто · до ' + t.close; closed = false; }
    else if (t && t.open && now.min < toMin(t.open)) msg = 'Сейчас закрыто · откроемся сегодня в ' + t.open;
    else { const nm = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу']; for (let i = 1; i <= 7; i++) { const s = slot((now.wd + i) % 7); if (s && s.open) { msg = 'Сейчас закрыто · откроемся ' + (i === 1 ? 'завтра' : 'в ' + nm[(now.wd + i) % 7]) + ' в ' + s.open; break; } } }
    $$('[data-open-status]').forEach((el) => { el.innerHTML = '<i></i><span></span>'; $('span', el).textContent = msg; el.classList.toggle('is-closed', closed); });
  }

  // — запись: день, время, форма —
  const form = $('#lead');
  if (form) {
    const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], WDL = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];
    const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    let base; try { const p = new Intl.DateTimeFormat('en-CA', { timeZone: DATA.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-').map(Number); base = new Date(Date.UTC(p[0], p[1] - 1, p[2])); } catch (e) { const t = new Date(); base = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())); }
    let nowMin = 0; try { nowMin = tzNow(DATA.tz).min; } catch (e) { /* без часового пояса */ }
    const daysBox = $('#days'), timeBtns = $$('#times .chip-btn'); let day = null, time = null;
    for (let i = 0, added = 0; added < 7 && i < 14; i++) {
      const dt = new Date(base.getTime() + i * 864e5), wd = dt.getUTCDay(); if (wd === 0) continue;
      const b = d.createElement('button'); b.type = 'button'; b.className = 'chip-btn day'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
      b.dataset.i = i; b.dataset.dn = dt.getUTCDate(); b.title = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : WDL[wd] + ', ' + dt.getUTCDate() + ' ' + MON[dt.getUTCMonth()];
      b.innerHTML = `<small>${WD[wd]}</small><b>${dt.getUTCDate()}</b>`; b.dataset.label = (i === 0 ? 'сегодня' : i === 1 ? 'завтра' : 'в ' + WDL[wd]) + ', ' + dt.getUTCDate() + ' ' + MON[dt.getUTCMonth()];
      daysBox.appendChild(b); added++;
    }
    const refresh = () => {
      timeBtns.forEach((t, k) => {
        const [h, m] = t.dataset.t.split(':').map(Number); let off = false;
        if (day) { off = (+day.dataset.dn * 7 + k * 13) % 5 === 0; if (day.dataset.i === '0') off = off || h * 60 + m < nowMin + 60; }
        t.disabled = off; if (off && t.getAttribute('aria-checked') === 'true') { t.setAttribute('aria-checked', 'false'); time = null; }
      });
    };
    const radio = (group, btn) => { $$('[role=radio]', group).forEach((b) => b.setAttribute('aria-checked', String(b === btn))); };
    daysBox.addEventListener('click', (e) => { const b = e.target.closest('.day'); if (!b) return; day = b; radio(daysBox, b); refresh(); $('.bf-block.err', form) && $('.bf-block.err', form).classList.remove('err'); });
    $('#times').addEventListener('click', (e) => { const b = e.target.closest('.chip-btn'); if (!b || b.disabled) return; time = b; radio($('#times'), b); $('#times').closest('.bf-block').classList.remove('err'); });
    const f = { name: form.elements.name, phone: form.elements.phone, agree: form.elements.agree };
    const fmt = (v) => { let g = v.replace(/\D/g, ''); if (g.startsWith('992')) g = g.slice(3); g = g.slice(0, 9); const p = [g.slice(0, 2), g.slice(2, 5), g.slice(5, 7), g.slice(7, 9)].filter(Boolean); return g ? '+992 ' + p.join(' ') : ''; };
    f.phone.addEventListener('input', () => { f.phone.value = fmt(f.phone.value); });
    const bad = (el, msg) => { const w = el.closest('.field') || el.closest('.bf-block'); w.classList.add('err'); const m = $('.err-msg', w); if (m) m.textContent = msg; el.setAttribute('aria-invalid', 'true'); return el; };
    form.addEventListener('input', (e) => { const w = e.target.closest('.field'); if (w) { w.classList.remove('err'); e.target.removeAttribute('aria-invalid'); } });
    form.addEventListener('submit', (e) => {
      e.preventDefault(); $$('.err', form).forEach((w) => w.classList.remove('err')); $$('[aria-invalid]', form).forEach((x) => x.removeAttribute('aria-invalid'));
      let first = null; const fail = (el, m) => { const x = bad(el, m); first = first || x; };
      if (!day || !time) { const blk = (day ? $('#times') : daysBox).closest('.bf-block'); blk.classList.add('err'); $('#e-slot').textContent = !day ? 'Выберите день' : 'Выберите время'; first = first || $$('.chip-btn:not(:disabled)', blk)[0]; }
      if (f.name.value.trim().length < 2) fail(f.name, 'Напишите, как к вам обращаться');
      if (f.phone.value.replace(/\D/g, '').replace(/^992/, '').length !== 9) fail(f.phone, 'Введите номер полностью, например +992 90 123 45 67');
      if (!f.agree.checked) fail(f.agree, 'Нужно согласие на обработку данных');
      if (first) { first.focus(); return; }
      const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Отправляем…';
      setTimeout(() => {
        $('[data-ok-name]', form).textContent = f.name.value.trim(); $('[data-ok-phone]', form).textContent = f.phone.value;
        $('[data-ok-when]', form).textContent = day.dataset.label + ' в ' + time.dataset.t;
        form.classList.add('sent'); btn.disabled = false; btn.textContent = 'Записаться на консультацию'; $('.bf-ok h3', form).focus();
      }, reduce ? 0 : 900);
    });
    $('[data-again]', form).addEventListener('click', () => { form.reset(); day = time = null; $$('[role=radio]', form).forEach((b) => b.setAttribute('aria-checked', 'false')); refresh(); form.classList.remove('sent'); f.name.focus(); });
    refresh();
    // «Записаться на …» из других блоков подставляет услугу
    $$('[data-pick]').forEach((a) => a.addEventListener('click', () => { const v = a.dataset.pick.toLowerCase(), o = [...$('#b-svc').options].find((x) => x.text.toLowerCase().includes(v)); if (o) $('#b-svc').value = o.value || o.text; }));
  }

  // — политика и кнопка связи —
  const pol = $('#pol');
  $$('[data-pol]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); pol.showModal ? pol.showModal() : pol.setAttribute('open', ''); }));
  pol && pol.addEventListener('click', (e) => { if (e.target === pol || e.target.closest('[data-pol-close]')) pol.close(); });
  const fab = $('.fab');
  if (fab) { const btn = $('.fab-btn', fab); btn.addEventListener('click', () => { const o = fab.classList.toggle('open'); btn.setAttribute('aria-expanded', String(o)); }); d.addEventListener('click', (e) => { if (!fab.contains(e.target)) { fab.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } }); }
})();
