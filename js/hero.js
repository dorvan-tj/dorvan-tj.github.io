/* Dorvan — первый экран: «стек экранов» наклоняется и расходится по глубине за курсором (участок hero, 11.11.2026).
   Работает только с мышью, не на слабом устройстве (html.lite) и только если движение включено (html.motion):
   при prefers-reduced-motion и в «Спокойном режиме» скрипт сразу выходит и ничего не делает.
   Один цикл requestAnimationFrame: идёт, пока сцена догоняет курсор, и останавливается; пока первый экран не виден, не запускается вовсе.
   Двигает только transform: .hx-fan — наклон, элементы с data-depth — сдвиг (чем больше число, тем ближе к зрителю; минус — в обратную сторону). */
(() => {
  'use strict';
  const root = document.documentElement;
  if (!root.classList.contains('motion') || root.classList.contains('lite') || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const hero = document.querySelector('.hx');
  const fan = hero && hero.querySelector('.hx-fan');
  if (!fan) return;
  const layers = Array.from(fan.querySelectorAll('[data-depth]'), (el) => [el, Number(el.dataset.depth) || 0]);
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, last = 0, seen = true;

  const step = (t) => {
    const k = 1 - Math.pow(0.88, Math.max(1, t - last) / 16.7); last = t;
    x += (tx - x) * k; y += (ty - y) * k;
    if (Math.abs(tx - x) + Math.abs(ty - y) < 0.002) { x = tx; y = ty; }
    fan.style.transform = 'perspective(1400px) rotateX(' + (y * -4).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg)';
    for (const [el, d] of layers) el.style.transform = 'translate3d(' + (x * d * 7).toFixed(1) + 'px,' + (y * d * 5).toFixed(1) + 'px,0)';
    raf = seen && (x !== tx || y !== ty) ? requestAnimationFrame(step) : 0;
  };
  const kick = () => { if (!raf && seen) { last = performance.now(); raf = requestAnimationFrame(step); } };

  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    kick();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });

  // первый экран ушёл из виду: цикл стоит, «парение» в CSS на паузе (.is-off)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      hero.classList.toggle('is-off', !seen);
      if (!seen && raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(hero);
  }
})();
