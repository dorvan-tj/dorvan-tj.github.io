/* Dorvan — страница /wow: движок кадров. Расшифровывает кадры, плавно догоняет место прокрутки, смешивает соседние кадры и рисует на холст.
   Один и тот же код работает в отдельном потоке на OffscreenCanvas (основной путь: прокрутка идёт ровно, даже когда страница занята) и прямо на странице
   (запасной путь для старых браузеров и для ?main). Страница сообщает ему только «куда доехать» (to) и присылает сжатые кадры (put). Без библиотек. */
(function (g) {
  'use strict';
  const TAU = 90;                 // мс: насколько «вязко» кадр догоняет прокрутку
  const MAXLAG = 24;              // кадров: дальше отставать не даём (прыжок по ссылке, восстановление места после перезагрузки)
  const BOOT_MS = 2500;           // сколько ждать первую пачку кадров, прежде чем показать то, что есть
  const BG = '#07060F', BG0 = 'rgba(7,6,15,0)';   // фон страницы: в него плавно уходят верхний и нижний края полосы видео на телефоне
  const raf = g.requestAnimationFrame ? (f) => g.requestAnimationFrame(f) : (f) => setTimeout(() => f(performance.now()), 16);
  const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];

  g.WowEngine = function (canvas, cb) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const t0 = performance.now(), ft = [];          // ft — интервалы между кадрами, пока идёт прокрутка (мс)
    let set, N = 0, data = [], bmps = [], pend = new Set(), nDec = 0, loaded = 0, gen = 0, fails = 0, np = 0;
    let cur = 0, tgt = 0, last = 0, wantAt = -1, shown = -1, drawn = -1, dirty = false, need = false, ready = false, fresh = true, scheduled = false, stamp = 0, rec = null;

    let band = false, R = null, fades = null;       // band — телефон: холст и есть полоса видео (кадр во всю ширину и высоту холста), иначе кадр «покрывает» холст; R — откуда и куда рисовать кадр

    function reset(s) {                              // новый набор кадров (при смене формы окна): всё старое отпускаем
      gen++; bmps.forEach((b) => b && b.close());
      set = s; N = s.n; data = []; bmps = []; pend = new Set(); nDec = loaded = 0; wantAt = -1; shown = drawn = -1; need = false; fresh = true;
      layout();
    }
    function put(j, buf) { data[j] = buf; loaded++; want(); kick(); }
    function to(pos) { tgt = pos; if (fresh || !ready) { cur = pos; fresh = false; } kick(); }   // до первого показа и после смены набора — сразу на место, без догонялок
    function size(w, h, b) {
      band = !!b;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      layout(); shown = drawn = -1; kick();
    }
    function layout() {
      if (!set) return;
      const cw = canvas.width, ch = canvas.height;
      if (band) {                                    // телефон: кадр на весь холст-полосу (выше и ниже холста — фон сцены), края полосы плавно уходят в фон
        R = [0, 0, set.w, set.h, 0, 0, cw, ch];
        const top = ch * 0.14, bot = ch * 0.3;
        const g1 = ctx.createLinearGradient(0, 0, 0, top); g1.addColorStop(0, BG); g1.addColorStop(1, BG0);
        const g2 = ctx.createLinearGradient(0, ch - bot, 0, ch); g2.addColorStop(0, BG0); g2.addColorStop(1, BG);
        fades = [[g1, 0, top], [g2, ch - bot, bot]];
      } else {                                       // компьютер и планшет: «cover» — по центру, лишнее обрезается
        const sc = Math.max(cw / set.w, ch / set.h), sw = cw / sc, sh = ch / sc;
        R = [(set.w - sw) / 2, (set.h - sh) / 2, sw, sh, 0, 0, cw, ch]; fades = null;
      }
    }

    /* расшифровка: держим готовыми кадры вокруг текущего; за кадр — не больше двух новых, лишние отпускаем понемногу */
    function want() {
      const c = Math.round(cur);
      let started = 0, missing = false;
      const take = (j) => {
        if (j < 0 || j >= N || !data[j] || bmps[j] || pend.has(j)) return;
        if (started < 2 && pend.size < 4) { decode(j); started++; } else missing = true;
      };
      take(c);
      for (let d = 1; d <= set.ahead; d++) { take(c + d); if (d <= set.behind) take(c - d); }
      need = missing;
      for (let n = 0; nDec > set.behind + set.ahead + 10 && n < 2; n++) {
        let far = -1, fd = -1;
        for (let j = 0; j < N; j++) if (bmps[j] && Math.abs(j - c) > fd) { fd = Math.abs(j - c); far = j; }
        bmps[far].close(); bmps[far] = null; nDec--;
      }
    }
    function decode(j) {
      const gn = gen, d = data[j]; pend.add(j);
      createImageBitmap(d instanceof Blob ? d : new Blob([d], { type: 'image/webp' }))
        .then((b) => { pend.delete(j); if (gn !== gen) return b.close(); bmps[j] = b; nDec++; dirty = true; kick(); })
        .catch(() => { pend.delete(j); if (gn === gen && ++fails >= 3) cb.failed(); });
    }

    /* холст */
    function paint(bmp, alpha) { ctx.globalAlpha = alpha; ctx.drawImage(bmp, R[0], R[1], R[2], R[3], R[4], R[5], R[6], R[7]); }
    function near(i) {
      for (let d = 0; d < N; d++) { const a = bmps[i - d] || bmps[i + d]; if (a) return a; }
      return null;
    }
    function render(pos, mix) {
      const i = Math.min(N - 1, Math.floor(pos)), f = pos - i, a = near(i);
      if (!a || !R) return;
      const cw = canvas.width;
      paint(a, 1);
      const b = mix && f > 0.04 && bmps[i + 1];
      if (b && b !== a) paint(b, f);                // между двумя кадрами — смесь: при медленной прокрутке движение не «ступенькой» (при быстрой — не нужна: и так каждый раз новый кадр)
      ctx.globalAlpha = 1;
      if (fades) for (const [gr, y, h] of fades) { ctx.fillStyle = gr; ctx.fillRect(0, y, cw, h); }
      return a === bmps[i];                          // false — нужный кадр ещё не расшифрован, показан ближайший готовый
    }

    /* цикл: рисуем, только пока что-то меняется */
    function kick() { if (!scheduled && set) { scheduled = true; raf(tick); } }
    function tick(now) {
      scheduled = false;
      const raw = last ? now - last : 0, dt = last ? Math.min(50, raw) : 16; last = now;
      if (raw) pace(raw);
      if (Math.abs(tgt - cur) > MAXLAG) cur = tgt - Math.sign(tgt - cur) * MAXLAG;
      const was = cur;
      cur += (tgt - cur) * (1 - Math.exp(-dt / TAU));
      if (Math.abs(tgt - cur) < 0.01) cur = tgt;
      const c = Math.round(cur);
      if (c !== wantAt || need) { wantAt = c; want(); }
      const k = Math.round(cur * 24);
      if (k !== shown || dirty || (cur === tgt && drawn !== cur)) {   // в покое рисуем ровно то место, где остановились: одно место — один и тот же кадр, с какой стороны ни подъехать
        const exact = render(cur, Math.abs(cur - was) < 1);   // шаг за кадр меньше кадра видео — смешиваем соседние; в покое всегда смесь (одно место — одна картинка)
        shown = k; drawn = cur; dirty = false;
        if (rec) rec.push([now, 1, exact ? 1 : 0]);
        reveal();
      } else if (rec) rec.push([now, 0, 1]);        // тик без рисования: картинка сдвинулась бы меньше чем на 1/24 кадра (конец плавного торможения) — движок не стоит, просто нечего менять
      if (cur !== tgt) { scheduled = true; raf(tick); report(false); } else { last = 0; if (rec) rec.push([now, -1, 1]); report(true); }   // -1 в записи проверки — «остановились»: паузу не считаем рывком
    }
    function reveal() {                              // заставка уходит, когда нарисован кадр под текущим местом и пришла первая пачка
      if (ready || !bmps[Math.round(cur)]) return;
      if (loaded < 4 && performance.now() - t0 < BOOT_MS) return;
      ready = true; cb.ready();
    }
    function pace(ms) {                              // кадры совсем медленные (очень слабый телефон): медиана последних 45 интервалов > 60 мс (меньше ~16 к/с)
      if (ms > 400 || performance.now() - t0 < BOOT_MS) return;      // пауза вкладки и загрузка в начале не считаются
      ft.push(ms); if (ft.length > 45) ft.shift();
      if (ft.length === 45 && ++np % 9 === 0 && median(ft) > 60) cb.slow();
    }
    function report(force) {                         // состояние для страницы (и для проверок): раз в 200 мс и всегда при остановке
      const t = performance.now();
      if (force || t - stamp > 200) { stamp = t; cb.state({ cur, decoded: nDec, frameMs: ft.length ? median(ft) : 0, ready, rest: force }); }
    }
    setTimeout(() => { if (!ready && bmps.some(Boolean)) { ready = true; cb.ready(); } }, BOOT_MS + 300);

    /* для проверок: уменьшенный снимок холста и запись тиков [время, нарисовал 1 / нет 0 / остановился -1, нужный кадр был готов 1/0] */
    function sig() {
      const o = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(48, 27) : Object.assign(document.createElement('canvas'), { width: 48, height: 27 });
      const x = o.getContext('2d'); x.drawImage(canvas, 0, 0, 48, 27);
      const d = x.getImageData(0, 0, 48, 27).data, a = []; let sum = 0;
      for (let i = 0; i < d.length; i += 4) { const l = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000; a.push(Math.round(l)); sum += l; }
      return Promise.resolve({ a, mean: sum / a.length });
    }
    function diag(on) { if (on) { rec = []; return null; } const r = rec; rec = null; return r; }

    return { reset, put, to, size, sig, diag };
  };
})(self);
