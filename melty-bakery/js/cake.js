/* Торт в SVG: общий движок для hero и конструктора.
   Cake.mount(host, {uid, state, pour}) → {svg, set(state), pour(), repour()}
   state: {sponge, cream, glaze ('theme' | 'none' | id), topping, tiers (1|2), text}
   Цвета берутся из BUILDER (data.js); цвет «theme» — это переменная --glaze страницы. */
var Cake = (function () {
  var RX = 160, RY = 40, H = 170;

  var FING = [ /* капли: x, толщина, длина */
    [-132, 16, 36], [-103, 20, 62], [-72, 14, 44], [-42, 22, 86], [-10, 16, 42],
    [22, 20, 72], [54, 14, 50], [86, 22, 94], [116, 16, 40], [139, 14, 54]
  ];

  function rimY(x) { var t = x / RX; return RY * Math.sqrt(Math.max(0, 1 - t * t)); }
  function rnd(seed) { /* mulberry32: один и тот же узор при каждом запуске */
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function band(y1, y2) {
    return '<path class="ck-cr" d="M-160 ' + y1 + 'A160 40 0 0 0 160 ' + y1 + 'V' + y2 + 'A160 40 0 0 1 -160 ' + y2 + 'Z"/>';
  }

  /* один ярус: центр верхнего эллипса в (0,0) */
  function tier(uid) {
    var body = 'M-160 0V' + H + 'A160 40 0 0 0 160 ' + H + 'V0Z';
    var s = '<defs><linearGradient id="sh-' + uid + '" x1="-160" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset=".68" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient></defs>';
    s += '<path class="ck-sp" d="' + body + '"/>' + band(48, 60) + band(108, 120);
    s += '<path d="' + body + '" fill="url(#sh-' + uid + ')"/>';
    s += '<ellipse class="ck-top" rx="160" ry="40"/><ellipse rx="146" ry="32" cx="-10" cy="-2" fill="#fff" fill-opacity=".16"/>';
    s += '<g class="ck-glaze"><ellipse class="ck-g ck-gt" rx="160" ry="40"/>' +
      '<path class="ck-g ck-gs" d="M-160 0A160 40 0 0 0 160 0V14A160 40 0 0 1 -160 14Z"/>';
    FING.forEach(function (f, i) {
      var x = f[0], w = f[1], L = f[2], y0 = (rimY(x) + 2).toFixed(1), y1 = (rimY(x) + L).toFixed(1);
      s += '<path class="ck-fing" pathLength="1" style="--i:' + i + '" stroke-width="' + w + '" d="M' + x + ' ' + y0 + 'V' + y1 + '"/>';
      s += '<path class="ck-glint" pathLength="1" style="--i:' + i + '" stroke-width="' + Math.max(2.5, w * .16).toFixed(1) +
        '" d="M' + (x - w * .22).toFixed(1) + ' ' + (+y0 + 8) + 'V' + (y1 - w * .55).toFixed(1) + '"/>';
    });
    s += '<path class="ck-hl" d="M-104 -2Q-62 -24 -14 -27"/></g>';
    return s;
  }

  /* ---- декор: каждый элемент — внешний <g style="--j"> (анимация) + внутренний <g transform> (позиция) ---- */
  function item(j, x, y, inner, rot) {
    return '<g style="--j:' + j + '"><g transform="translate(' + x + ' ' + y + ')' + (rot ? ' rotate(' + rot + ')' : '') + '">' + inner + '</g></g>';
  }
  var STRAW = '<path d="M0 -15C13 -15 17 -3 10 9C6 17 -6 17 -10 9C-17 -3 -13 -15 0 -15Z" fill="#E5324B"/>' +
    '<path d="M-5 -9q-3 6 -1 12" stroke="#fff" stroke-opacity=".4" stroke-width="3" stroke-linecap="round" fill="none"/>' +
    '<path d="M-9 -13q9 -9 18 0q-9 5 -18 0Z" fill="#4E9B4A"/>' +
    '<g fill="#FFD9A8"><ellipse cx="-4" cy="-1" rx="1" ry="1.7"/><ellipse cx="4" cy="1" rx="1" ry="1.7"/><ellipse cx="0" cy="7" rx="1" ry="1.7"/></g>';
  var BLUE = '<circle r="8.5" fill="#3F4BA3"/><circle cx="-2.5" cy="-3" r="2.6" fill="#fff" fill-opacity=".4"/><path d="M-3 -6.5l3 -1.5 3 1.5-1 2.5h-4z" fill="#2A3380"/>';
  var RASP = '<g fill="#D81E5B"><circle cx="-5" cy="-3" r="5"/><circle cx="5" cy="-3" r="5"/><circle cx="0" cy="-9" r="5"/><circle cx="-5" cy="5" r="5"/><circle cx="5" cy="5" r="5"/><circle cx="0" cy="1" r="5"/></g>' +
    '<g fill="#fff" fill-opacity=".32"><circle cx="-6" cy="-5" r="1.8"/><circle cx="4" cy="-5" r="1.8"/><circle cx="-1" cy="-11" r="1.8"/></g>';
  var MINT = '<path d="M0 0C4 -9 14 -10 18 -6C14 2 5 3 0 0Z" fill="#5BA85A"/><path d="M2 -1L15 -6" stroke="#3E7F3E" stroke-width="1.2" fill="none"/>';
  function mac(c1, c2) {
    return '<ellipse cx="0" cy="5" rx="17" ry="6.5" fill="' + c2 + '"/><ellipse cx="0" cy="1" rx="15.5" ry="3.8" fill="#FFF3E2"/>' +
      '<path d="M-17 -1C-17 -13 -9 -17 0 -17S17 -13 17 -1C17 2 10 4 0 4S-17 2 -17 -1Z" fill="' + c1 + '"/>' +
      '<path d="M-12 -8q4 -6 11 -6" stroke="#fff" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round" fill="none"/>';
  }
  function flower(r, c) {
    var p = '';
    for (var k = 0; k < 6; k++) {
      p += '<ellipse cx="0" cy="' + (-r * .62).toFixed(1) + '" rx="' + (r * .34).toFixed(1) + '" ry="' + (r * .5).toFixed(1) + '" fill="' + c + '" stroke="#E7D6C6" stroke-width=".6" transform="rotate(' + (k * 60) + ')"/>';
    }
    return p + '<circle r="' + (r * .28).toFixed(1) + '" fill="#FFD86B"/><circle cx="' + (-r * .08).toFixed(1) + '" cy="' + (-r * .1).toFixed(1) + '" r="' + (r * .1).toFixed(1) + '" fill="#fff" fill-opacity=".55"/>';
  }
  var LEAF = '<path d="M0 0C5 -8 15 -8 20 -3C15 5 5 6 0 0Z" fill="#6DAE5E"/>';

  function toppings() {
    var r = rnd(7), s = '';
    s += '<g class="tp tp-berries">' +
      item(0, -88, 4, MINT, 190) + item(1, -62, -6, STRAW, -10) + item(2, -12, -16, RASP) + item(3, 46, -8, STRAW, 12) +
      item(4, -34, 6, BLUE) + item(5, 20, 9, BLUE) + item(6, 84, 3, BLUE) + item(7, 100, -6, MINT, -20) + '</g>';
    s += '<g class="tp tp-macarons">' +
      item(0, -62, -3, mac('#FF9DB5', '#F27C9C')) + item(1, 4, -14, mac('#B9DB8E', '#96BE66')) +
      item(2, 64, -1, mac('#FFD86B', '#EFB93A')) + item(3, -20, 9, mac('#CDB6F2', '#AE92DE')) + '</g>';
    s += '<g class="tp tp-flowers">' +
      item(0, -88, 6, LEAF, 170) + item(1, 86, 4, LEAF, -10) + item(2, -56, -4, flower(17, '#FF9DB5')) +
      item(3, 4, -14, flower(21, '#FFFFFF')) + item(4, 62, -2, flower(15, '#D9C2F5')) + item(5, -14, 9, flower(11, '#FFD86B')) + '</g>';
    var nuts = '';
    for (var i = 0; i < 16; i++) {
      var a = r() * 6.283, d = Math.sqrt(r()), x = Math.cos(a) * d * 112, y = Math.sin(a) * d * 24, rot = Math.round(r() * 180);
      var pis = i % 3 !== 0;
      nuts += item(i % 8, x.toFixed(1), y.toFixed(1), pis
        ? '<ellipse rx="6.5" ry="3.8" fill="#9DC066"/><ellipse cx="-1.5" cy="-1" rx="3" ry="1.4" fill="#fff" fill-opacity=".3"/>'
        : '<path d="M-7 0C-7 -6 -2 -8 0 -5C2 -8 7 -6 7 0C7 5 2 7 0 4C-2 7 -7 5 -7 0Z" fill="#A97C50"/><path d="M0 -5V4" stroke="#7B5632" stroke-width="1"/>', rot);
    }
    s += '<g class="tp tp-nuts">' + nuts + '</g>';
    var cols = ['#FF5D8F', '#FFD86B', '#4FC3BB', '#8E7CFF', '#FFFFFF', '#FF9A3C'], sp = '';
    for (var k = 0; k < 44; k++) {
      var a2 = r() * 6.283, d2 = Math.sqrt(r()), x2 = Math.cos(a2) * d2 * 138, y2 = Math.sin(a2) * d2 * 29;
      sp += item(k % 8, x2.toFixed(1), y2.toFixed(1), '<rect x="-4.5" y="-1.5" width="9" height="3" rx="1.5" fill="' + cols[k % 6] + '" stroke="#00000014" stroke-width=".5"/>', Math.round(r() * 180));
    }
    s += '<g class="tp tp-sprinkles">' + sp + '</g>';
    return s;
  }

  function markup(uid, label) {
    var s = '<svg class="ck" viewBox="0 110 520 430" role="img" aria-label="' + label + '" data-glaze="on" data-top="berries" data-tiers="1" data-flag="0">';
    s += '<defs><radialGradient id="shd-' + uid + '"><stop offset="0" stop-color="#2B140D" stop-opacity=".28"/><stop offset="1" stop-color="#2B140D" stop-opacity="0"/></radialGradient></defs>';
    s += '<g class="ck-root">';
    s += '<ellipse cx="260" cy="508" rx="232" ry="26" fill="url(#shd-' + uid + ')"/>';
    s += '<ellipse cx="260" cy="480" rx="215" ry="46" fill="#E4D6C8"/><ellipse cx="260" cy="471" rx="215" ry="46" fill="#fff"/>' +
      '<ellipse cx="260" cy="471" rx="188" ry="38" fill="#F6EEE6"/>';
    s += '<g transform="translate(260 288)">' + tier(uid + 'a') + '</g>';
    s += '<g class="ck-tier2">' + tier(uid + 'b') + '</g>';
    s += '<g class="ck-items">' + toppings() + '</g>';
    s += '<g class="ck-flagg"><rect class="ck-stick" x="-1.5" y="-80" width="3" height="80" rx="1.5"/>' +
      '<rect class="ck-pen" x="2" y="-82" width="100" height="30" rx="8"/><text class="ck-flag-t" x="52" y="-61"></text></g>';
    s += '<path class="ck-stream" pathLength="1" d="M260 70V292"/>';
    s += '</g></svg>';
    return s;
  }

  function pick(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; }

  function mount(host, opts) {
    opts = opts || {};
    host.innerHTML = markup(opts.uid || 'c', opts.label || 'Торт');
    var svg = host.firstChild, stream = svg.querySelector('.ck-stream');

    function setFlag(text) {
      text = (text || '').replace(/^\s+|\s+$/g, '');
      svg.setAttribute('data-flag', text ? '1' : '0');
      if (!text) return;
      var size = text.length > 17 ? 17 : 22, w = Math.min(236, Math.max(76, text.length * size * .47 + 32));
      var t = svg.querySelector('.ck-flag-t');
      t.textContent = text; t.setAttribute('x', (2 + w / 2).toFixed(1)); t.style.fontSize = size + 'px';
      svg.querySelector('.ck-pen').setAttribute('width', w.toFixed(1));
    }

    var api = {
      svg: svg,
      set: function (st) {
        var sp = pick(BUILDER.sponges, st.sponge).color, cr = pick(BUILDER.creams, st.cream).color;
        svg.style.setProperty('--sp', sp);
        svg.style.setProperty('--cr', cr);
        if (st.glaze === 'theme') { svg.style.removeProperty('--g'); svg.setAttribute('data-glaze', 'on'); }
        else if (st.glaze === 'none') svg.setAttribute('data-glaze', 'none');
        else { svg.style.setProperty('--g', pick(BUILDER.glazes, st.glaze).color); svg.setAttribute('data-glaze', 'on'); }
        svg.setAttribute('data-top', st.topping || 'none');
        svg.setAttribute('data-tiers', String(st.tiers || 1));
        stream.setAttribute('d', (st.tiers === 2) ? 'M260 70V186' : 'M260 70V292');
        setFlag(st.text);
      },
      pour: function () {
        svg.classList.remove('pour'); void svg.getBoundingClientRect(); svg.classList.add('pour');
      },
      repour: function () { /* только поток: цвет глазури плавно перетекает через CSS-transition */
        svg.classList.remove('repour'); void svg.getBoundingClientRect(); svg.classList.add('repour');
        clearTimeout(api._t); api._t = setTimeout(function () { svg.classList.remove('repour'); }, 1000);
      }
    };
    if (opts.state) api.set(opts.state);
    if (opts.pour) svg.classList.add('pour');
    return api;
  }

  return { mount: mount };
})();
