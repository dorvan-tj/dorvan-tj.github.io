/* Melty Bakery — поведение сайта: меню, корзина, конструктор, доставка, формы, диалоги.
   Без зависимостей и сборки. Данные — data.js, фото — photos.js, торт — cake.js. */
(function () {
  'use strict';

  /* ---------- утилиты ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NB = String.fromCharCode(160);
  var root = document.documentElement;
  var P = {}; PRODUCTS.forEach(function (p) { P[p.id] = p; });

  function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }
  function money(n) { return fmt(n) + NB + 'сом.'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е'); }
  function ic(name, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(min) { min = ((min % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function store(key, val) {
    try { if (val === undefined) return JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* приватный режим */ }
    return null;
  }
  function pick(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; }
  function raf(fn) { var busy = false; return function () { if (busy) return; busy = true; requestAnimationFrame(function () { busy = false; fn(); }); }; }
  function jump(sel) { var el = $(sel); if (el) el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); }

  /* ---------- время Душанбе ---------- */
  function nowMin() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: SITE.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var h = 0, m = 0;
      parts.forEach(function (p) { if (p.type === 'hour') h = +p.value; if (p.type === 'minute') m = +p.value; });
      return h * 60 + m;
    } catch (e) { var d = new Date(); return d.getUTCHours() * 60 + d.getUTCMinutes() + 300; }
  }
  function dur(min) { return min >= 60 ? Math.floor(min / 60) + ' ч ' + (min % 60 ? (min % 60) + ' мин' : '') : min + ' мин'; }

  function updateStatus() {
    var t = nowMin() % 1440, open = t >= SITE.open && t < SITE.close, text;
    if (open) text = SITE.close - t <= 30 ? 'Закрываемся в ' + hhmm(SITE.close) : 'Открыто до ' + hhmm(SITE.close);
    else text = 'Закрыто · откроемся ' + (t < SITE.open ? 'сегодня' : 'завтра') + ' в ' + hhmm(SITE.open);
    ['statusText', 'statusText2', 'statusText3'].forEach(function (id) { var e = $('#' + id); if (e) e.textContent = text; });
    ['status', 'status2'].forEach(function (id) { var e = $('#' + id); if (e) e.classList.toggle('is-closed', !open); });
    var mn = $('.mnav-st'); if (mn) mn.classList.toggle('is-closed', !open);

    var next = null;
    for (var i = 0; i < SITE.batches.length; i++) if (SITE.batches[i] > t) { next = SITE.batches[i]; break; }
    var b = $('#batchText');
    if (b) b.textContent = next ? 'Свежие круассаны в ' + hhmm(next) + ' — через ' + dur(next - t) : 'Свежие круассаны — завтра в ' + hhmm(SITE.batches[0]);
  }

  /* ---------- диалоги ---------- */
  function openDlg(d) { if (!d.open) { d.classList.remove('is-closing'); d.showModal(); } }
  function closeDlg(d) {
    if (!d.open || d.classList.contains('is-closing')) return;
    if (RM) { d.close(); return; }
    d.classList.add('is-closing');
    var done = false;
    function end() { if (done) return; done = true; d.classList.remove('is-closing'); d.close(); }
    d.addEventListener('animationend', function h(e) { if (e.target === d && !e.pseudoElement) { d.removeEventListener('animationend', h); end(); } });
    setTimeout(end, 340);
  }
  $$('dialog').forEach(function (d) {
    d.addEventListener('cancel', function (e) { e.preventDefault(); closeDlg(d); });
    d.addEventListener('click', function (e) { if (e.target === d) closeDlg(d); });
  });

  /* ---------- toast (popover: поверх открытых диалогов) ---------- */
  var toastEl = $('#toast'), toastT;
  function toast(msg, action) {
    var b = $('#toastBtn');
    $('#toastMsg').textContent = msg;
    if (action) { b.hidden = false; b.textContent = action.label; b.onclick = function () { hideToast(); action.fn(); }; } else { b.hidden = true; b.onclick = null; }
    try { if (toastEl.showPopover && !toastEl.matches(':popover-open')) toastEl.showPopover(); } catch (e) { /* без popover */ }
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(hideToast, action ? 5200 : 2600);
  }
  function hideToast() {
    toastEl.classList.remove('show');
    setTimeout(function () { if (!toastEl.classList.contains('show')) { try { if (toastEl.hidePopover) toastEl.hidePopover(); } catch (e) { /* ок */ } } }, 400);
  }

  /* ---------- шаблоны карточек ---------- */
  function priceHtml(p) {
    return '<p class="price"><span><span class="price-v">' + fmt(p.price) + '</span><span class="price-c">' + NB + 'сом.</span></span><span class="price-u">' + esc(p.unit) + '</span></p>';
  }
  function stepCtl(id, name, qty) {
    return '<div class="step" role="group" aria-label="Количество: ' + esc(name) + '"><button type="button" data-dec="' + id + '" aria-label="Меньше">' + ic('minus') + '</button>' +
      '<output class="step-n">' + (qty || 1) + '</output><button type="button" data-inc="' + id + '" aria-label="Больше">' + ic('plus') + '</button></div>';
  }
  function addCtl(p) {
    return '<button class="add" type="button" data-add="' + p.id + '" aria-label="В корзину: ' + esc(p.name) + '">' + ic('plus') + '</button>' + stepCtl(p.id, p.name);
  }
  function badgeHtml(p) { return p.hit ? '<span class="badge">Хит</span>' : (p.isNew ? '<span class="badge badge-new">Новинка</span>' : ''); }
  function card(p, i) {
    return '<li class="card" data-id="' + p.id + '" data-qty="0" style="--i:' + Math.min(i, 8) + '">' +
      '<div class="card-media" data-open="' + p.id + '"><img src="' + photo(p.photo, 600) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async" width="600" height="750" style="object-position:' + (p.pos || '50% 50%') + '">' + badgeHtml(p) + '</div>' +
      '<div class="card-body"><h3 class="card-name"><button type="button" class="card-open" data-open="' + p.id + '">' + esc(p.name) + '</button></h3>' +
      '<p class="card-desc">' + esc(p.desc) + '</p><div class="card-foot">' + priceHtml(p) + addCtl(p) + '</div></div></li>';
  }
  function tile(p, i) {
    return '<article class="tile tile-' + (i + 1) + '" data-id="' + p.id + '" data-qty="0" data-open="' + p.id + '">' +
      '<img src="' + photo(p.photo, i === 0 ? 1000 : 700) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async" style="object-position:' + (p.pos || '50% 50%') + '">' +
      '<div class="tile-body"><span class="badge">Новинка</span><h3 class="tile-t">' + esc(p.name) + '</h3><p class="tile-d">' + esc(p.desc) + '</p>' +
      '<div class="tile-foot">' + priceHtml(p) + addCtl(p) + '</div></div></article>';
  }

  /* ---------- корзина ---------- */
  var cart = { items: [], promo: '' }, promoMsg = null, lastRemoved = null;
  function loadCart() {
    var c = store('melty.cart.v1');
    if (c && Array.isArray(c.items)) {
      cart.items = c.items.filter(function (i) { return i && i.qty > 0 && (P[i.id] || (i.c && i.c.price > 0)); });
      cart.promo = SITE.promo[c.promo] ? c.promo : '';
    }
  }
  function saveCart() { store('melty.cart.v1', cart); }
  function findItem(id) { for (var i = 0; i < cart.items.length; i++) if (cart.items[i].id === id) return cart.items[i]; return null; }
  function qtyOf(id) { var it = findItem(id); return it ? it.qty : 0; }
  function unitPrice(it) { return it.c ? it.c.price : P[it.id].price; }
  function itemName(it) { return it.c ? it.c.name : P[it.id].name; }
  function subtotal() { return cart.items.reduce(function (s, i) { return s + unitPrice(i) * i.qty; }, 0); }
  function cartCount() { return cart.items.reduce(function (s, i) { return s + i.qty; }, 0); }
  function hasCake() { return cart.items.some(function (i) { return !!i.c; }); }
  function discount() { return Math.round(subtotal() * (SITE.promo[cart.promo] || 0)); }

  function setQty(id, q) {
    var it = findItem(id);
    q = Math.min(q, 20);
    if (!it) return;
    if (q <= 0) { lastRemoved = { it: it, idx: cart.items.indexOf(it) }; cart.items.splice(cart.items.indexOf(it), 1); }
    else it.qty = q;
    afterCart();
  }
  function addItem(id, custom) {
    var it = findItem(id);
    if (it) it.qty = Math.min(it.qty + 1, 20); else cart.items.push(custom ? { id: id, qty: 1, c: custom } : { id: id, qty: 1 });
    afterCart(true);
  }
  function afterCart(bump) {
    saveCart(); syncUI();
    if (bump && !RM) $('#cartCount').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.23,1,.32,1)' });
  }

  function syncUI() {
    var n = cartCount(), sum = subtotal();
    $('#cartCount').textContent = n; $('#cartCount').dataset.n = n;
    $('#cartSum').textContent = n ? money(sum) : 'Корзина';
    $('#cartBtn').setAttribute('aria-label', n ? 'Корзина: ' + n + ' шт. на ' + money(sum) : 'Корзина пуста');
    $$('[data-id]').forEach(function (el) {
      var q = qtyOf(el.dataset.id); el.dataset.qty = q;
      var o = $('.step-n', el); if (o) o.textContent = q || 1;
    });
    renderCart();
  }

  /* окно корзины */
  function renderCart() {
    var body = $('#cartBody'), foot = $('#cartFoot'), ae = document.activeElement, sel = null;
    if (ae && ae.closest && ae.closest('#cartDlg')) {
      if (ae.dataset.inc) sel = '[data-inc="' + ae.dataset.inc + '"]'; else if (ae.dataset.dec) sel = '[data-dec="' + ae.dataset.dec + '"]';
    }
    if (!cart.items.length) {
      body.innerHTML = '<div class="cart-empty">' + ic('bag') + '<b>Пока пусто</b><p>Начните с хитов — их разбирают первыми.</p><button class="btn btn-dark" type="button" data-go="#hits">Выбрать десерты</button></div>';
      foot.hidden = true; return;
    }
    foot.hidden = false;
    body.innerHTML = cart.items.map(function (it) {
      var p = it.c ? null : P[it.id];
      var im = p ? '<img src="' + photo(p.photo, 200) + '" alt="" loading="lazy" style="object-position:' + (p.pos || '50% 50%') + '">' : ic('cake');
      var sub = it.c ? it.c.desc : p.unit;
      return '<div class="ci"><div class="ci-img"' + (it.c ? ' style="background:' + it.c.glaze + '"' : '') + '>' + im + '</div>' +
        '<div><p class="ci-n">' + esc(itemName(it)) + '</p><p class="ci-d">' + esc(sub) + '</p><p class="ci-p">' + money(unitPrice(it) * it.qty) + '</p></div>' +
        '<div class="ci-r"><button class="ci-x" type="button" data-rm="' + it.id + '" aria-label="Удалить: ' + esc(itemName(it)) + '">' + ic('trash') + '</button>' +
        stepCtl(it.id, itemName(it), it.qty) + '</div></div>';
    }).join('');

    var sub = subtotal(), disc = discount(), base = sub - disc, left = Math.max(0, SITE.freeFrom - base);
    foot.innerHTML =
      '<div class="cf-ship"><p>' + (left > 0 ? 'Ещё ' + money(left) + ' до бесплатной доставки' : 'Доставка бесплатная') + '</p>' +
      '<div class="calc-bar" aria-hidden="true"><span style="--p:' + Math.min(1, base / SITE.freeFrom).toFixed(3) + '"></span></div></div>' +
      '<form class="cf-promo" data-promo novalidate><input id="promoIn" aria-label="Промокод" placeholder="Промокод" value="' + esc(cart.promo) + '" autocomplete="off"><button class="btn btn-ghost btn-s" type="submit">Применить</button></form>' +
      '<p class="cf-msg' + (promoMsg ? ' ' + promoMsg.cls : '') + '" role="status">' + (promoMsg ? esc(promoMsg.text) : '') + '</p>' +
      '<div class="cf-row"><span>Товары</span><span>' + money(sub) + '</span></div>' +
      (disc ? '<div class="cf-row disc"><span>Скидка ' + esc(cart.promo) + '</span><span>−' + money(disc) + '</span></div>' : '') +
      '<div class="cf-row total"><span>Итого</span><b>' + money(base) + '</b></div>' +
      '<button class="btn btn-dark" type="button" data-checkout>Оформить заказ ' + ic('arrow-right') + '</button>';
    if (sel) { var n = $(sel, $('#cartDlg')); if (n) n.focus(); }
  }

  function applyPromo(code) {
    code = (code || '').replace(/^\s+|\s+$/g, '').toUpperCase();
    if (!code) { cart.promo = ''; promoMsg = null; }
    else if (SITE.promo[code]) { cart.promo = code; promoMsg = { cls: 'ok', text: 'Промокод применён: −' + Math.round(SITE.promo[code] * 100) + '%' }; }
    else { cart.promo = ''; promoMsg = { cls: 'bad', text: 'Такого промокода нет. Попробуйте MELTY10.' }; }
    saveCart(); renderCart();
  }

  /* ---------- карточка товара ---------- */
  function openProduct(id) {
    var p = P[id]; if (!p) return;
    $('#prodBody').innerHTML =
      '<button class="icon-btn m-x" type="button" data-close aria-label="Закрыть">' + ic('x') + '</button>' +
      '<div class="pd" data-id="' + id + '" data-qty="' + qtyOf(id) + '">' +
      '<div class="pd-img"><img src="' + photo(p.photo, 1000) + '" alt="' + esc(p.name) + '" style="object-position:' + (p.pos || '50% 50%') + '">' + badgeHtml(p) + '</div>' +
      '<div class="pd-body"><h2 class="pd-name" id="pdName">' + esc(p.name) + '</h2><p class="pd-desc">' + esc(p.desc) + '</p>' +
      '<dl class="pd-meta"><div><dt>Вес</dt><dd>' + esc(p.weight) + '</dd></div><div><dt>Состав</dt><dd>' + esc(p.comp) + '</dd></div><div><dt>Аллергены</dt><dd>' + esc(p.allergens) + '</dd></div></dl>' +
      '<div class="pd-buy">' + priceHtml(p) + '<div class="pd-act"><button class="btn btn-dark pd-add" type="button" data-add="' + id + '">В корзину</button>' +
      stepCtl(id, p.name) + '<button class="btn btn-ghost pd-cart" type="button" data-cart>Корзина</button></div></div></div></div>';
    syncUI();
    openDlg($('#prodDlg'));
  }

  /* ---------- глазурь-тема ---------- */
  var heroApi;
  function setGlaze(k, animate) {
    if (!GLAZES[k]) k = 'strawberry';
    root.setAttribute('data-glaze', k);
    try { localStorage.setItem('melty.glaze', k); } catch (e) { /* ок */ }
    $('meta[name="theme-color"]').setAttribute('content', GLAZES[k].color);
    $('#glazeName').textContent = GLAZES[k].name;
    $$('.sw').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.g === k)); });
    if (animate && heroApi && !RM) heroApi.repour();
  }
  function initHero() {
    heroApi = Cake.mount($('#heroCake'), {
      uid: 'h', pour: true, label: 'Торт, залитый глазурью. Цвет глазури можно выбрать ниже.',
      state: { sponge: 'chocolate', cream: 'vanilla', glaze: 'theme', topping: 'berries', tiers: 1, text: 'Тает!' }
    });
    $('#glazePicker').innerHTML = Object.keys(GLAZES).map(function (k) {
      return '<button class="sw" type="button" data-g="' + k + '" style="--c:' + GLAZES[k].color + '" aria-pressed="false" aria-label="Глазурь «' + GLAZES[k].name + '»" title="' + GLAZES[k].name + '"></button>';
    }).join('');
    $('#glazePicker').addEventListener('click', function (e) { var b = e.target.closest('.sw'); if (b) setGlaze(b.dataset.g, true); });
    setGlaze(root.getAttribute('data-glaze'), false);
  }

  /* ---------- категории, хиты, новинки, меню ---------- */
  var menu = { cat: 'all', q: '' };
  function renderCats() {
    var counts = {}; PRODUCTS.forEach(function (p) { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    $('#catsRow').innerHTML = CATS.map(function (c) {
      return '<li><a class="cat" href="#menu" data-cat="' + c.id + '"><span class="cat-img"><img src="' + photo(c.photo, 300) + '" alt="" loading="lazy" decoding="async" style="object-position:' + c.pos + '"></span>' +
        '<span class="cat-name">' + c.name + '</span><span class="cat-n">' + counts[c.id] + ' поз.</span></a></li>';
    }).join('') +
      '<li><a class="cat" href="#builder"><span class="cat-img"><img src="' + photo('g-drip-pink', 300) + '" alt="" loading="lazy" decoding="async"></span><span class="cat-name">Торт на заказ</span><span class="cat-n">соберите сами</span></a></li>';
    $('#footCats').innerHTML = CATS.map(function (c) { return '<li><a href="#menu" data-cat="' + c.id + '">' + c.name + '</a></li>'; }).join('');
  }
  function renderHits() {
    $('#hitsTrack').innerHTML = PRODUCTS.filter(function (p) { return p.hit; }).map(card).join('');
  }
  function renderNew() {
    $('#newBento').innerHTML = PRODUCTS.filter(function (p) { return p.isNew; }).slice(0, 4).map(tile).join('');
  }
  function renderTabs() {
    var tabs = [{ id: 'all', name: 'Всё меню', n: PRODUCTS.length }].concat(CATS.map(function (c) { return { id: c.id, name: c.name, n: PRODUCTS.filter(function (p) { return p.cat === c.id; }).length }; }));
    $('#menuTabs').innerHTML = tabs.map(function (t) {
      return '<button class="tab" type="button" data-tab="' + t.id + '" aria-pressed="' + (menu.cat === t.id) + '">' + t.name + ' <small>' + t.n + '</small></button>';
    }).join('');
  }
  function renderMenu() {
    var q = norm(menu.q.replace(/^\s+|\s+$/g, ''));
    var list = PRODUCTS.filter(function (p) {
      return (menu.cat === 'all' || p.cat === menu.cat) && (!q || norm(p.name + ' ' + p.desc + ' ' + p.comp).indexOf(q) > -1);
    });
    $('#menuGrid').innerHTML = list.map(card).join('');
    $('#menuEmpty').hidden = list.length > 0;
    $('#emptyQ').textContent = menu.q;
    syncUI();
  }
  function setMenu(cat, q) {
    menu.cat = cat; if (q !== undefined) { menu.q = q; $('#menuSearch').value = q; }
    renderTabs(); renderMenu();
  }

  /* дорожки со стрелками */
  function wireTrack(track, prev, next) {
    function step() { return Math.max(260, track.clientWidth * .8); }
    function upd() { prev.disabled = track.scrollLeft < 8; next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8; }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: RM ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: RM ? 'auto' : 'smooth' }); });
    track.addEventListener('scroll', raf(upd), { passive: true });
    window.addEventListener('resize', raf(upd)); upd();
  }

  /* ---------- вкусы ---------- */
  function renderFlavors() {
    $('#flGrid').innerHTML = FLAVORS.map(function (f) {
      return '<li class="fl rv"><div class="fl-img"><img src="' + photo(f.photo, 600) + '" alt="' + f.name + '" loading="lazy" decoding="async" style="object-position:' + f.pos + '"></div>' +
        '<h3 class="fl-name">' + f.name + '</h3><p class="fl-text">' + f.text + '</p>' +
        '<button class="btn btn-glaze btn-s" type="button" data-flavor="' + f.id + '">Залить торт</button></li>';
    }).join('');
  }

  /* ---------- конструктор торта ---------- */
  var SP_TXT = { vanilla: 'ванильный бисквит', chocolate: 'шоколадный бисквит', velvet: 'бисквит «Красный бархат»', carrot: 'морковный бисквит' };
  var CR_TXT = { vanilla: 'сливочный крем', mascarpone: 'крем маскарпоне', ganache: 'шоколадный ганаш', pistachio: 'фисташковый крем', berry: 'ягодный крем' };
  var b = { size: '1', sponge: 'chocolate', cream: 'mascarpone', glaze: 'strawberry', topping: 'berries', text: '' }, bApi;

  function optBtn(group, o, extra) {
    return '<button class="opt" type="button" role="radio" aria-checked="false" data-g="' + group + '" data-v="' + o.id + '">' +
      (o.color ? '<span class="opt-dot" style="--c:' + o.color + '"></span>' : '') + o.label + (extra ? ' <small>' + extra + '</small>' : '') + '</button>';
  }
  function renderBuilder() {
    var B = BUILDER;
    $('#bSteps').innerHTML =
      '<fieldset class="b-step"><legend>Размер <small>вес торта</small></legend><div class="opts" role="radiogroup" aria-label="Размер">' + B.sizes.map(function (o) { return optBtn('size', o, o.note); }).join('') + '</div></fieldset>' +
      '<fieldset class="b-step"><legend>Бисквит</legend><div class="opts" role="radiogroup" aria-label="Бисквит">' + B.sponges.map(function (o) { return optBtn('sponge', o); }).join('') + '</div></fieldset>' +
      '<fieldset class="b-step"><legend>Крем</legend><div class="opts" role="radiogroup" aria-label="Крем">' + B.creams.map(function (o) { return optBtn('cream', o, o.add ? '+' + o.add + ' сом./кг' : ''); }).join('') + '</div></fieldset>' +
      '<fieldset class="b-step"><legend>Глазурь <small>на вкусах Таджикистана</small></legend><div class="opts" role="radiogroup" aria-label="Глазурь">' + B.glazes.map(function (o) { return optBtn('glaze', o, o.price ? '+' + o.price : ''); }).join('') + '</div></fieldset>' +
      '<fieldset class="b-step"><legend>Декор</legend><div class="opts" role="radiogroup" aria-label="Декор">' + B.toppings.map(function (o) { return optBtn('topping', o, o.price ? '+' + o.price : ''); }).join('') + '</div></fieldset>' +
      '<fieldset class="b-step"><legend><label for="bText">Надпись</label> <small>на флажке, до 24 символов</small></legend><input class="inp" id="bText" maxlength="24" placeholder="Например: С днём рождения, Мадина!" autocomplete="off"></fieldset>';
    $('#bSteps').addEventListener('click', function (e) { var o = e.target.closest('.opt'); if (o) { b[o.dataset.g] = o.dataset.v; bUpdate(); } });
    $('#bText').addEventListener('input', function (e) { b.text = e.target.value; bUpdate(); });
    bApi = Cake.mount($('#bCake'), { uid: 'b', label: 'Ваш торт: превью конструктора' });
    var seen = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, ob) { if (es[0].isIntersecting && !seen) { seen = true; if (!RM) bApi.pour(); ob.disconnect(); } }, { threshold: .35 }).observe($('#bCake'));
    }
    bUpdate();
  }
  function bCalc() {
    var s = pick(BUILDER.sizes, b.size), sp = pick(BUILDER.sponges, b.sponge), cr = pick(BUILDER.creams, b.cream), gl = pick(BUILDER.glazes, b.glaze), tp = pick(BUILDER.toppings, b.topping);
    var price = Math.round(s.kg * (sp.price + cr.add) + gl.price + tp.price);
    var parts = [SP_TXT[sp.id], CR_TXT[cr.id], gl.id === 'none' ? 'без глазури' : 'глазурь «' + gl.label + '»', tp.id === 'none' ? 'без декора' : tp.label.toLowerCase()];
    var t = b.text.replace(/^\s+|\s+$/g, ''); if (t) parts.push('надпись «' + t + '»');
    return { s: s, price: price, parts: parts, gl: gl };
  }
  function bUpdate() {
    var c = bCalc();
    $$('#bSteps .opt').forEach(function (o) { o.setAttribute('aria-checked', String(b[o.dataset.g] === o.dataset.v)); });
    bApi.set({ sponge: b.sponge, cream: b.cream, glaze: b.glaze, topping: b.topping, tiers: c.s.tiers, text: b.text });
    $('#bPrice').textContent = money(c.price);
    $('#bNote').textContent = c.s.kg.toString().replace('.', ',') + ' кг · ' + c.s.note;
    $('#bLine').textContent = c.s.label + ' · ' + c.parts.join(' · ');
  }
  function bAddToCart() {
    var c = bCalc();
    addItem('cake-' + Date.now().toString(36), { name: 'Торт на заказ, ' + c.s.label, desc: c.parts.join(' · '), price: c.price, glaze: c.gl.color || '#FFE3EA' });
    toast('Торт добавлен. Готовим за 24 часа', { label: 'Корзина', fn: openCart });
  }

  /* ---------- калькулятор доставки ---------- */
  var dz = { d: 'ismoili', sum: 200 };
  function renderDelivery() {
    $('#dzChips').innerHTML = DISTRICTS.map(function (d) {
      return '<button class="dz" type="button" role="radio" aria-checked="false" data-dz="' + d.id + '"><b>' + d.name + '</b><small>от ' + d.fee + ' сом. · ' + d.eta[0] + '–' + d.eta[1] + ' мин</small></button>';
    }).join('');
    $('#dzChips').addEventListener('click', function (e) { var x = e.target.closest('.dz'); if (x) { dz.d = x.dataset.dz; dzUpdate(); } });
    $('#dzSum').addEventListener('input', function (e) { dz.sum = +e.target.value; dzUpdate(); });
    dzUpdate();
  }
  function dzUpdate() {
    var d = pick(DISTRICTS, dz.d), free = dz.sum >= SITE.freeFrom, t = nowMin() % 1440, ok = t >= 9 * 60 && t <= 20 * 60 + 15;
    $$('#dzChips .dz').forEach(function (x) { x.setAttribute('aria-checked', String(x.dataset.dz === dz.d)); });
    $('#dzSumOut').textContent = money(dz.sum);
    $('#dzFee').textContent = free ? 'Бесплатно' : money(d.fee);
    $('#dzEta').textContent = d.eta[0] + '–' + d.eta[1] + ' мин';
    $('#dzBar').style.setProperty('--p', Math.min(1, dz.sum / SITE.freeFrom).toFixed(3));
    $('#dzLeft').textContent = free ? 'Доставка бесплатная' : 'Добавьте ещё ' + money(SITE.freeFrom - dz.sum) + ' — и доставка станет бесплатной';
    var arrive = Math.ceil((t + d.eta[1]) / 5) * 5;
    $('#dzNext').textContent = ok ? 'Оформите сейчас — привезём к ' + hhmm(arrive) : 'Ближайшая доставка — ' + (t < 9 * 60 ? 'сегодня' : 'завтра') + ' с 09:00';
  }

  /* ---------- отзывы, блог, галерея ---------- */
  function stars(n) { var s = ''; for (var i = 0; i < 5; i++) s += '<svg class="ic" style="opacity:' + (i < n ? 1 : .25) + '" aria-hidden="true"><use href="#i-star"/></svg>'; return s; }
  function renderReviews() {
    $('.rev-score .stars').innerHTML = stars(5);
    $('#revTrack').innerHTML = REVIEWS.map(function (r) {
      return '<li><article class="rev"><div class="rev-h"><span class="rev-ava" aria-hidden="true">' + r.name.charAt(0) + '</span><div><span class="rev-name">' + r.name + '</span><span class="rev-date">' + r.date + '</span></div>' +
        '<span class="stars" role="img" aria-label="Оценка ' + r.rating + ' из 5">' + stars(r.rating) + '</span></div><p class="rev-text">' + r.text + '</p><span class="rev-item">' + r.item + '</span></article></li>';
    }).join('');
  }
  function renderJournal() {
    $('#jGrid').innerHTML = JOURNAL.map(function (a) {
      return '<li class="j-card rv"><div class="j-img"><img src="' + photo(a.photo, 700) + '" alt="" loading="lazy" decoding="async" style="object-position:' + a.pos + '"></div>' +
        '<p class="j-date">' + a.date + '</p><h3 class="j-t"><button type="button" data-art="' + a.id + '">' + a.title + '</button></h3><p class="j-teaser">' + a.teaser + '</p>' +
        '<span class="j-more">Читать ' + ic('arrow-right') + '</span></li>';
    }).join('');
  }
  function openArticle(id) {
    var a = JOURNAL.filter(function (x) { return x.id === id; })[0]; if (!a) return;
    var calc = id === 'portions'
      ? '<div class="art-calc"><label for="gCount">Сколько у вас гостей?</label><div class="art-calc-r"><input id="gCount" type="number" min="2" max="60" value="10" inputmode="numeric"><output id="gOut" for="gCount"></output></div><button class="btn btn-dark btn-s" type="button" data-to-builder>Собрать такой торт</button></div>' : '';
    $('#artBody').innerHTML = '<button class="icon-btn m-x" type="button" data-close aria-label="Закрыть">' + ic('x') + '</button><article class="art">' +
      '<div class="art-img"><img src="' + photo(a.photo, 900) + '" alt="" style="object-position:' + a.pos + '"></div><p class="art-date">' + a.date + '</p><h2 class="art-t" id="artT">' + a.title + '</h2><div class="art-b">' + a.body + '</div>' + calc + '</article>';
    openDlg($('#artDlg'));
    if (calc) { var inp = $('#gCount'); inp.addEventListener('input', gCalc); gCalc(); }
  }
  var gSize = '1';
  function gCalc() {
    var n = Math.max(2, Math.min(60, +$('#gCount').value || 2)), kg = Math.max(1, Math.ceil(n * .125 / .5) * .5), out = $('#gOut');
    if (kg > 3) { out.textContent = 'Для такой компании — два торта или звонок нам: подберём вместе'; gSize = '3'; return; }
    gSize = kg <= 1 ? '1' : kg <= 1.5 ? '1.5' : kg <= 2 ? '2' : '3';
    out.textContent = 'Хватит торта на ' + String(kg).replace('.', ',') + ' кг';
  }
  var galIdx = 0;
  function renderGallery() {
    $('#galGrid').innerHTML = GALLERY.map(function (g, i) {
      return '<button class="gi rv" type="button" data-gal="' + i + '" style="--d:' + (i % 3) * 70 + 'ms" aria-label="Открыть фото: ' + esc(g.cap) + '"><img src="' + photo(g.photo, 700) + '" alt="' + esc(g.cap) + '" loading="lazy" decoding="async" style="object-position:' + g.pos + '"></button>';
    }).join('');
  }
  function showPhoto(i) {
    galIdx = (i + GALLERY.length) % GALLERY.length;
    var g = GALLERY[galIdx];
    $('#lbImg').src = photo(g.photo, 1400); $('#lbImg').alt = g.cap; $('#lbCap').textContent = g.cap;
    openDlg($('#lbDlg'));
  }

  /* ---------- контакты ---------- */
  var locId = LOCATIONS[0].id;
  function mapSrc(l) {
    var dx = .011, dy = .0065;
    return 'https://www.openstreetmap.org/export/embed.html?bbox=' + [l.lon - dx, l.lat - dy, l.lon + dx, l.lat + dy].join('%2C') + '&layer=mapnik&marker=' + l.lat + '%2C' + l.lon;
  }
  function renderLocs() {
    $('#locList').innerHTML = LOCATIONS.map(function (l) {
      return '<button class="loc" type="button" role="radio" aria-checked="false" data-loc="' + l.id + '"><b>' + l.name + '</b><span class="loc-a">' + l.addr + ' · ' + l.area + '</span><span class="loc-h">' + l.hours + '. ' + l.note + '</span><span class="loc-ar">На карте</span></button>';
    }).join('');
    $('#locList').addEventListener('click', function (e) { var x = e.target.closest('.loc'); if (x) { locId = x.dataset.loc; locUpdate(); } });
    locUpdate();
  }
  function locUpdate() {
    $$('#locList .loc').forEach(function (x) { x.setAttribute('aria-checked', String(x.dataset.loc === locId)); });
    var src = mapSrc(pick(LOCATIONS, locId)); if ($('#map').getAttribute('src') !== src) $('#map').setAttribute('src', src);
  }

  /* ---------- формы ---------- */
  function fieldErr(input, errEl, msg) {
    if (msg) { errEl.textContent = msg; errEl.hidden = false; input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', errEl.id); }
    else { errEl.hidden = true; input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    return !!msg;
  }
  function telOk(v) { return v.replace(/[^0-9]/g, '').length >= 9; }

  function initB2B() {
    var f = $('#b2bForm');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('#b2bName'), t = $('#b2bTel');
      var e1 = fieldErr(n, $('#b2bNameE'), n.value.replace(/^\s+|\s+$/g, '').length < 2 ? 'Укажите, как к вам обращаться' : '');
      var e2 = fieldErr(t, $('#b2bTelE'), !telOk(t.value) ? 'Введите номер телефона полностью: не меньше 9 цифр' : '');
      if (e1) { n.focus(); return; } if (e2) { t.focus(); return; }
      var btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
      setTimeout(function () { btn.disabled = false; f.reset(); $('#b2bOk').hidden = false; }, 500);
    });
    ['b2bName', 'b2bTel'].forEach(function (id) { $('#' + id).addEventListener('input', function () { fieldErr(this, $('#' + id + 'E'), ''); $('#b2bOk').hidden = true; }); });
  }

  /* оформление заказа */
  var co = { mode: 'delivery' };
  function timeOptions() {
    var t = nowMin() % 1440, cake = hasCake(), o = [];
    if (!cake && t >= 9 * 60 && t <= 20 * 60 + 15) o.push('Как можно скорее (45–60 минут)');
    if (!cake) for (var h = Math.max(10, Math.ceil((t + 60) / 60)); h <= 19; h += 2) o.push('Сегодня, ' + pad(h) + ':00–' + pad(Math.min(h + 2, 21)) + ':00');
    o.push('Завтра, 10:00–13:00', 'Завтра, 13:00–16:00', 'Завтра, 16:00–19:00');
    return o;
  }
  function coTotals() {
    var sub = subtotal(), disc = discount(), after = sub - disc, pick5 = co.mode === 'pickup' ? Math.round(after * SITE.pickupDiscount) : 0;
    var d = $('#coDist') && $('#coDist').value ? pick(DISTRICTS, $('#coDist').value) : null, ship = 0, shipTxt = '';
    if (co.mode === 'delivery') {
      if (after >= SITE.freeFrom) { ship = 0; shipTxt = 'бесплатно'; }
      else if (d) { ship = d.fee; shipTxt = money(d.fee); }
      else shipTxt = 'выберите район';
    }
    return { sub: sub, disc: disc, pick5: pick5, ship: ship, shipTxt: shipTxt, total: after - pick5 + ship, after: after };
  }
  function coSum() {
    var t = coTotals();
    $('#coSum').innerHTML = '<div class="cf-row"><span>Товары</span><span>' + money(t.sub) + '</span></div>' +
      (t.disc ? '<div class="cf-row disc"><span>Скидка ' + esc(cart.promo) + '</span><span>−' + money(t.disc) + '</span></div>' : '') +
      (t.pick5 ? '<div class="cf-row disc"><span>Самовывоз −5%</span><span>−' + money(t.pick5) + '</span></div>' : '') +
      (co.mode === 'delivery' ? '<div class="cf-row"><span>Доставка</span><span>' + t.shipTxt + '</span></div>' : '') +
      '<div class="cf-row total"><span>К оплате при получении</span><b>' + money(t.total) + '</b></div>';
  }
  function openCheckout() {
    if (!cart.items.length) return;
    co.mode = 'delivery';
    $('#coBody').innerHTML = '<button class="icon-btn m-x" type="button" data-close aria-label="Закрыть">' + ic('x') + '</button>' +
      '<form class="co" id="coForm" novalidate><h2 class="co-t" id="coT">Оформление заказа</h2>' +
      '<div class="seg" role="radiogroup" aria-label="Способ получения"><button class="opt" type="button" role="radio" aria-checked="true" data-mode="delivery">Доставка</button><button class="opt" type="button" role="radio" aria-checked="false" data-mode="pickup">Самовывоз −5%</button></div>' +
      '<div class="fld"><label for="coName">Имя <span aria-hidden="true">*</span></label><input id="coName" autocomplete="name" required><p class="err" id="coNameE" hidden></p></div>' +
      '<div class="fld"><label for="coTel">Телефон <span aria-hidden="true">*</span></label><input id="coTel" type="tel" inputmode="tel" autocomplete="tel" placeholder="+992" required><p class="err" id="coTelE" hidden></p></div>' +
      '<div data-del><div class="fld"><label for="coDist">Район <span aria-hidden="true">*</span></label><select id="coDist"><option value="">Выберите район</option>' + DISTRICTS.map(function (d) { return '<option value="' + d.id + '">' + d.name + ' — от ' + d.fee + ' сом.</option>'; }).join('') + '</select><p class="err" id="coDistE" hidden></p></div>' +
      '<div class="fld" style="margin-top:16px"><label for="coAddr">Адрес <span aria-hidden="true">*</span></label><input id="coAddr" autocomplete="street-address" placeholder="Улица, дом, квартира"><p class="err" id="coAddrE" hidden></p></div></div>' +
      '<div data-pick hidden><div class="fld"><label for="coLoc">Где заберёте</label><select id="coLoc">' + LOCATIONS.map(function (l) { return '<option>' + l.name + ' — ' + l.addr + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="fld"><label for="coTime">Когда</label><select id="coTime">' + timeOptions().map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></div>' +
      (hasCake() ? '<p class="cf-msg">В заказе торт на заказ: готовим 24 часа, поэтому доставим не раньше завтра.</p>' : '') +
      '<div class="fld"><label for="coNote">Комментарий</label><textarea id="coNote" rows="2" placeholder="Домофон, этаж, пожелания к торту"></textarea></div>' +
      '<div class="co-sum" id="coSum"></div><button class="btn btn-dark" type="submit">Подтвердить заказ</button><p class="cf-msg">Это демо: заказ никуда не отправляется.</p></form>';
    coSum();
    openDlg($('#coDlg'));
    var f = $('#coForm');
    f.addEventListener('click', function (e) {
      var m = e.target.closest('[data-mode]'); if (!m) return;
      co.mode = m.dataset.mode;
      $$('[data-mode]', f).forEach(function (x) { x.setAttribute('aria-checked', String(x === m)); });
      $('[data-del]', f).hidden = co.mode !== 'delivery'; $('[data-pick]', f).hidden = co.mode !== 'pickup'; coSum();
    });
    $('#coDist').addEventListener('change', coSum);
    f.addEventListener('submit', function (e) { e.preventDefault(); checkoutSubmit(); });
    ['coName', 'coTel', 'coAddr', 'coDist'].forEach(function (id) { var x = $('#' + id); x.addEventListener('input', function () { fieldErr(x, $('#' + id + 'E'), ''); }); });
  }
  function checkoutSubmit() {
    var name = $('#coName'), tel = $('#coTel'), bad = null, del = co.mode === 'delivery';
    function chk(input, id, msg) { var e = fieldErr(input, $('#' + id), msg); if (e && !bad) bad = input; }
    chk(name, 'coNameE', name.value.replace(/^\s+|\s+$/g, '').length < 2 ? 'Укажите имя' : '');
    chk(tel, 'coTelE', !telOk(tel.value) ? 'Введите номер телефона полностью: не меньше 9 цифр' : '');
    if (del) {
      chk($('#coDist'), 'coDistE', !$('#coDist').value ? 'Выберите район, чтобы посчитать доставку' : '');
      chk($('#coAddr'), 'coAddrE', $('#coAddr').value.replace(/^\s+|\s+$/g, '').length < 5 ? 'Укажите улицу и дом' : '');
      if (coTotals().after < SITE.minOrder && !bad) { toast('Минимальный заказ с доставкой — ' + money(SITE.minOrder)); bad = $('#coDist'); }
    }
    if (bad) { bad.focus(); return; }
    var t = coTotals(), num = 'MB-' + (1000 + Math.floor(Math.random() * 9000)), when = $('#coTime').value;
    $('#coBody').innerHTML = '<button class="icon-btn m-x" type="button" data-close aria-label="Закрыть">' + ic('x') + '</button>' +
      '<div class="co co-ok"><span class="ic-big">' + ic('check') + '</span><h2 class="co-t" id="coT">Заказ ' + num + ' принят</h2>' +
      '<p>Менеджер перезвонит на ' + esc(tel.value) + ' в течение 5 минут. ' + (del ? 'Время доставки: ' + esc(when.toLowerCase()) + '.' : 'Заберём к вашему приходу.') + '</p>' +
      '<div class="co-sum" style="width:100%"><div class="cf-row total"><span>К оплате при получении</span><b>' + money(t.total) + '</b></div></div>' +
      '<p class="cf-msg">Это демо: на самом деле заказ не отправлен.</p><button class="btn btn-dark" type="button" data-close>Вернуться на сайт</button></div>';
    cart.items = []; cart.promo = ''; promoMsg = null; afterCart();
  }

  /* ---------- поиск в шапке ---------- */
  var si = $('#searchInput'), sl = $('#searchList'), sIdx = -1;
  function sClose() { sl.hidden = true; si.setAttribute('aria-expanded', 'false'); sIdx = -1; si.removeAttribute('aria-activedescendant'); }
  function sSuggest() {
    var q = norm(si.value.replace(/^\s+|\s+$/g, ''));
    if (!q) return sClose();
    var res = PRODUCTS.filter(function (p) { return norm(p.name + ' ' + p.desc).indexOf(q) > -1; }).slice(0, 5);
    sl.innerHTML = res.length ? res.map(function (p, i) {
      return '<li role="option" id="sg-' + i + '" data-open="' + p.id + '" aria-selected="false"><img src="' + photo(p.photo, 120) + '" alt="" style="object-position:' + (p.pos || '50% 50%') + '"><span><b>' + esc(p.name) + '</b><small>' + money(p.price) + ' · ' + esc(p.unit) + '</small></span></li>';
    }).join('') : '<li class="sl-more" role="option" aria-selected="false">Ничего не найдено</li>';
    sl.hidden = false; si.setAttribute('aria-expanded', 'true'); sIdx = -1;
  }
  function sMove(d) {
    var items = $$('li[data-open]', sl); if (!items.length) return;
    sIdx = (sIdx + d + items.length) % items.length;
    items.forEach(function (x, i) { x.setAttribute('aria-selected', String(i === sIdx)); });
    si.setAttribute('aria-activedescendant', items[sIdx].id);
  }
  function initSearch() {
    si.addEventListener('input', sSuggest);
    $('#search').addEventListener('click', function (e) { if (e.target === this || e.target.closest('svg')) si.focus(); });
    si.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sMove(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sMove(-1); }
      else if (e.key === 'Escape') { sClose(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var sel = $$('li[data-open]', sl)[sIdx];
        if (sel) { sClose(); openProduct(sel.dataset.open); }
        else { var v = si.value; sClose(); setMenu('all', v); jump('#menu'); }
      }
    });
    sl.addEventListener('pointerdown', function (e) { e.preventDefault(); });
    document.addEventListener('click', function (e) { if (!e.target.closest('#search')) sClose(); });
    $('#searchToggle').addEventListener('click', function () { jump('#menu'); setTimeout(function () { $('#menuSearch').focus({ preventScroll: true }); }, RM ? 0 : 500); });
  }

  /* ---------- корзина: открыть ---------- */
  function openCart() { renderCart(); openDlg($('#cartDlg')); }

  /* ---------- делегирование кликов ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-add],[data-inc],[data-dec],[data-open],[data-rm],[data-close],[data-cat],[data-tab],[data-flavor],[data-gal],[data-art],[data-go],[data-checkout],[data-cart],[data-to-builder]');
    if (!t) return;
    var d = t.dataset;
    if (d.add) { addItem(d.add); toast('Добавлено: ' + P[d.add].name, { label: 'Корзина', fn: openCart }); }
    else if (d.inc) setQty(d.inc, qtyOf(d.inc) + 1);
    else if (d.dec) setQty(d.dec, qtyOf(d.dec) - 1);
    else if (d.rm !== undefined) {
      setQty(d.rm, 0);
      if (lastRemoved) toast('Удалено из корзины', { label: 'Вернуть', fn: function () { cart.items.splice(lastRemoved.idx, 0, lastRemoved.it); lastRemoved = null; afterCart(); } });
    }
    else if (d.open) { sClose(); openProduct(d.open); }
    else if (d.close !== undefined) { var dlg = t.closest('dialog'); if (dlg) closeDlg(dlg); }
    else if (d.cat) { setMenu(d.cat, ''); }
    else if (d.tab) setMenu(d.tab);
    else if (d.flavor) {
      setGlaze(d.flavor, true);
      if (BUILDER.glazes.some(function (g) { return g.id === d.flavor; })) { b.glaze = d.flavor; bUpdate(); if (!RM) bApi.pour(); }
      jump('#builder');
    }
    else if (d.gal !== undefined) showPhoto(+d.gal);
    else if (d.art) openArticle(d.art);
    else if (d.go) { var dg = t.closest('dialog'); if (dg) closeDlg(dg); jump(d.go); }
    else if (d.checkout !== undefined) { closeDlg($('#cartDlg')); setTimeout(openCheckout, RM ? 0 : 240); }
    else if (d.cart !== undefined) { closeDlg($('#prodDlg')); setTimeout(openCart, RM ? 0 : 200); }
    else if (d.toBuilder !== undefined) { b.size = gSize; bUpdate(); closeDlg($('#artDlg')); jump('#builder'); }
  });
  document.addEventListener('submit', function (e) { if (e.target.matches('[data-promo]')) { e.preventDefault(); applyPromo($('#promoIn').value); } });
  document.addEventListener('keydown', function (e) {
    var lb = $('#lbDlg');
    if (lb.open) { if (e.key === 'ArrowRight') showPhoto(galIdx + 1); else if (e.key === 'ArrowLeft') showPhoto(galIdx - 1); }
  });
  $('#lbPrev').addEventListener('click', function () { showPhoto(galIdx - 1); });
  $('#lbNext').addEventListener('click', function () { showPhoto(galIdx + 1); });
  $('#cartBtn').addEventListener('click', openCart);
  $('#navToggle').addEventListener('click', function () { openDlg($('#navDlg')); });
  $('#navDlg').addEventListener('click', function (e) { if (e.target.closest('a')) closeDlg($('#navDlg')); });
  $('#bAdd').addEventListener('click', bAddToCart);
  $('#emptyReset').addEventListener('click', function () { setMenu('all', ''); });
  var menuTimer; $('#menuSearch').addEventListener('input', function (e) { clearTimeout(menuTimer); var v = e.target.value; menuTimer = setTimeout(function () { menu.q = v; renderMenu(); }, 120); });

  /* ---------- появление, счётчики, шапка ---------- */
  function initReveal() {
    var els = $$('.rv');
    if (!('IntersectionObserver' in window)) { els.forEach(function (x) { x.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (x) { io.observe(x); });
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return; cio.unobserve(en.target);
        var el = en.target, to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0;
        if (RM) return;
        var t0 = performance.now();
        (function step(t) { var k = Math.min(1, (t - t0) / 1400), v = to * (1 - Math.pow(1 - k, 3)); el.textContent = v.toFixed(dec).replace('.', ','); if (k < 1) requestAnimationFrame(step); })(t0);
      });
    }, { threshold: .6 });
    $$('[data-count]').forEach(function (x) { cio.observe(x); });
  }
  function initNav() {
    var hdr = $('#hdr'), st = $('#sticker');
    var onScroll = raf(function () {
      hdr.classList.toggle('is-stuck', window.scrollY > 56);
      if (!RM && st) st.style.transform = 'rotate(' + (window.scrollY * .12).toFixed(1) + 'deg)';
    });
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    if (!('IntersectionObserver' in window)) return;
    var links = {}; $$('#nav a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { Object.keys(links).forEach(function (k) { links[k].classList.toggle('is-active', k === en.target.id); }); } });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (k) { var s = document.getElementById(k); if (s) obs.observe(s); });
  }

  /* ---------- запуск ---------- */
  $$('img[data-photo]').forEach(function (i) { i.src = photo(i.dataset.photo, +i.dataset.w || 800); });
  $('#statProducts').dataset.count = PRODUCTS.length; $('#statProducts').textContent = PRODUCTS.length;
  loadCart();
  initHero(); renderCats(); renderHits(); renderNew(); renderTabs(); renderMenu(); renderFlavors();
  renderBuilder(); renderDelivery(); renderReviews(); renderJournal(); renderGallery(); renderLocs();
  wireTrack($('#hitsTrack'), $('#hitsPrev'), $('#hitsNext')); wireTrack($('#revTrack'), $('#revPrev'), $('#revNext'));
  initB2B(); initSearch(); initNav(); initReveal();
  syncUI(); updateStatus(); setInterval(updateStatus, 30000);
})();
