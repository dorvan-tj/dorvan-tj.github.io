/* Мини-генератор QR-кода: байтовый режим, версии 1–10, уровни коррекции L/M. Без зависимостей.
   QR.matrix(text, ecl) -> { size, get(x, y) } | null   (null — текст слишком длинный)
   QR.svg(text, { ecl, quiet, fg, bg })       -> строка <svg>
   Алгоритм по ISO/IEC 18004. Самопроверка: qr.test.mjs (node qr.test.mjs). */
(function (root) {
  'use strict';
  var ECC = {
    L: { fmt: 1, cw: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18], blocks: [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4] },
    M: { fmt: 0, cw: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26], blocks: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5] }
  };

  function rawModules(v) {
    var r = (16 * v + 128) * v + 64;
    if (v >= 2) { var a = Math.floor(v / 7) + 2; r -= (25 * a - 10) * a - 55; if (v >= 7) r -= 36; }
    return r;
  }
  function dataCw(v, e) { return Math.floor(rawModules(v) / 8) - ECC[e].cw[v] * ECC[e].blocks[v]; }

  // — поле Галуа GF(256), многочлен 0x11D —
  function mul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
    return z;
  }
  function rsDivisor(deg) {
    var r = [], i, j, root = 1;
    for (i = 0; i < deg; i++) r.push(0);
    r[deg - 1] = 1;
    for (i = 0; i < deg; i++) {
      for (j = 0; j < deg; j++) { r[j] = mul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; }
      root = mul(root, 2);
    }
    return r;
  }
  function rsRemainder(data, div) {
    var r = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ r.shift(); r.push(0);
      div.forEach(function (c, i) { r[i] ^= mul(c, f); });
    });
    return r;
  }

  function utf8(str) {
    var s = unescape(encodeURIComponent(str)), out = [];
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function buildData(bytes, v, e) {
    var bits = [];
    function push(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    push(4, 4); push(bytes.length, v <= 9 ? 8 : 16);
    bytes.forEach(function (b) { push(b, 8); });
    var cap = dataCw(v, e) * 8;
    push(0, Math.min(4, cap - bits.length));
    while (bits.length % 8) bits.push(0);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) push(pad, 8);
    var out = [];
    for (var i = 0; i < bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    return out;
  }

  function addEcc(data, v, e) {
    var nb = ECC[e].blocks[v], eccLen = ECC[e].cw[v];
    var raw = Math.floor(rawModules(v) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
    var div = rsDivisor(eccLen), blocks = [], k = 0, i;
    for (i = 0; i < nb; i++) {
      var dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1)); k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var out = [];
    for (i = 0; i < blocks[0].length; i++)
      blocks.forEach(function (b, j) { if (i !== shortLen - eccLen || j >= nShort) out.push(b[i]); });
    return out;
  }

  function alignPositions(v) {
    if (v === 1) return [];
    var n = Math.floor(v / 7) + 2, size = v * 4 + 17;
    var step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, r = [6];
    for (var pos = size - 7; r.length < n; pos -= step) r.splice(1, 0, pos);
    return r;
  }

  var bit = function (x, i) { return ((x >>> i) & 1) !== 0; };

  function formatBits(e, mask) {
    var data = (ECC[e].fmt << 3) | mask, rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  }
  function versionBits(v) {
    var rem = v;
    for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    return (v << 12) | rem;
  }

  function Grid(v, e) {
    var size = v * 4 + 17, m = [], f = [], y;
    for (y = 0; y < size; y++) { m.push(new Array(size).fill(false)); f.push(new Array(size).fill(false)); }
    this.v = v; this.e = e; this.size = size; this.m = m; this.f = f;
  }
  Grid.prototype.fn = function (x, y, dark) { this.m[y][x] = dark; this.f[y][x] = true; };
  Grid.prototype.finder = function (cx, cy) {
    for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
      var d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
      if (x >= 0 && x < this.size && y >= 0 && y < this.size) this.fn(x, y, d !== 2 && d !== 4);
    }
  };
  Grid.prototype.align = function (cx, cy) {
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++)
      this.fn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  };
  Grid.prototype.format = function (mask) {
    var b = formatBits(this.e, mask), s = this.size, i;
    for (i = 0; i <= 5; i++) this.fn(8, i, bit(b, i));
    this.fn(8, 7, bit(b, 6)); this.fn(8, 8, bit(b, 7)); this.fn(7, 8, bit(b, 8));
    for (i = 9; i < 15; i++) this.fn(14 - i, 8, bit(b, i));
    for (i = 0; i < 8; i++) this.fn(s - 1 - i, 8, bit(b, i));
    for (i = 8; i < 15; i++) this.fn(8, s - 15 + i, bit(b, i));
    this.fn(8, s - 8, true);
  };
  Grid.prototype.functions = function () {
    var s = this.size, i, j;
    for (i = 0; i < s; i++) { this.fn(6, i, i % 2 === 0); this.fn(i, 6, i % 2 === 0); }
    this.finder(3, 3); this.finder(s - 4, 3); this.finder(3, s - 4);
    var p = alignPositions(this.v), n = p.length;
    for (i = 0; i < n; i++) for (j = 0; j < n; j++)
      if (!((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0))) this.align(p[i], p[j]);
    this.format(0);
    if (this.v >= 7) {
      var vb = versionBits(this.v);
      for (i = 0; i < 18; i++) {
        var c = bit(vb, i), a = s - 11 + (i % 3), b = Math.floor(i / 3);
        this.fn(a, b, c); this.fn(b, a, c);
      }
    }
  };
  Grid.prototype.place = function (cw) {
    var s = this.size, i = 0, right, vert, j;
    for (right = s - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (vert = 0; vert < s; vert++) for (j = 0; j < 2; j++) {
        var x = right - j, y = (((right + 1) & 2) === 0) ? s - 1 - vert : vert;
        if (!this.f[y][x] && i < cw.length * 8) { this.m[y][x] = bit(cw[i >>> 3], 7 - (i & 7)); i++; }
      }
    }
  };
  var MASKS = [
    function (x, y) { return (x + y) % 2 === 0; },
    function (x, y) { return y % 2 === 0; },
    function (x, y) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
    function (x, y) { return x * y % 2 + x * y % 3 === 0; },
    function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; },
    function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }
  ];
  Grid.prototype.mask = function (k) {
    for (var y = 0; y < this.size; y++) for (var x = 0; x < this.size; x++)
      if (!this.f[y][x] && MASKS[k](x, y)) this.m[y][x] = !this.m[y][x];
  };
  Grid.prototype.penalty = function () {
    var s = this.size, m = this.m, score = 0, x, y, k, run, line;
    function runs(get) {
      for (var a = 0; a < s; a++) {
        var prev = get(a, 0), len = 1, bits = [prev ? 1 : 0];
        for (var b = 1; b < s; b++) {
          var cur = get(a, b); bits.push(cur ? 1 : 0);
          if (cur === prev) { len++; } else { if (len >= 5) score += 3 + len - 5; prev = cur; len = 1; }
        }
        if (len >= 5) score += 3 + len - 5;
        var str = bits.join('');
        var re = /10111010000|00001011101/g, mm;
        while ((mm = re.exec(str))) { score += 40; re.lastIndex = mm.index + 1; }
      }
    }
    runs(function (a, b) { return m[a][b]; });
    runs(function (a, b) { return m[b][a]; });
    for (y = 0; y < s - 1; y++) for (x = 0; x < s - 1; x++)
      if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
    var dark = 0; m.forEach(function (r) { r.forEach(function (c) { if (c) dark++; }); });
    k = Math.ceil(Math.abs(dark * 20 - s * s * 10) / (s * s)) - 1;
    return score + k * 10;
  };

  function matrix(text, ecl) {
    var bytes = utf8(String(text)), e = ecl === 'L' ? 'L' : 'M', v, tries = e === 'M' ? ['M', 'L'] : ['L'];
    for (var t = 0; t < tries.length; t++) {
      e = tries[t];
      for (v = 1; v <= 10; v++) {
        if (4 + (v <= 9 ? 8 : 16) + bytes.length * 8 <= dataCw(v, e) * 8) {
          var g = new Grid(v, e); g.functions();
          g.place(addEcc(buildData(bytes, v, e), v, e));
          var best = 0, bestScore = Infinity;
          for (var k = 0; k < 8; k++) {
            g.mask(k); g.format(k);
            var sc = g.penalty();
            if (sc < bestScore) { bestScore = sc; best = k; }
            g.mask(k);
          }
          g.mask(best); g.format(best);
          return { size: g.size, version: v, ecl: e, mask: best, get: function (x, y) { return g.m[y][x]; }, grid: g };
        }
      }
    }
    return null;
  }

  function svg(text, o) {
    o = o || {};
    var mx = matrix(text, o.ecl);
    if (!mx) return '';
    var q = o.quiet == null ? 4 : o.quiet, n = mx.size + q * 2, d = '', x, y, run;
    for (y = 0; y < mx.size; y++) {
      for (x = 0; x < mx.size; x++) {
        if (!mx.get(x, y)) continue;
        run = 1; while (x + run < mx.size && mx.get(x + run, y)) run++;
        d += 'M' + (x + q) + ' ' + (y + q) + 'h' + run + 'v1h-' + run + 'z'; x += run - 1;
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges">' +
      '<rect width="' + n + '" height="' + n + '" fill="' + (o.bg || '#fff') + '"/><path d="' + d + '" fill="' + (o.fg || '#000') + '"/></svg>';
  }

  var api = { matrix: matrix, svg: svg, _t: { formatBits: formatBits, versionBits: versionBits, rawModules: rawModules, dataCw: dataCw, rsDivisor: rsDivisor, rsRemainder: rsRemainder, alignPositions: alignPositions, MASKS: MASKS, ECC: ECC, mul: mul } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.QR = api;
})(typeof window !== 'undefined' ? window : this);

/* Шаблон $70 · скрипт страницы: меню, появление блоков, часы работы, галерея, форма (в демо ничего не отправляет), QR. */
(() => {
  'use strict';
  const d = document, $ = (s, c = d) => c.querySelector(s), $$ = (s, c = d) => [...c.querySelectorAll(s)];
  let DATA = {};
  try { DATA = JSON.parse($('#site-data').textContent); } catch (e) { /* нет данных — часы просто не подсвечиваются */ }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // — шапка: тень при прокрутке, меню на телефоне —
  const hdr = $('.hdr'), burger = $('.burger'), mnav = $('.mnav');
  const onScroll = () => hdr && hdr.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const closeMenu = () => { if (!burger) return; burger.setAttribute('aria-expanded', 'false'); mnav.classList.remove('open'); };
  burger && burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', String(open)); mnav.classList.toggle('open', open);
  });
  mnav && mnav.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); fab && fab.classList.remove('open'); } });

  // — блоки плавно появляются при прокрутке —
  $$('[data-stagger]').forEach((box) => [...box.children].forEach((el, i) => { el.classList.add('reveal'); el.style.setProperty('--d', (i % 6) * 0.07 + 's'); }));
  const rev = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    rev.forEach((el) => io.observe(el));
  } else rev.forEach((el) => el.classList.add('in'));

  // — подсветка текущего раздела в меню —
  const links = $$('.nav a[href^="#"]'), secs = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const mark = () => {
    let cur = null; secs.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.38) cur = s; });
    links.forEach((a) => a.classList.toggle('on', !!cur && a.getAttribute('href') === '#' + cur.id));
  };
  addEventListener('scroll', mark, { passive: true }); mark();

  // — часы работы: подсветить сегодняшний день и показать «сейчас открыто» —
  const tzNow = (tz) => {
    const o = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date()).forEach((p) => { o[p.type] = p.value; });
    return { wd: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday], min: (+o.hour % 24) * 60 + +o.minute };
  };
  const toMin = (t) => { const [h, m] = t.split(':'); return +h * 60 + +m; };
  if (DATA.hours) {
    let now; try { now = tzNow(DATA.tz || 'Asia/Dushanbe'); } catch (e) { const t = new Date(); now = { wd: t.getDay(), min: t.getHours() * 60 + t.getMinutes() }; }
    const slot = (wd) => DATA.hours.find((h) => h.days.includes(wd));
    $$('.hours li').forEach((li) => li.classList.toggle('today', li.dataset.days.split(',').map(Number).includes(now.wd)));
    const today = slot(now.wd); let msg = '', closed = false;
    if (today && today.open && now.min >= toMin(today.open) && now.min < toMin(today.close)) msg = 'Сейчас открыто · до ' + today.close;
    else {
      closed = true;
      if (today && today.open && now.min < toMin(today.open)) msg = 'Сейчас закрыто · откроемся сегодня в ' + today.open;
      else {
        const names = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];
        for (let i = 1; i <= 7; i++) { const s = slot((now.wd + i) % 7); if (s && s.open) { msg = 'Сейчас закрыто · откроемся ' + (i === 1 ? 'завтра' : 'в ' + names[(now.wd + i) % 7]) + ' в ' + s.open; break; } }
      }
    }
    $$('[data-open-status]').forEach((el) => { el.innerHTML = '<i></i><span></span>'; $('span', el).textContent = msg; el.classList.toggle('is-closed', closed); });
  }

  // — галерея: большое фото, стрелки, Esc —
  const lb = $('#lb'), tiles = $$('.tile');
  if (lb && tiles.length) {
    let idx = 0; const img = $('img', lb), cap = $('p', lb);
    const show = (i) => { idx = (i + tiles.length) % tiles.length; const t = tiles[idx]; img.src = t.dataset.full; img.alt = t.dataset.cap; cap.textContent = t.dataset.cap; };
    tiles.forEach((t, i) => t.addEventListener('click', () => { show(i); lb.showModal ? lb.showModal() : lb.setAttribute('open', ''); }));
    $('.lb-prev', lb).addEventListener('click', () => show(idx - 1));
    $('.lb-next', lb).addEventListener('click', () => show(idx + 1));
    $('.lb-close', lb).addEventListener('click', () => lb.close());
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb-in')) lb.close(); });
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
  }

  // — плавающая кнопка связи —
  const fab = $('.fab');
  if (fab) {
    const btn = $('.fab-btn', fab);
    btn.addEventListener('click', () => { const o = fab.classList.toggle('open'); btn.setAttribute('aria-expanded', String(o)); });
    d.addEventListener('click', (e) => { if (!fab.contains(e.target)) { fab.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
  }

  // — политика данных —
  const pol = $('#pol');
  $$('[data-pol]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); pol.showModal ? pol.showModal() : pol.setAttribute('open', ''); }));
  pol && pol.addEventListener('click', (e) => { if (e.target === pol || e.target.closest('[data-pol-close]')) pol.close(); });

  // — форма заявки: проверка, «Заявка отправлена» (в демо никуда не уходит) —
  const form = $('#lead');
  if (form) {
    const f = { name: form.elements.name, phone: form.elements.phone, agree: form.elements.agree };
    const fmt = (v) => {
      let g = v.replace(/\D/g, ''); if (g.startsWith('992')) g = g.slice(3); g = g.slice(0, 9);
      const p = [g.slice(0, 2), g.slice(2, 5), g.slice(5, 7), g.slice(7, 9)].filter(Boolean);
      return g ? '+992 ' + p.join(' ') : '';
    };
    f.phone.addEventListener('input', () => { f.phone.value = fmt(f.phone.value); });
    const fail = (el, msg) => { const w = el.closest('.field'); w.classList.add('err'); const m = $('.err-msg', w); if (m) m.textContent = msg; el.setAttribute('aria-invalid', 'true'); return el; };
    const clear = () => { $$('.err', form).forEach((w) => w.classList.remove('err')); $$('[aria-invalid]', form).forEach((e) => e.removeAttribute('aria-invalid')); };
    form.addEventListener('input', (e) => { const w = e.target.closest('.field'); if (w) { w.classList.remove('err'); e.target.removeAttribute('aria-invalid'); } });
    form.addEventListener('submit', (e) => {
      e.preventDefault(); clear();
      let first = null; const bad = (el, m) => { const x = fail(el, m); first = first || x; };
      if (f.name.value.trim().length < 2) bad(f.name, 'Напишите, как к вам обращаться');
      if (f.phone.value.replace(/\D/g, '').replace(/^992/, '').length !== 9) bad(f.phone, 'Введите номер полностью, например +992 90 123 45 67');
      if (!f.agree.checked) bad(f.agree, 'Нужно согласие на обработку данных');
      if (first) { first.focus(); return; }
      const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Отправляем…';
      setTimeout(() => {
        $('[data-ok-name]', form).textContent = f.name.value.trim(); $('[data-ok-phone]', form).textContent = f.phone.value;
        form.classList.add('sent'); btn.disabled = false; btn.textContent = DATA.submit || 'Отправить заявку';
        $('.form-ok h3', form).focus();
      }, reduce ? 0 : 900);
    });
    $('[data-again]', form).addEventListener('click', () => { form.reset(); form.classList.remove('sent'); f.name.focus(); });
  }

  // — QR-код: всегда ведёт на эту страницу; можно скачать —
  const box = $('#qr-box');
  if (box && window.QR) {
    // на опубликованном сайте код ведёт на саму страницу; при просмотре с компьютера (файл или localhost) — на пример адреса
    const local = location.protocol === 'file:' || /^(localhost|127\.|\[::1\])/.test(location.hostname);
    const url = local ? 'https://vash-sait.example/' : location.href.split('#')[0].split('?')[0];
    const svg = QR.svg(url, { ecl: 'M', quiet: 4 });
    if (svg) {
      box.innerHTML = svg; box.setAttribute('role', 'img'); box.setAttribute('aria-label', 'QR-код со ссылкой на этот сайт');
      const u = $('#qr-url'); if (u) u.textContent = local ? 'пример адреса: ' + url : (url.length > 70 ? url.slice(0, 67) + '…' : url);
      const dl = $('#qr-dl');
      dl && dl.addEventListener('click', () => {
        const big = svg.replace('<svg ', '<svg width="1024" height="1024" ');
        const a = d.createElement('a'); a.href = URL.createObjectURL(new Blob([big], { type: 'image/svg+xml' })); a.download = 'qr-site.svg';
        d.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      });
    }
  }
})();
