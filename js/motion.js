/* Dorvan — движение страницы: появление блоков при прокрутке, подсветка карточек за курсором, «волна» на кнопках, плавная прокрутка колесом.
   Работает только если в системе НЕ выключены анимации и не выбран «Спокойный режим» (html.motion ставит маленький скрипт в <head>) — иначе страница остаётся неподвижной.
   Двигаются только transform и opacity. Стили — в конце css/site.css («движение»). Без сборки.
   Договорённость с разделами (11.11.2026): блок, который проявляется при прокрутке, — атрибут data-reveal (порядок в ряду — style="--i:N"); подсветка за курсором — атрибут data-glow. */
(() => {
  'use strict';
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const lite = root.classList.contains('lite');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches; // мышь: подсветка, плавное колесо

  /* ---------- появление при прокрутке, запасной способ — для браузеров без анимации по прокрутке (в остальных всё делает CSS: html.sv).
     Только для мыши (компьютер): на телефоне без анимации по прокрутке блоки просто стоят — так телефон не тормозит.
     Блоки с data-reveal; блоки одного ряда — по очереди: шаг 50 мс по их номеру --i (не больше восьми шагов) ---------- */
  if (!root.classList.contains('sv') && fine) {
    const order = (el) => Math.min(8, Math.max(0, parseFloat(getComputedStyle(el).getPropertyValue('--i')) || 0));
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
      es.filter((e) => e.isIntersecting).forEach((e) => { io.unobserve(e.target); show(e.target, lite ? 0 : order(e.target) * 50); });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' }) : null;
    function show(el, d) {
      el.style.setProperty('--d', d + 'ms'); el.classList.add('is-in');
      let done = false;
      const end = () => { if (done) return; done = true; el.classList.add('is-done'); el.style.removeProperty('--d'); };
      el.addEventListener('transitionend', (e) => { if (e.target === el && e.propertyName === 'opacity') end(); });
      setTimeout(end, d + 900); // запасной путь, если переход не сработал
    }
    const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight * 0.98 && r.height > 0; };
    $$('[data-reveal]').forEach((el) => {
      if (!io) el.classList.add('is-in', 'is-done');
      else if (inView(el)) el.classList.add('is-in', 'is-done'); // уже на экране при открытии — без анимации, чтобы не мигало
      else io.observe(el); // блоки в скрытых вкладках проявятся, когда вкладку откроют и прокрутят до них
    });
    root.classList.add('rv'); // с этого момента CSS прячет ещё не показанные блоки (те, что на экране, уже помечены)
    // страховка: при очень быстрой прокрутке браузер может «перепрыгнуть» блок и не сообщить о нём — когда прокрутка затихла, показываем всё, что уже не ниже нижнего края экрана
    let idle = 0;
    const sweep = () => {
      $$('[data-reveal]:not(.is-in)').forEach((el) => {
        if (!el.getClientRects().length) return; // блок в скрытой вкладке — проявится, когда его откроют
        const r = el.getBoundingClientRect();
        if (r.top >= innerHeight) return;
        if (io) io.unobserve(el);
        if (r.bottom < 0) el.classList.add('is-in', 'is-done'); else show(el, lite ? 0 : order(el) * 50); // уже проскочили — без анимации; на экране — плавно, по очереди ряда
      });
    };
    addEventListener('scroll', () => { clearTimeout(idle); idle = setTimeout(sweep, 160); }, { passive: true });
    addEventListener('resize', () => { clearTimeout(idle); idle = setTimeout(sweep, 160); });
  }

  /* ---------- аврора за первым экраном стоит, пока он не виден (наклон телефонов за курсором — js/hero.js) ---------- */
  const hero = $('.hero');
  if (hero && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => root.classList.toggle('aurora-off', !e.isIntersecting)).observe(hero);

  /* ---------- подсветка карточки за курсором (мышь): тарифы, карточки «Приведи друга» и любой блок с data-glow ---------- */
  if (fine) {
    document.addEventListener('pointermove', (e) => {
      const c = e.target.closest && e.target.closest('.price,.why li,[data-glow]');
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--sx', Math.round(e.clientX - r.left) + 'px'); c.style.setProperty('--sy', Math.round(e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ---------- «волна» от места нажатия на кнопку ---------- */
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('.btn');
    if (!b || e.button !== 0 || b.getAttribute('aria-disabled') === 'true') return;
    let fx = b.querySelector(':scope > .fx');
    if (!fx) { fx = document.createElement('span'); fx.className = 'fx'; fx.setAttribute('aria-hidden', 'true'); b.prepend(fx); }
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, i = document.createElement('i');
    i.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    fx.appendChild(i); setTimeout(() => i.remove(), 700);
  }, { passive: true });

  /* ---------- плавная прокрутка колесом: мягкая инерция (только мышь и тачпад на компьютере, не слабое устройство; из прежнего сайта) ---------- */
  if (fine && !lite) {
    let y = 0, target = 0, raf = 0, last = 0, mine = -1;
    const maxY = () => root.scrollHeight - innerHeight;
    // колесо внутри прокручиваемого блока (например, строка вкладок) отдаём ему
    const inner = (el, dy) => {
      for (; el && el !== document.body && el !== root; el = el.parentElement) {
        if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)
          && (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
      }
      return false;
    };
    const step = (t) => {
      const k = 1 - Math.pow(1 - 0.12, Math.max(1, t - last) / 16.7); last = t;
      y += (target - y) * k;
      if (Math.abs(target - y) < 0.5) y = target;
      mine = y; window.scrollTo({ top: y, behavior: 'instant' });
      raf = y === target ? 0 : requestAnimationFrame(step);
    };
    addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (document.querySelector('dialog[open]')) { if (raf) { cancelAnimationFrame(raf); raf = 0; } return; } // открыт лист работ: колесо — ему, страница под листом не едет
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
      if (inner(e.target, dy)) return;
      e.preventDefault();
      if (!raf) { y = window.scrollY; target = y; last = performance.now(); raf = requestAnimationFrame(step); }
      target = Math.max(0, Math.min(maxY(), target + dy));
    }, { passive: false });
    // клавиатура, полоса прокрутки, якорь — кто-то другой двигает страницу: отдаём управление
    addEventListener('scroll', () => { if (raf && Math.abs(window.scrollY - mine) > 3) { cancelAnimationFrame(raf); raf = 0; } }, { passive: true });
  }
})();
