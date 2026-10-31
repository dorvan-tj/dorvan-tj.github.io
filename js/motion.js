/* Dorvan — движение страницы: появление блоков при прокрутке, наклон телефона в первом экране, подсветка карточек за курсором, «волна» на кнопках.
   Работает только если в системе НЕ выключены анимации (html.motion ставит маленький скрипт в <head>) — иначе страница остаётся неподвижной.
   Двигаются только transform и opacity. Стили — в конце css/site.css («движение»). Без сборки. */
(() => {
  'use strict';
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const lite = root.classList.contains('lite');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches; // мышь: наклон, подсветка

  /* ---------- появление при прокрутке, запасной способ — для браузеров без анимации по прокрутке (в остальных всё делает CSS: html.sv).
     Только для мыши (компьютер): на телефоне без анимации по прокрутке блоки просто стоят — так телефон не тормозит.
     Что вошло в кадр вместе — появляется по очереди (шаг 50 мс, не больше шести) ---------- */
  if (!root.classList.contains('sv') && fine) {
    const SEL = '.sec__head,.tabs,.grp__head,.price,.grp__note,.note,.terms,.calc,.other,.promo,.why li,.ex li,.reel,.steps li,.order,.faq__i,.ftr__in';
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
      let n = 0;
      es.filter((e) => e.isIntersecting)
        .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left))
        .forEach((e) => { io.unobserve(e.target); show(e.target, lite ? 0 : Math.min(n++, 6) * 50); });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' }) : null;
    function show(el, d) {
      el.style.setProperty('--d', d + 'ms'); el.classList.add('is-in');
      let done = false;
      const end = () => { if (done) return; done = true; el.classList.add('is-done'); el.style.removeProperty('--d'); };
      el.addEventListener('transitionend', (e) => { if (e.target === el && e.propertyName === 'opacity') end(); });
      setTimeout(end, d + 900); // запасной путь, если переход не сработал
    }
    const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight * 0.98 && r.height > 0; };
    $$(SEL).forEach((el) => {
      el.setAttribute('data-r', '');
      if (!io) el.classList.add('is-in', 'is-done');
      else if (inView(el)) el.classList.add('is-in', 'is-done'); // уже на экране при открытии — без анимации, чтобы не мигало
      else io.observe(el); // блоки в скрытых вкладках проявятся, когда вкладку откроют и прокрутят до них
    });
    root.classList.add('rv'); // с этого момента CSS прячет ещё не показанные блоки (те, что на экране, уже помечены)
    // страховка: при очень быстрой прокрутке браузер может «перепрыгнуть» блок и не сообщить о нём — когда прокрутка затихла, показываем всё, что уже не ниже нижнего края экрана
    let idle = 0;
    const sweep = () => {
      $$('[data-r]:not(.is-in)').forEach((el) => {
        if (!el.getClientRects().length) return; // блок в скрытой вкладке — проявится, когда его откроют
        const r = el.getBoundingClientRect();
        if (r.top >= innerHeight) return;
        if (io) io.unobserve(el);
        if (r.bottom < 0) el.classList.add('is-in', 'is-done'); else show(el, 0); // уже проскочили — без анимации; на экране — плавно
      });
    };
    addEventListener('scroll', () => { clearTimeout(idle); idle = setTimeout(sweep, 160); }, { passive: true });
    addEventListener('resize', () => { clearTimeout(idle); idle = setTimeout(sweep, 160); });
  }

  /* ---------- первый экран: телефон слегка наклоняется за курсором (только мышь и не слабое устройство) ---------- */
  const hero = $('.hero'), phone = $('.hero .phone');
  if (hero && phone && fine && !lite) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, last = 0;
    const step = (t) => {
      const k = 1 - Math.pow(0.86, Math.max(1, t - last) / 16.7); last = t;
      cx += (tx - cx) * k; cy += (ty - cy) * k;
      phone.style.transform = 'perspective(1100px) rotateX(' + (cy * -6).toFixed(2) + 'deg) rotateY(' + (cx * 8).toFixed(2) + 'deg)';
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)); ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)); kick();
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  }
  // аврора за главным экраном стоит, пока первый экран не виден
  if (hero && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => root.classList.toggle('aurora-off', !e.isIntersecting)).observe(hero);

  /* ---------- подсветка карточки за курсором (мышь) ---------- */
  if (fine) {
    document.addEventListener('pointermove', (e) => {
      const c = e.target.closest && e.target.closest('.price,.why li');
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
