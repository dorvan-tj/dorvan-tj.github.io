/* Dorvan — раздел «Работы»: лист работы (<dialog id="work-sheet">). Разметку и <template id="w-<id>"> пишет gen-works.py.
   Без JavaScript карточка — обычная ссылка на демо. Со скриптом нажатие открывает лист: содержимое берётся из шаблона
   (картинки шаблона не грузятся, пока лист не открыт), переход карточка → лист — View Transitions, где браузер умеет и включено движение;
   иначе лист поднимается и проявляется (CSS), а при prefers-reduced-motion и на слабых устройствах (html.lite) — без перехода.
   Закрытие: крестик, Esc, нажатие на фон; фокус возвращается на карточку; страница под листом не прокручивается и не прыгает.
   «Хочу похожее решение» в листе — обычная кнопка [data-order]: лист закрывается сразу, остальное делает js/order.js. */
(() => {
  'use strict';
  const sheet = document.getElementById('work-sheet'), grid = document.querySelector('.work__grid');
  if (!sheet || !grid || typeof sheet.showModal !== 'function') return; // нет <dialog> — карточки остаются ссылками
  const root = document.documentElement, body = sheet.querySelector('.work-sheet__in'), x = sheet.querySelector('.work-sheet__x');
  const vtOK = () => typeof document.startViewTransition === 'function' && root.classList.contains('motion') && !root.classList.contains('lite') && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tplOf = (a) => document.getElementById('w-' + a.dataset.work);
  let card = null, busy = false;

  grid.querySelectorAll('a[data-work]').forEach((a) => { if (tplOf(a)) a.setAttribute('aria-haspopup', 'dialog'); });

  /* картинки листа — заранее, когда к карточке подвели мышь или коснулись её: переход тогда идёт к готовому экрану */
  const warm = (e) => {
    const a = e.target.closest && e.target.closest('a[data-work]');
    if (!a || a.dataset.warm) return;
    const tpl = tplOf(a); if (!tpl) return;
    a.dataset.warm = '1';
    tpl.content.querySelectorAll('img').forEach((i) => { const im = new Image(); im.decoding = 'async'; im.src = i.getAttribute('src'); });
  };
  grid.addEventListener('pointerover', warm, { passive: true });
  grid.addEventListener('pointerdown', warm, { passive: true });
  grid.addEventListener('focusin', warm);

  const lock = () => { root.style.scrollbarGutter = 'stable'; root.style.overflow = 'hidden'; };
  const unlock = () => { root.style.overflow = ''; root.style.scrollbarGutter = ''; };
  const name = (el, on) => { if (el) el.style.viewTransitionName = on ? 'work-hero' : ''; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // переход View Transitions; пропущенный переход (быстрое нажатие, скрытая вкладка) — не ошибка: уборка в любом случае
  const morph = (update, after) => { const vt = document.startViewTransition(update); vt.ready.catch(() => {}); vt.finished.then(after, after); };

  async function open(a) {
    const tpl = tplOf(a);
    if (!tpl || busy || sheet.open) return;
    busy = true; card = a;
    body.replaceChildren(tpl.content.cloneNode(true));
    const title = body.querySelector('.work__title');
    if (title) sheet.setAttribute('aria-labelledby', title.id);
    const win = body.querySelector('.work__win'), thumb = a.querySelector('.work__thumb');
    const show = () => { sheet.showModal(); lock(); body.scrollTop = 0; if (x) x.focus({ preventScroll: true }); };
    if (vtOK() && win && thumb) {
      const img = win.querySelector('img');
      if (img && !img.complete) await Promise.race([img.decode().catch(() => {}), wait(320)]); // экран компьютера успел загрузиться — переход красивее
      sheet.classList.add('is-vt');
      name(thumb, true);
      morph(() => { name(thumb, false); show(); name(win, true); }, () => { name(win, false); sheet.classList.remove('is-vt'); busy = false; });
    } else { show(); busy = false; }
  }

  // close(true) — сразу, без перехода и без возврата фокуса (уходим к анкете по «Хочу похожее решение»)
  function close(now) {
    if (!sheet.open) return;
    sheet.querySelectorAll('video').forEach((v) => v.pause());
    const a = card, win = body.querySelector('.work__win'), thumb = a && a.querySelector('.work__thumb');
    const done = () => { sheet.close(); unlock(); };
    const back = () => { if (!now && a) a.focus({ preventScroll: true }); };
    if (!now && vtOK() && win && thumb && !busy) {
      busy = true;
      sheet.classList.add('is-vt');
      name(win, true);
      morph(() => { name(win, false); done(); name(thumb, true); }, () => { name(thumb, false); sheet.classList.remove('is-vt'); busy = false; back(); });
    } else { done(); back(); }
  }

  grid.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-work]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !tplOf(a)) return; // с Ctrl / в новой вкладке — обычная ссылка
    e.preventDefault();
    open(a);
  });
  sheet.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); // Esc и «назад» на телефоне
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  // нажатие на фон: и нажали, и отпустили на подложке (выделение текста, протянутое за край листа, лист не закрывает)
  let downOnBackdrop = false;
  sheet.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === sheet; });
  sheet.addEventListener('click', (e) => { if (e.target === sheet && downOnBackdrop) close(); downOnBackdrop = false; });
  // к анкете: закрываем лист до того, как js/order.js прокрутит страницу (фаза перехвата, без preventDefault)
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-order]')) close(true); }, true);
  // колесо мыши внутри листа не должно доходить до плавной прокрутки страницы (js/motion.js): страница под листом стоит
  sheet.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
})();
