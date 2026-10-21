/* Dorvan · плашка демо. Подключается только в демо-версиях (в проданном сайте файл удаляют).
   <script src="demo-kit.js" data-price="70" data-name="Жемчуг" defer></script>
   Что делает: полоска «Концепт» сверху, плашка «Пример за $N · Хочу такой» внизу (ссылка в Telegram с готовым текстом),
   подсказки вместо реальных звонков/мессенджеров у ссылок с атрибутом data-demo="Telegram".
   ?og=1 — спрятать всё (для снимка превью-картинки). */
(function () {
  var s = document.currentScript || document.querySelector('script[data-price]');
  var price = s.getAttribute('data-price'), name = s.getAttribute('data-name');
  var qs = new URLSearchParams(location.search);
  if (qs.has('og')) { document.documentElement.classList.add('is-og'); return; }

  var text = 'Хочу сайт за $' + price + ', как «' + name + '»';
  var href = 'https://t.me/dorvan_tj?text=' + encodeURIComponent(text);

  var css = '' +
    '.dk-strip{position:relative;z-index:60;background:#14141a;color:#e9e9ee;font:500 12px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:center;padding:8px 14px;letter-spacing:.01em}' +
    '.dk-strip b{color:#ffd84d;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-right:6px}' +
    '.dk-plate{position:fixed;left:50%;bottom:calc(12px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 24px);' +
    'padding:6px 6px 6px 16px;border-radius:999px;background:rgba(18,18,24,.94);color:#fff;text-decoration:none;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);' +
    'box-shadow:0 10px 32px rgba(0,0,0,.30),0 0 0 1px rgba(255,255,255,.10);font:600 14px/1.1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;white-space:nowrap;transition:transform .2s ease,box-shadow .2s ease}' +
    '.dk-plate:hover{transform:translateX(-50%) translateY(-2px);box-shadow:0 14px 36px rgba(0,0,0,.36),0 0 0 1px rgba(255,255,255,.18)}' +
    '.dk-plate:focus-visible{outline:3px solid #ffd84d;outline-offset:3px}' +
    '.dk-plate small{font:600 11px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#9a9aa8;padding-right:10px;border-right:1px solid rgba(255,255,255,.16)}' +
    '.dk-plate span{color:#d9d9e2;font-weight:500}' +
    '.dk-plate em{font-style:normal;display:inline-flex;align-items:center;gap:8px;background:#ffd84d;color:#14141a;border-radius:999px;padding:11px 16px;font-weight:700}' +
    '.dk-plate em svg{width:16px;height:16px;transition:transform .2s ease}.dk-plate:hover em svg{transform:translateX(3px)}' +
    '.dk-toast{position:fixed;left:50%;bottom:calc(82px + env(safe-area-inset-bottom,0px));transform:translate(-50%,12px);z-index:2147483001;background:#fff;color:#14141a;border-radius:14px;padding:12px 16px;max-width:min(92vw,420px);' +
    'font:500 14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 12px 36px rgba(0,0,0,.28);opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s ease;text-align:center}' +
    '.dk-toast.on{opacity:1;transform:translate(-50%,0)}' +
    'body{padding-bottom:84px}' +
    '@media (max-width:520px){.dk-plate small{display:none}.dk-plate{padding-left:14px;gap:8px;font-size:13px}.dk-plate em{padding:10px 13px}}' +
    '@media (prefers-reduced-motion:reduce){.dk-plate,.dk-toast,.dk-plate em svg{transition:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var strip = document.createElement('div');
  strip.className = 'dk-strip'; strip.setAttribute('role', 'note');
  strip.innerHTML = '<b>Концепт</b>название, цены, адрес и контакты вымышлены';
  document.body.insertBefore(strip, document.body.firstChild);

  var plate = document.createElement('a');
  plate.className = 'dk-plate'; plate.href = href; plate.target = '_blank'; plate.rel = 'noopener';
  plate.setAttribute('aria-label', 'Пример за $' + price + '. Хочу такой сайт — написать в Telegram');
  plate.innerHTML = '<small>Dorvan</small><span>Пример за $' + price + '</span>' +
    '<em>Хочу такой<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></em>';
  document.body.appendChild(plate);

  var toast = document.createElement('div');
  toast.className = 'dk-toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  var t;
  function say(msg) {
    toast.textContent = msg; toast.classList.add('on');
    clearTimeout(t); t = setTimeout(function () { toast.classList.remove('on'); }, 3600);
  }
  window.DK = { say: say, href: href };

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-demo]');
    if (!a) return;
    e.preventDefault();
    say('Это пример: здесь откроется ' + a.getAttribute('data-demo') + ' вашего бизнеса.');
  });
})();
