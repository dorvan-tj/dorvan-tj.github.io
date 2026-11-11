/* Dorvan — сайт студии. Без сборки. Настройки — js/config.js. */
(() => {
  'use strict';
  const SITE = Object.assign({ whatsapp: '992119921803', clientsLeft: '', review: {} }, window.SITE);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const wa = String(SITE.whatsapp || '992119921803').replace(/\D/g, '');

  /* меню «три полоски» на телефоне */
  const burger = $('.burger'), menu = $('#menu'), hdr = $('.hdr');
  if (burger && menu) {
    const set = (on) => { burger.setAttribute('aria-expanded', String(on)); menu.hidden = !on; };
    burger.addEventListener('click', () => set(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); burger.focus(); } });
    document.addEventListener('click', (e) => { if (!menu.hidden && !hdr.contains(e.target)) set(false); });
    matchMedia('(min-width:760px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  }

  /* переключатели (услуги): стрелки, Home и End — как у обычных вкладок; выбранная вкладка всегда видна в строке; без перезагрузки.
     Без скрипта видны все группы; скрипт при загрузке оставляет только группу выбранной вкладки */
  const calmMotion = !document.documentElement.classList.contains('motion'); // нет движения: «уменьшить движение» в системе или «Спокойный режим» (скрипт в <head>)
  $$('[data-tabs]').forEach((list) => {
    const tabs = $$('[role="tab"]', list), panel = document.getElementById(tabs[0].getAttribute('aria-controls')), parts = $$('[data-g]', panel);
    const into = (t) => { // вкладка целиком в видимой части строки (на телефоне строка прокручивается вбок)
      const to = t.offsetLeft - (list.clientWidth - t.offsetWidth) / 2;
      if (list.scrollWidth > list.clientWidth + 1) list.scrollTo({ left: Math.max(0, to), behavior: calmMotion ? 'auto' : 'smooth' });
    };
    const pick = (t, focus, first) => {
      const f = t.dataset.f;
      tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
      panel.setAttribute('aria-labelledby', t.id); panel.dataset.view = f;
      parts.forEach((g) => { g.hidden = !(f === 'all' || g.dataset.g === f); });
      if (!calmMotion && !first) { panel.classList.remove('is-swap'); void panel.offsetWidth; panel.classList.add('is-swap'); } // панель плавно сменяется (CSS html.motion .is-swap)
      into(t); if (focus) t.focus();
    };
    panel.addEventListener('animationend', (e) => { if (e.target === panel) panel.classList.remove('is-swap'); });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(t));
      t.addEventListener('keydown', (e) => {
        const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (to == null) return;
        e.preventDefault(); pick(tabs[(to + tabs.length) % tabs.length], true);
      });
    });
    pick(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0], false, true);
  });

  /* калькулятор: галочки → сумма «ориентировочно, от N сомони»; две услуги и больше — скидка 10%; «срочно» +30%; кнопка отправляет готовый текст в WhatsApp.
     Цены берутся из data-price у вариантов (их пишет gen-services.py из той же таблицы, что и карточки). Проценты применяются по очереди, сумма — в целых сомони */
  const calc = $('#calc');
  if (calc) {
    const form = $('#calc-form'), lines = $('#calc-lines'), empty = $('#calc-empty'), totalRow = $('#calc-total'), sumEl = $('#calc-num'), live = $('#calc-live'), send = $('#calc-send'), rush = $('#calc-rush');
    const som = (n) => n + ' сомони', row = (cls, name, val) => { const li = document.createElement('li'), b = document.createElement('b'); if (cls) li.className = cls; li.append(name, b); b.textContent = val; return li; };
    let shown = 0, raf = 0, tid = 0;
    const count = (to) => { // число в «Итого» плавно догоняет новое значение; запасной таймер ставит точное число, даже если вкладка скрыта и кадры не рисуются
      cancelAnimationFrame(raf); clearTimeout(tid); const from = shown; shown = to;
      if (calmMotion || from === to) { sumEl.textContent = to; return; }
      const t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / 320); sumEl.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step); tid = setTimeout(() => { cancelAnimationFrame(raf); sumEl.textContent = to; }, 420);
    };
    const update = () => {
      const sel = $$('input[data-price]:checked', form);
      const sum = sel.reduce((n, i) => n + Number(i.dataset.price), 0);
      const disc = sel.length >= 2 ? Math.round(sum * 0.1) : 0, after = sum - disc;
      const extra = rush.checked && sel.length ? Math.round(after * 0.3) : 0, total = after + extra;
      lines.replaceChildren(...sel.map((i) => row('', i.dataset.name, (i.dataset.from ? 'от ' : '') + som(i.dataset.price))),
        ...(disc ? [row('is-disc', 'Скидка за связку −10%', '−' + som(disc))] : []), ...(extra ? [row('is-rush', 'Срочно (2–3 дня) +30%', '+' + som(extra))] : []));
      empty.hidden = sel.length > 0; totalRow.hidden = !sel.length;
      count(total);
      live.textContent = sel.length ? 'Итого ориентировочно, от ' + total + ' сомони' + (disc ? ', скидка за связку десять процентов' : '') : 'Ничего не выбрано';
      if (sel.length) {
        const msg = ['Здравствуйте! Хочу заказать:', ...sel.map((i) => '• ' + i.dataset.name + ' — ' + (i.dataset.from ? 'от ' : '') + som(i.dataset.price)),
          ...(disc ? ['Скидка за связку −10%: −' + som(disc)] : []), ...(extra ? ['Срочно (2–3 дня) +30%: +' + som(extra)] : []), 'Итого: ориентировочно, от ' + som(total), 'Цена ориентировочная.'].join('\n');
        send.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg); send.removeAttribute('aria-disabled');
      } else { send.removeAttribute('href'); send.setAttribute('aria-disabled', 'true'); }
    };
    form.addEventListener('change', update); form.addEventListener('submit', (e) => e.preventDefault()); update();
  }

  /* шапка: подсвечиваем раздел, который сейчас на экране (Услуги, Работы, Как работаем, Приведи друга; выше «Услуг» и с «Частых вопросов» и ниже пункта в шапке нет — ничего не подсвечено) */
  const links = $$('.nav a[href^="#"]'), zones = links.map((a) => $(a.getAttribute('href'))), stop = $('#faq');
  if (links.length && zones.every(Boolean)) {
    let raf = 0;
    const spy = () => {
      raf = 0;
      const line = innerHeight * 0.4; // «линия чтения»: раздел считается текущим, когда его верх поднялся выше неё
      let on = -1;
      zones.forEach((z, i) => { if (z.getBoundingClientRect().top <= line) on = i; });
      if (stop && stop.getBoundingClientRect().top <= line) on = -1;
      links.forEach((a, i) => { if (i === on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(spy); };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); spy();
  }

  /* нижняя полоска (телефон) и плавающая кнопка WhatsApp (компьютер) уходят, пока на экране анкета: у анкеты свои кнопки, а эти закрывали бы поля */
  const quick = $$('.dock,.fab'), ord = $('#order');
  if (quick.length && ord && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => quick.forEach((q) => q.classList.toggle('is-off', e.isIntersecting)), { rootMargin: '0px 0px -35% 0px' }).observe(ord);

  /* нижняя полоска: пока на экране видна главная кнопка первого экрана, тёмная кнопка полоски спрятана (две одинаковые «Обсудить проект» рядом не нужны),
     круглая WhatsApp остаётся всегда. Только с движением: в спокойном режиме и без скрипта полоска целиком. Верхние 70 px закрыты шапкой */
  const dock = $('.dock'), lead = $('[data-order][data-order-source="главный экран"]');
  if (dock && lead && !calmMotion && 'IntersectionObserver' in window) {
    const solo = (on) => dock.classList.toggle('is-solo', on), r = lead.getBoundingClientRect();
    dock.classList.add('is-init'); solo(r.bottom > 70 && r.top < innerHeight); // при загрузке — сразу нужное состояние, без анимации
    requestAnimationFrame(() => requestAnimationFrame(() => dock.classList.remove('is-init')));
    new IntersectionObserver(([e]) => solo(e.isIntersecting), { rootMargin: '-70px 0px 0px 0px' }).observe(lead);
  }

  /* «Спокойный режим» (кнопка в подвале): выбор запоминается в браузере (localStorage.dorvanCalm = '1'); скрипт в <head> тогда не включает движение. Хранилище недоступно — кнопка остаётся скрытой */
  $$('[data-calm]').forEach((b) => {
    let on;
    try { on = localStorage.getItem('dorvanCalm') === '1'; } catch (e) { return; }
    b.setAttribute('aria-pressed', String(on));
    $('span', b).textContent = on ? ': вкл' : ': выкл';
    b.hidden = false;
    b.addEventListener('click', () => {
      try { if (on) localStorage.removeItem('dorvanCalm'); else localStorage.setItem('dorvanCalm', '1'); } catch (e) { return; }
      location.reload();
    });
  });

  /* акция «Первые 10»: число — только в config.js; 0 и меньше — плашка скрывается; числа нет — плашка без счётчика */
  const left = SITE.clientsLeft === '' || SITE.clientsLeft == null ? NaN : Number(SITE.clientsLeft);
  $$('[data-promo]').forEach((p) => {
    if (Number.isFinite(left)) { if (left <= 0) p.hidden = true; else $$('[data-left]', p).forEach((b) => { b.textContent = String(left); }); }
    else $$('[data-count]', p).forEach((c) => { c.hidden = true; });
  });

  /* отзыв Melty: показывается, только когда его вписали в config.js */
  const rv = SITE.review || {}, quote = $('[data-review]');
  if (quote && String(rv.text || '').trim()) {
    $('p', quote).textContent = String(rv.text).trim();
    $('footer', quote).textContent = rv.by ? '— ' + rv.by : '';
    quote.hidden = false;
  }
  /* анкета и её отправка боту — js/order.js */
})();
