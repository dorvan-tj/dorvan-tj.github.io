/* Dorvan — страница /wow: «прокрутка = видео». Здесь всё, что делает сама страница: выбор набора кадров (компьютер / телефон), загрузка кадров (первые сразу, остальные по очереди от
   текущего места), перевод прокрутки в «какой кадр нужен» (у каждого шага своя четверть прокрутки и свой кусок сюжета), тексты шагов, счётчик, заставка и запасной показ.
   Сами кадры рисует движок engine.js: в отдельном потоке на OffscreenCanvas (прокрутка идёт ровно, даже если страница занята), а если так нельзя — прямо здесь.
   Наборы режет qa/wow-frames.py; AT — положения четырёх шагов в наборе (скрипт печатает их, сюда вписаны). Без библиотек. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const boot = $('#boot');
  if (root.classList.contains('is-static')) { window.__wow = { mode: 'static', why: 'preset' }; if (boot) boot.remove(); return; }

  const track = $('#track'), stage = $('#stage'), loadBar = $('.load'), fill = $('.rail__fill');
  let cv = $('#cv');
  const steps = $$('.step'), dots = $$('.rail__i');
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const SETS = {
    d: { n: 150, w: 1284, h: 724, at: [0, 31, 67, 108, 149], behind: 6, ahead: 20 },    // компьютер и планшет
    m: { n: 100, w: 800, h: 724, at: [0, 21, 45, 72, 99], behind: 10, ahead: 30 },      // телефон: центр кадра, около 2/3 ширины; рисуется полосой во всю ширину экрана
  };
  const PARALLEL = 6;          // одновременных загрузок
  const CAP = 1.25;            // пикселей холста на пиксель кадра: больше смысла нет
  const GIVE_UP_MS = 9000;     // кадры так и не пришли — показываем картинки

  let key, set, N, busy, loaded = 0, inflight = 0, gen = 0, lost = 0, lastPos = 0, revealed = false, stepIx = -1, pPrev = -1;
  let eng = null, worker = null, mirror = { cur: 0, decoded: 0, frameMs: 0 }, top0 = 0, span = 1, rid = 0;
  const rpc = {};

  function goStatic(why, remember) {
    if (root.classList.contains('is-static')) return;
    gen++;
    root.classList.add('is-static');
    if (worker) worker.terminate();
    if (eng) eng.reset({ n: 0, w: 1, h: 1, at: [0, 0, 0, 0, 0], behind: 0, ahead: 0 });   // отпустить память кадров
    if (remember) { try { sessionStorage.setItem('wow-static', '1'); } catch (e) { /* без хранилища — не страшно */ } }
    if (boot) boot.remove();
    window.scrollTo(0, 0);
    if (!window.__wow) window.__wow = { mode: 'static' };
    window.__wow.why = why;
  }
  if (typeof WowEngine === 'undefined' || !window.fetch || !window.createImageBitmap) return goStatic('api', true);

  /* ---------- движок: в отдельном потоке, а если нельзя — здесь ---------- */
  const cbs = { ready: () => reveal(), slow: () => goStatic('slow', true), failed: () => goStatic('decode', true), state: (s) => { mirror = s; } };
  const ask = (msg) => new Promise((res) => { const id = ++rid; rpc[id] = res; worker.postMessage(Object.assign({ id }, msg)); });
  function makeEngine() {
    if (!/[?&]main\b/.test(location.search) && window.Worker && window.OffscreenCanvas && cv.transferControlToOffscreen) {
      try {
        const w = new Worker('engine-worker.js');
        w.onmessage = (e) => {
          const m = e.data;
          if (m.op === 'ready') cbs.ready(); else if (m.op === 'slow') cbs.slow(); else if (m.op === 'failed') cbs.failed();
          else if (m.op === 'state') cbs.state(m.s); else if (m.op === 'ret') { rpc[m.id](m.r); delete rpc[m.id]; }
        };
        w.onerror = fallback;
        const off = cv.transferControlToOffscreen();
        w.postMessage({ op: 'init', canvas: off }, [off]);
        worker = w;
        return {
          reset: (s) => w.postMessage({ op: 'reset', set: s }), put: (j, buf) => w.postMessage({ op: 'put', j, buf }, [buf]), to: (pos) => w.postMessage({ op: 'to', pos }),
          size: (cw, ch, band) => w.postMessage({ op: 'size', w: cw, h: ch, band }), sig: () => ask({ op: 'sig' }), diag: (on) => ask({ op: 'diag', on }),
        };
      } catch (err) { worker = null; }
    }
    return new WowEngine(cv, cbs);
  }
  function fallback() {                              // поток не запустился или упал: холст отдан ему насовсем — ставим новый и рисуем здесь
    if (!worker) return;
    worker.terminate(); worker = null;
    const fresh = cv.cloneNode(false); cv.replaceWith(fresh); cv = fresh;
    eng = new WowEngine(cv, cbs);
    start(key);
  }

  const pick = () => (stage.clientWidth / stage.clientHeight < 0.62 ? 'm' : 'd');
  function start(k) {
    gen++; key = k; set = SETS[k]; N = set.n;
    busy = new Uint8Array(N); loaded = inflight = 0;
    eng.reset(set); sizeCanvas(); measure();
    lastPos = posOf(progress()); eng.to(lastPos);
    pump();
  }
  function sizeCanvas() {
    const w = stage.clientWidth, h = stage.clientHeight, band = key === 'm';
    const s = band ? w / set.w : Math.max(w / set.w, h / set.h);   // css-пикселей на пиксель кадра (телефон — кадр во всю ширину, компьютер — «cover»)
    const k = Math.max(0.5, Math.min(devicePixelRatio || 1, CAP / s, 2));
    const bh = band ? w * set.h / set.w : h;   // телефон: холст — только полоса видео во всю ширину, середина на 40% высоты экрана (между шапкой и текстом шага); выше и ниже — фон сцены, его не рисуем
    cv.style.top = band ? Math.max(0, 0.4 * h - bh / 2) + 'px' : '';   // те же числа, что в wow.css (без округления) — холст остаётся на месте
    cv.style.height = band ? bh + 'px' : '';
    eng.size(Math.round(w * k), Math.round(bh * k), band);
  }

  /* ---------- загрузка: ближайший к текущему месту (вперёд — охотнее, назад — с «штрафом») кадр из ещё не загруженных ---------- */
  function nextToLoad() {
    const c = Math.round(lastPos); let best = -1, bs = 1e9;
    for (let i = 0; i < N; i++) {
      if (busy[i]) continue;
      const d = i - c, s = d >= 0 ? d : 3 - d * 2;
      if (s < bs) { bs = s; best = i; }
    }
    return best;
  }
  function pump() {
    while (inflight < PARALLEL) {
      const i = nextToLoad();
      if (i < 0) return;
      busy[i] = 1; inflight++;
      const g = gen, name = String(i + 1).padStart(3, '0');
      fetch(`../assets/wow/${key}/${name}.webp`)
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((buf) => { if (g !== gen) return; eng.put(i, buf); busy[i] = 2; loaded++; bars(); })
        .catch(() => { if (g === gen && ++lost >= 8) goStatic('network', true); })
        .finally(() => { if (g === gen) { inflight--; pump(); } });
    }
  }
  function bars() {
    const f = (loaded / N).toFixed(3);
    if (boot) boot.style.setProperty('--load', f);
    loadBar.style.transform = `scaleX(${f})`;
    if (loaded === N) loadBar.classList.add('is-done');
  }
  function reveal() {                                // заставка уходит, когда нарисован кадр под текущим местом и пришла первая пачка
    if (revealed) return;
    revealed = true;
    if (boot) { boot.classList.add('is-out'); setTimeout(() => boot.remove(), 700); }
  }

  /* ---------- прокрутка → место в наборе кадров, шаги и счётчик ---------- */
  let ptr = 0;
  const measure = () => { top0 = track.getBoundingClientRect().top + window.scrollY; span = track.offsetHeight - stage.clientHeight; };   // начало и длина прокрутки сцены: меряем при старте и смене размера, а не на каждом кадре
  const progress = () => (span > 0 ? Math.min(1, Math.max(0, (window.scrollY - top0) / span)) : 0);
  function posOf(p) {                                // каждому шагу — своя четверть прокрутки и свой кусок сюжета (AT)
    const a = set.at, q = Math.min(3, Math.floor(p * 4));
    return a[q] + (a[q + 1] - a[q]) * Math.min(1, p * 4 - q);
  }
  function ui(p) {
    const s = Math.min(3, Math.floor(p * 4));
    if (s !== stepIx) {
      stepIx = s;
      steps.forEach((el, i) => { el.classList.toggle('is-on', i === s); el.classList.toggle('is-past', i < s); });
      dots.forEach((el, i) => el.classList.toggle('is-on', i === s));
    }
    if (Math.abs(p - pPrev) > 0.004) {
      pPrev = p;
      fill.style.transform = `scaleY(${Math.min(1, p * 4 / 3).toFixed(4)})`;   // линия счётчика доходит до последнего номера, когда начинается шаг 4
      root.classList.toggle('is-scrolled', p > 0.012);
    }
  }
  function onScroll() { const p = progress(); lastPos = posOf(p); eng.to(lastPos); ui(p); }

  window.__wow = {   // для проверок (qa/wow-check.mjs, qa/wow-smooth.mjs)
    get mode() { return root.classList.contains('is-static') ? 'static' : 'motion'; },
    get key() { return key; }, get n() { return N; }, get loaded() { return loaded; }, get revealed() { return revealed; }, get worker() { return !!worker; },
    get cur() { return mirror.cur; }, get decoded() { return mirror.decoded; }, get frameMs() { return mirror.frameMs; }, get rest() { return !!mirror.rest; }, get target() { return lastPos; },
    sig: () => eng.sig(), diag: (on) => eng.diag(on), why: '',
  };

  eng = makeEngine();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => {
    clearTimeout(ptr);
    ptr = setTimeout(() => { measure(); const k = pick(); if (k !== key) start(k); else sizeCanvas(); onScroll(); }, 120);
  });
  const onMotion = (e) => { if (e.matches) goStatic('reduce', false); };
  mq.addEventListener ? mq.addEventListener('change', onMotion) : mq.addListener(onMotion);

  start(pick());
  ui(progress());
  const giveUp = () => {                             // в фоновой вкладке (ссылку открыли «в новой вкладке») таймер ждёт, пока её откроют
    if (revealed) return;
    if (document.hidden) { document.addEventListener('visibilitychange', () => setTimeout(giveUp, GIVE_UP_MS), { once: true }); return; }
    goStatic('timeout', true);
  };
  setTimeout(giveUp, GIVE_UP_MS);
})();
