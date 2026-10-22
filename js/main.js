/* Dorvan — portfolio. Vanilla JS, no build. Settings live in js/config.js. */
(() => {
  'use strict';
  const SITE = Object.assign({ telegram: '', channel: '', endpoint: '', available: true }, window.SITE);
  const D = window.I18N || { en: {}, tj: {}, dyn: { ru: {}, en: {}, tj: {} } };
  const LANGS = ['ru', 'tj', 'en']; // русский — в самой разметке, английский — в i18n.js, таджикский (бета) — в tj.js
  const langHooks = []; // что обновить при смене языка: подбор, калькулятор, набросок, отзывы
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches; // мышь: наклон, подсветка, магнит, курсор
  const tg = String(SITE.telegram || '').replace(/^@/, '').trim();
  const viaApi = Boolean(SITE.endpoint);

  /* ---------- кейсы: галереи с кнопками и счётчиком, соседние проекты внизу окна — собираются при первом открытии окна ---------- */
  const caseCards = $$('[data-case]');
  function buildGallery(s) {
    const g = document.createElement('div'); g.className = 'gal';
    s.before(g); g.appendChild(s);
    const bar = document.createElement('div'); bar.className = 'gal__bar';
    bar.innerHTML = '<button type="button" class="round gal__prev" data-dyn-label="gal.prev"><svg class="ico" aria-hidden="true"><use href="#i-arrow-r"/></svg></button>'
      + '<span class="gal__n" aria-hidden="true"></span>'
      + '<button type="button" class="round gal__next" data-dyn-label="gal.next"><svg class="ico" aria-hidden="true"><use href="#i-arrow-r"/></svg></button>';
    g.appendChild(bar);
    const imgs = $$('img', s); const n = $('.gal__n', bar); const prev = $('.gal__prev', bar); const next = $('.gal__next', bar);
    const stepW = () => (imgs.length > 1 ? imgs[1].offsetLeft - imgs[0].offsetLeft : s.clientWidth) || 1;
    g.upd = () => {
      const max = s.scrollWidth - s.clientWidth;
      n.textContent = (s.scrollLeft >= max - 2 ? imgs.length : Math.round(s.scrollLeft / stepW()) + 1) + ' / ' + imgs.length;
      prev.disabled = s.scrollLeft <= 2; next.disabled = s.scrollLeft >= max - 2;
    };
    prev.addEventListener('click', () => s.scrollBy({ left: -stepW() }));
    next.addEventListener('click', () => s.scrollBy({ left: stepW() }));
    let q = 0;
    s.addEventListener('scroll', () => { if (!q) q = requestAnimationFrame(() => { q = 0; g.upd(); }); }, { passive: true });
    imgs.forEach((im) => im.addEventListener('load', g.upd));
  }
  function buildPager(d) {
    const i = caseCards.findIndex((c) => 'case-' + c.dataset.case === d.id);
    const nav = document.createElement('nav'); nav.className = 'case__pager'; nav.dataset.dynLabel = 'case.more';
    [[-1, 'prev'], [1, 'next']].forEach(([k, dir]) => {
      const other = caseCards[(i + k + caseCards.length) % caseCards.length];
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'pager__a pager__a--' + dir; b.dataset.goto = other.dataset.case; b.dataset.dir = dir;
      const tone = Array.from(other.querySelector('.thumb').classList).find((c) => c.indexOf('thumb--') === 0) || '';
      b.innerHTML = '<span class="pager__img ' + tone + '" aria-hidden="true"></span><span class="pager__t"><small data-dyn="case.' + dir + '"></small></span>';
      // адрес ставится только при открытии/наведении (warmCase): копия картинки вне документа начала бы грузиться сразу
      const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
      im.dataset.src = other.querySelector('.thumb img').getAttribute('src');
      b.firstChild.appendChild(im);
      const src = other.querySelector('.work-card__title'); const t = src.cloneNode(true); t.className = 'pager__title';
      b.lastChild.appendChild(t);
      // переводимое название: если русские оригиналы уже сняты, добавляем копию к ним (с русским текстом источника)
      const o = orig && t.hasAttribute('data-i18n') && orig.find((x) => x.el === src);
      if (o) orig.push({ el: t, t: o.t });
      onIntent(b, () => warmCase(b.dataset.goto));
      nav.appendChild(b);
    });
    $('.case__box', d).appendChild(nav);
  }
  function buildCase(d) {
    if (d.dataset.built) return;
    d.dataset.built = '1';
    $$('.strip', d).forEach(buildGallery);
    buildPager(d);
    $$('[data-dyn]', d).forEach((el) => { el.textContent = dyn(el.dataset.dyn); });
    $$('[data-dyn-label]', d).forEach((el) => el.setAttribute('aria-label', dyn(el.dataset.dynLabel)));
  }

  /* ---------- i18n: русские оригиналы берём из DOM, английские — из i18n.js ---------- */
  let lang = 'ru'; let domLang = 'ru'; // domLang — на каком языке сейчас тексты в DOM
  // оригиналы снимаются при первой смене языка: до неё DOM и так на русском, и стартовый скрипт не читает ~200 элементов
  let orig = null;
  const capture = () => orig || (orig = $$('[data-i18n],[data-i18n-html],[data-i18n-attr]').map((el) => {
    const o = { el };
    if (el.hasAttribute('data-i18n')) o.t = el.textContent;
    if (el.hasAttribute('data-i18n-html')) o.h = el.innerHTML;
    if (el.hasAttribute('data-i18n-attr')) {
      o.a = el.getAttribute('data-i18n-attr').split(';').map((p) => {
        const [at, key] = p.split(':');
        return { at, key, ru: el.getAttribute(at) };
      });
    }
    return o;
  }));
  const dyn = (k) => (D.dyn[lang] && D.dyn[lang][k]) || D.dyn.ru[k] || k;
  const pick = (key, fallback) => (lang !== 'ru' && D[lang] && D[lang][key] != null ? D[lang][key] : fallback); // нет перевода — остаётся русский текст

  let wantLang = 'ru'; // язык, который выбрал посетитель (во время короткого «затухания» lang ещё прежний)
  function setLang(next, persist) {
    lang = LANGS.includes(next) ? next : 'ru';
    wantLang = lang;
    // при старте на русском тексты уже на месте: не переписываем ~200 элементов (каждая запись — перекладка страницы)
    if (lang !== domLang) {
      capture().forEach((o) => {
        if ('t' in o) o.el.textContent = pick(o.el.getAttribute('data-i18n'), o.t);
        if ('h' in o) o.el.innerHTML = pick(o.el.getAttribute('data-i18n-html'), o.h);
        if (o.a) o.a.forEach((a) => o.el.setAttribute(a.at, pick(a.key, a.ru)));
      });
      domLang = lang;
    }
    $$('[data-dyn]').forEach((el) => { const v = dyn(el.dataset.dyn); if (el.textContent !== v) el.textContent = v; });
    $$('[data-dyn-label]').forEach((el) => el.setAttribute('aria-label', dyn(el.dataset.dynLabel)));
    if (autoSpec && msgEl.dataset.auto) msgEl.value = autoPhrase(autoSpec); // автофраза в поле «О проекте» — на новом языке
    syncModsHint();
    if (refUpdate) refUpdate(); // ссылка «Приведи клиента» — на новом языке
    langHooks.forEach((f) => f()); // подбор, калькулятор, набросок и отзывы собираются заново: названия они берут из уже переведённой разметки
    root.lang = lang === 'tj' ? 'tg' : lang; // код таджикского языка — tg
    $('#beta').hidden = lang !== 'tj';
    $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    if (persist) { try { localStorage.setItem('dorvan-lang', lang); } catch (e) { /* private mode */ } }
    rail = null; // высота карточек процесса зависит от языка
    renderSent();
    clearErrors();
  }

  // смена языка: видимые тексты гаснут, меняются и проявляются; строки подзаголовка hero заново выезжают из маски (новые элементы = новая CSS-анимация)
  const sub = $('.hero__sub');
  $$('[data-lang]').forEach((b) => b.addEventListener('click', () => switchLang(b.dataset.lang)));
  function switchLang(next) {
    if (next === wantLang) return;
    wantLang = next;
    if (reduce) return setLang(next, true);
    const els = $$('[data-i18n],[data-i18n-html],[data-dyn],.pager__title').filter((el) => {
      if (el === sub) return false;
      const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
    });
    els.forEach((el) => el.classList.add('i18n-fade', 'i18n-out'));
    setTimeout(() => {
      setLang(wantLang, true);
      requestAnimationFrame(() => {
        els.forEach((el) => el.classList.remove('i18n-out'));
        setTimeout(() => els.forEach((el) => el.classList.remove('i18n-fade')), 200);
      });
    }, 120);
  }

  /* ---------- навигация ---------- */
  const nav = $('#nav'); const burger = $('#burger');
  const closeNav = () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => burger.setAttribute('aria-expanded', String(nav.classList.toggle('is-open'))));
  $$('.nav__links a').forEach((a) => a.addEventListener('click', closeNav));
  $$('.nav__links li').forEach((li, i) => li.style.setProperty('--i', i)); // каскад пунктов мобильного меню
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) closeNav(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeNav(); burger.focus(); } });

  const links = $$('.nav__links a');
  const byId = {};
  links.forEach((a) => { const id = a.getAttribute('href').slice(1); if (!byId[id]) byId[id] = a; });
  byId.referral = byId.faq; // «Приведи клиента» стоит прямо перед вопросами
  byId.modules = byId.packs = byId.existing = byId.features = byId.prices; // модули, пакеты, готовые сайты и «фишки» — продолжение блока цен: пункт «Цены» остаётся подсвеченным
  byId.quiz = byId.calculator = byId.risk = byId.prices; // подбор, калькулятор и «Без риска» стоят рядом с ценами
  byId.reviews = byId.work; // отзывы — сразу после работ
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((es) => es.forEach((e) => {
      const a = e.isIntersecting && byId[e.target.id];
      if (!a) return;
      links.forEach((l) => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
      a.classList.add('is-active'); a.setAttribute('aria-current', 'location');
    }), { rootMargin: '-40% 0px -55% 0px' });
    ['top', 'about', 'services', 'quiz', 'prices', 'modules', 'packs', 'calculator', 'risk', 'existing', 'features', 'work', 'reviews', 'process', 'referral', 'faq', 'contact'].forEach((id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- прокрутка: плотность шапки и прогресс чтения ---------- */
  const bar = $('.nav__progress i');
  let ticking = false;
  function onScrollFrame() {
    ticking = false;
    const y = window.scrollY; const max = root.scrollHeight - innerHeight;
    root.classList.toggle('is-scrolled', y > 16);
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    drawSteps();
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  /* ---------- появление при скролле: каскад внутри одной «волны» (что вошло в кадр вместе — появляется по очереди) ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es, o) => {
      let n = 0;
      es.filter((e) => e.isIntersecting)
        .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left))
        .forEach((e) => {
          const el = e.target; const d = Math.min(n++, 6) * 70;
          el.style.setProperty('--d', d + 'ms'); el.classList.add('is-in'); o.unobserve(el);
          setTimeout(() => el.classList.add('is-done'), d + 800); // дальше элемент живёт со своими переходами
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal]').forEach((el) => io.observe(el));
  } else {
    $$('[data-reveal]').forEach((el) => el.classList.add('is-in', 'is-done'));
  }

  /* ---------- «Обо мне»: число проектов считается по карточкам на странице (примеры сайтов + другие работы) — оно не разойдётся с тем, что видно ---------- */
  const pc = $('[data-projects]'); if (pc) pc.textContent = String(new Set($$('.demo').map((a) => a.getAttribute('href'))).size + $$('.work-card').length); // пример на двух ступенях считается один раз
  /* счётчики 0 → N (числа берутся из разметки) */
  const nums = $$('.stats b');
  if (nums.length && !reduce && 'IntersectionObserver' in window) {
    const vals = nums.map((b) => parseInt(b.textContent, 10) || 0);
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        let busy = false;
        nums.forEach((b, i) => {
          const k = Math.max(0, Math.min(1, (t - t0 - i * 160) / 1100));
          b.textContent = String(Math.round(vals[i] * (1 - Math.pow(1 - k, 3))));
          if (k < 1) busy = true;
        });
        if (busy) requestAnimationFrame(tick);
      };
      nums.forEach((b) => { b.textContent = '0'; });
      requestAnimationFrame(tick);
    }, { threshold: 0.5 }).observe($('.stats'));
  }

  /* ---------- процесс: линия дорисовывается при прокрутке, точки загораются ---------- */
  const steps = $('.steps'); const stepEls = $$('.step', steps);
  let rail = null;
  function measureSteps() {
    const last = stepEls[stepEls.length - 1];
    const vertical = stepEls[1].offsetTop > stepEls[0].offsetTop; // одна колонка
    if (vertical) {
      steps.style.setProperty('--rail-e', (last.offsetHeight - 30) + 'px');
      const y0 = stepEls[0].offsetTop; const len = (last.offsetTop - y0) || 1;
      rail = { vertical, top: y0 + 30, len, fr: stepEls.map((s) => (s.offsetTop - y0) / len) };
    } else rail = { vertical, fr: stepEls.map((s, i) => i / (stepEls.length - 1)) };
  }
  function drawSteps() {
    const r = steps.getBoundingClientRect(); const vh = innerHeight;
    if (r.top > vh || r.bottom < 0) return; // секция за экраном — не меряем
    if (!rail) measureSteps();
    let p = reduce ? 1 : rail.vertical ? (vh * 0.62 - (r.top + rail.top)) / rail.len : (vh * 0.9 - r.top) / (vh * 0.45);
    p = Math.max(0, Math.min(1, p));
    steps.style.setProperty('--p', p.toFixed(4));
    stepEls.forEach((s, i) => s.classList.toggle('is-on', p > 0 && p >= rail.fr[i] - 0.002));
  }
  addEventListener('resize', () => { rail = null; });

  /* ---------- плавная прокрутка колесом: мягкая инерция (только мышь/тачпад, без reduced-motion) ---------- */
  if (fine && !reduce) {
    let y = 0, target = 0, raf = 0, last = 0, mine = -1;
    const maxY = () => root.scrollHeight - innerHeight;
    // колесо внутри прокручиваемого блока (textarea, лента кадров) отдаём ему
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
      if (e.ctrlKey || e.defaultPrevented || root.style.overflow === 'hidden' || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
      if (inner(e.target, dy)) return;
      e.preventDefault();
      if (!raf) { y = window.scrollY; target = y; last = performance.now(); raf = requestAnimationFrame(step); }
      target = Math.max(0, Math.min(maxY(), target + dy));
    }, { passive: false });
    // клавиатура, полоса прокрутки, якорь — кто-то другой двигает страницу: отдаём управление
    addEventListener('scroll', () => { if (raf && Math.abs(window.scrollY - mine) > 3) { cancelAnimationFrame(raf); raf = 0; } }, { passive: true });
  }

  /* ---------- hero: 3D-наклон сцены за курсором (плавный догон, только transform) ---------- */
  const stage = $('#stage'); const hero = $('#top');
  if (stage && fine && !reduce && !root.classList.contains('lite')) {
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    const tilt = $('.stage__tilt', stage);
    const glares = $$('.dev-browser,.dev-phone', stage).map((d) => {
      const g = document.createElement('i'); g.className = 'glare'; g.setAttribute('aria-hidden', 'true'); d.appendChild(g); return g;
    });
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, last = 0;
    const step = (t) => {
      const k = 1 - Math.pow(0.86, Math.max(1, t - last) / 16.7); last = t;
      cx += (tx - cx) * k; cy += (ty - cy) * k;
      tilt.style.transform = 'rotateX(' + (cy * -7).toFixed(3) + 'deg) rotateY(' + (cx * 9).toFixed(3) + 'deg)';
      glares.forEach((g) => { g.style.transform = 'translateX(' + (cx * 24).toFixed(2) + '%)'; });
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
    hero.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1); ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1); kick();
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  }
  // аврора за стеклом движется, только пока hero на экране
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => root.classList.toggle('aurora-off', !e.isIntersecting)).observe(hero);

  /* ---------- микровзаимодействия: подсветка карточек, магнитные кнопки, «волна» нажатия ---------- */
  if (fine) {
    document.addEventListener('pointermove', (e) => {
      const c = e.target.closest && e.target.closest('.svc,.work-card,.step');
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--sx', Math.round(e.clientX - r.left) + 'px'); c.style.setProperty('--sy', Math.round(e.clientY - r.top) + 'px');
    }, { passive: true });
  }
  if (fine && !reduce) {
    $$('.btn').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        // центр по раскладке (без собственного сдвига кнопки), иначе кнопка «догоняет» сама себя
        const pr = b.offsetParent ? b.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
        const dx = (e.clientX - (pr.left + b.offsetLeft + b.offsetWidth / 2)) / b.offsetWidth;
        const dy = (e.clientY - (pr.top + b.offsetTop + b.offsetHeight / 2)) / b.offsetHeight;
        b.style.translate = (dx * 12).toFixed(1) + 'px ' + (dy * 8).toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });
  }
  if (!reduce) {
    document.addEventListener('pointerdown', (e) => {
      const b = e.target.closest && e.target.closest('button.btn,a.btn,button.round');
      if (!b || e.button !== 0) return;
      let fx = b.querySelector(':scope > .fx');
      if (!fx) { fx = document.createElement('span'); fx.className = 'fx'; fx.setAttribute('aria-hidden', 'true'); b.prepend(fx); }
      const r = b.getBoundingClientRect(); const s = Math.max(r.width, r.height) * 2.2;
      const i = document.createElement('i');
      i.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
      fx.appendChild(i);
      setTimeout(() => i.remove(), 700);
    }, { passive: true });
  }

  /* ---------- контакты и доступность из config.js ---------- */
  if (!SITE.available) $('#avail').hidden = true;
  // акция «Первые 10 клиентов»: число мест — только в js/config.js (clientsLeft). Есть число — «осталось N из 10»; 0 и меньше — акция закончилась:
  // плашка, подарки в ступенях, бонус в форме и вопрос про бонусы скрываются; числа нет — счётчик просто не показываем
  const left = SITE.clientsLeft === undefined || SITE.clientsLeft === '' ? NaN : Number(SITE.clientsLeft);
  const promoOn = !(Number.isFinite(left) && left <= 0); // акция идёт (числа нет — считаем, что идёт: ничего не выдумываем и не прячем)
  if (Number.isFinite(left)) {
    $$('[data-left]').forEach((b) => { b.textContent = String(left); b.parentElement.hidden = left <= 0; });
    if (left <= 0) $$('[data-promo]').forEach((el) => { el.hidden = true; });
  }
  if (tg) {
    const a = $('#tg-link'); a.href = 'https://t.me/' + tg; a.lastElementChild.textContent = 'Telegram · @' + tg;
    $('.nav__tg').href = a.href;
  } else if (!viaApi) {
    console.info('[dorvan] Укажите telegram или endpoint в js/config.js — иначе заявка только копируется.');
  }
  const ch = String(SITE.channel || '').replace(/^@/, '').trim();
  if (ch) {
    $('#ch-row').hidden = false;
    const a = $('#ch-link'); a.href = 'https://t.me/' + ch; a.textContent = '@' + ch;
  }

  /* ---------- кейсы (native <dialog>): карточка «вырастает» в окно через View Transitions, без поддержки — прежний pop ---------- */
  const lock = (on) => { root.style.overflow = on ? 'hidden' : ''; root.classList.toggle('is-locked', on); };
  const vtOK = typeof document.startViewTransition === 'function' && !reduce && !root.classList.contains('lite');
  const name = (pairs) => pairs.forEach(([el, n]) => { if (el) el.style.viewTransitionName = n; });
  // класс .vt гасит pop окна на всё время, пока оно открыто (снимается в close), иначе pop сыграет второй раз после перехода
  const morph = (dlgs, update, done) => {
    dlgs.forEach((d) => d.classList.add('vt'));
    document.startViewTransition(update).finished.finally(done);
  };
  const cardOf = (d) => $('[data-case="' + d.id.slice(5) + '"]');
  const show = (d) => { buildCase(d); warmCase(d.id.slice(5)); root.classList.add('ready'); d.showModal(); lock(true); $('.case__box', d).scrollTop = 0; $$('.gal', d).forEach((g) => g.upd()); };
  function openCase(card) {
    const d = $('#case-' + card.dataset.case);
    if (!d || typeof d.showModal !== 'function') return;
    if (!vtOK) return show(d);
    const box = $('.case__box', d); const h = $('.case__head h2', d); const t = $('.work-card__title', card);
    name([[card, 'case-box'], [t, 'case-title']]);
    morph([d], () => { name([[card, ''], [t, ''], [box, 'case-box'], [h, 'case-title']]); show(d); }, () => name([[box, ''], [h, '']]));
  }
  function closeCase(d, animate) {
    if (!d.open) return;
    const card = cardOf(d); const r = card && card.getBoundingClientRect();
    if (!vtOK || !animate || !r || r.bottom < 0 || r.top > innerHeight) return d.close();
    const box = $('.case__box', d); const h = $('.case__head h2', d); const t = $('.work-card__title', card);
    root.dataset.vt = 'close'; name([[box, 'case-box'], [h, 'case-title']]);
    morph([d], () => { name([[box, ''], [h, ''], [card, 'case-box'], [t, 'case-title']]); d.close(); }, () => { name([[card, ''], [t, '']]); delete root.dataset.vt; });
  }
  function switchCase(from, id, dir) {
    const to = $('#case-' + id); if (!to) return;
    const run = () => { from.close(); show(to); };
    if (!vtOK) return run();
    const a = $('.case__box', from); const b = $('.case__box', to);
    root.dataset.vt = dir; name([[a, 'case-box']]);
    morph([from, to], () => { name([[a, ''], [b, 'case-box']]); run(); }, () => { name([[b, '']]); delete root.dataset.vt; });
  }
  // картинки кейса подгружаем заранее (наведение, фокус, касание): окно открывается уже с кадрами, переход не ждёт декодирования
  const warmCase = (id) => $$('#case-' + id + ' img').forEach((im) => {
    if (im.dataset.src) { im.src = im.dataset.src; im.removeAttribute('data-src'); }
    im.loading = 'eager';
  });
  const onIntent = (el, fn) => ['pointerenter', 'focus', 'touchstart'].forEach((t) => el.addEventListener(t, fn, { once: true, passive: true }));
  caseCards.forEach((b) => { b.addEventListener('click', () => openCase(b)); onIntent(b, () => warmCase(b.dataset.case)); });
  $$('dialog.case').forEach((d) => {
    d.addEventListener('click', (e) => {
      const go = e.target.closest('[data-goto]');
      if (go) return switchCase(d, go.dataset.goto, go.dataset.dir);
      // фон и крестик — с анимацией; кнопки, ведущие к брифу, закрывают сразу (дальше прокрутка)
      if (e.target === d) closeCase(d, true);
      else if (e.target.closest('[data-close]')) closeCase(d, Boolean(e.target.closest('.round')));
    });
    d.addEventListener('cancel', (e) => { if (e.cancelable && vtOK) { e.preventDefault(); closeCase(d, true); } });
    d.addEventListener('close', () => {
      d.classList.remove('vt');
      if ($('dialog.case[open]')) return; // переход к соседнему кейсу
      lock(false);
      // фокус — на карточку того кейса, который закрыли (после переходов между кейсами браузер вернул бы его на первый)
      const card = cardOf(d);
      if (card && document.activeElement !== card) card.focus({ preventScroll: true });
    });
  });

  /* ---------- цены: выбранная ступень показывает свою панель ---------- */
  const tierPanels = $$('.tierpanel');
  const showTier = (v) => tierPanels.forEach((p) => { p.hidden = p.id !== 'tier-' + v; });
  $$('input[name="tier"]').forEach((r) => r.addEventListener('change', () => showTier(r.value)));
  showTier($('input[name="tier"]:checked').value); // после перезагрузки браузер (Firefox) помнит выбранную ступень: панель должна совпасть с ней

  /* ---------- услуги, ступени цены и пакеты -> бриф ---------- */
  // Автофраза «Хочу сайт «Вау» за $100» / «Хочу пакет «Магазин» за $250»: название берётся из карточки, поэтому при смене языка фраза собирается заново (пока человек не начал писать своё)
  let refUpdate = null; // обновляет ссылку блока «Приведи клиента» при смене языка (назначается ниже)
  let autoSpec = null; let budAuto = false; // autoSpec — что поставило автофразу (ступень, пакет, подбор или калькулятор); бюджет в форме выбран кнопкой, а не человеком
  // spec автофразы: { key — ключ шаблона, name() — название на текущем языке, price, tail() — хвост фразы или пусто }
  const autoPhrase = (s) => dyn(s.key).replace('{n}', () => s.name()).replace('{p}', () => s.price) + (s.tail ? s.tail() : '');
  const specOf = (b) => { // из кнопки ступени или пакета; у кнопки услуги цены нет — автофразы нет
    if (!b.dataset.price) return null;
    const isPack = Boolean(b.dataset.pack);
    const nameEl = $(isPack ? '.pack__name' : '.tierpanel__name', b.closest(isPack ? '.pack' : '.tierpanel'));
    return { key: b.dataset.msg || (isPack ? 'pack.msg' : 'tier.msg'), name: () => nameEl.textContent, price: b.dataset.price };
  };
  // Переносит выбор в форму и прокручивает к ней: o = { type, budget, pack, spec, mods, bonus }.
  // mods и bonus — массивы ключей: отмеченные в форме модули и бонусы заменяются ими; нет полей — их не трогаем
  function applyOrder(o) {
    const r = $('input[name="type"][value="' + o.type + '"]');
    if (r) { r.checked = true; $('#err-type').textContent = ''; typeChips.classList.remove('is-invalid'); }
    const bud = o.budget && $('input[name="budget"][value="' + o.budget + '"]');
    if (bud) { bud.checked = true; budAuto = true; } // бюджет выбирается сам: у ступени и у пакета в кнопке записана своя вилка
    else if (budAuto) { $('input[name="budget"][value="b0"]').checked = true; budAuto = false; } // кнопка услуги: вилка от прежней ступени или пакета больше не подходит
    const pack = $('input[name="pack"][value="' + (o.pack || '') + '"]'); // пакет остаётся выбранным только после кнопки пакета: любая другая кнопка его снимает
    if (pack) pack.checked = true;
    if (o.mods) $$('input[name="mods"]', form).forEach((m) => { m.checked = o.mods.includes(m.value); });
    if (o.bonus) $$('input[name="bonus"]', form).forEach((m) => { m.checked = o.bonus.includes(m.value); });
    syncModsHint();
    if (o.spec) {
      if (!msgEl.value.trim() || msgEl.dataset.auto) { msgEl.value = autoPhrase(o.spec); msgEl.dataset.auto = '1'; autoSpec = o.spec; msgEl.removeAttribute('aria-invalid'); $('#err-msg').textContent = ''; }
    } else if (msgEl.dataset.auto) { msgEl.value = ''; delete msgEl.dataset.auto; autoSpec = null; } // кнопка услуги без цены: прежняя фраза про ступень или пакет не подходит
    $('#contact').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => $('#f-msg').focus({ preventScroll: true }), reduce ? 0 : 700);
  }
  $$('[data-pick]').forEach((b) => b.addEventListener('click', () => applyOrder({ type: b.dataset.pick, budget: b.dataset.budget, pack: b.dataset.pack, spec: specOf(b) })));
  $$('input[name="budget"]').forEach((r) => r.addEventListener('change', () => { budAuto = false; })); // сам поставил бюджет — кнопки услуг его не трогают

  /* ---------- бриф ---------- */
  const form = $('#brief'); const sent = $('#sent');
  const msgEl = form.elements.message; const contactEl = form.elements.contact;
  let state = null;
  // подпись выбранного варианта; у чипов бюджета в <b> сама вилка, а <small> — подпись ступеней, в заявку она не идёт
  const label = (name) => { const r = form.querySelector('input[name="' + name + '"]:checked'); if (!r) return ''; const s = r.nextElementSibling; return (s.querySelector('b') || s).textContent.trim(); };
  const pickedPack = () => (form.elements.pack.value ? label('pack') : ''); // пустое значение — «Без пакета»
  const pickedMods = () => $$('input[name="mods"]:checked', form).map((m) => m.nextElementSibling.textContent.trim());
  const pickedBonus = () => $$('input[name="bonus"]:checked', form).map((m) => m.nextElementSibling.textContent.trim());
  const refEl = form.elements.referrer; // «Кто вас пригласил (если есть)»
  // подсказка под модулями: что уже входит в выбранный пакет (отмечать это ещё раз не нужно)
  const modsHint = $('#mods-hint');
  const syncModsHint = () => {
    const p = form.querySelector('input[name="pack"]:checked');
    const names = ((p && p.dataset.incl) || '').split(' ').filter(Boolean).map((k) => { const n = $('input[name="mods"][value="' + k + '"]').nextElementSibling.firstElementChild.textContent.trim(); return n[0].toLowerCase() + n.slice(1); });
    modsHint.hidden = !names.length;
    if (names.length) modsHint.textContent = dyn('mods.incl').replace('{m}', names.join(', '));
  };
  $$('input[name="pack"]').forEach((r) => r.addEventListener('change', syncModsHint));

  // Через Worker заявка приходит без Telegram-аккаунта клиента, поэтому контакт обязателен.
  $('#brief-note').dataset.dyn = viaApi ? 'note.ep' : 'note.tg';
  $('label[for="f-contact"]').dataset.dyn = viaApi ? 'lbl.contact.req' : 'lbl.contact.opt';

  function buildText() {
    const none = dyn('tpl.none');
    const pack = pickedPack(); const mods = pickedMods(); const bonus = pickedBonus(); const ref = refEl.value.trim();
    return [
      dyn('tpl.head'), '',
      dyn('tpl.type') + ': ' + (label('type') || none),
      dyn('tpl.budget') + ': ' + (label('budget') || none),
      dyn('tpl.time') + ': ' + (label('time') || none),
      ...(pack ? [dyn('tpl.pack') + ': ' + pack] : []), // пакет, модули, бонус и «кто пригласил» — строками только если выбраны или заполнены
      ...(mods.length ? [dyn('tpl.mods') + ': ' + mods.join(', ')] : []),
      ...(bonus.length ? [dyn('tpl.bonus') + ': ' + bonus.join(', ')] : []),
      ...(ref ? [dyn('tpl.ref') + ': ' + ref] : []), '',
      dyn('tpl.msg') + ':', msgEl.value.trim(), '',
      dyn('tpl.contact') + ': ' + (contactEl.value.trim() || none)
    ].join('\n');
  }

  const typeChips = $('#err-type').previousElementSibling;
  // неверное поле коротко «встряхивается» (transform), подсветка — в CSS по aria-invalid / .is-invalid
  const shake = (el) => {
    if (reduce || !el.animate) return;
    el.animate([{ transform: 'none' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(2px)' }, { transform: 'none' }],
      { duration: 420, easing: 'cubic-bezier(.36,.07,.19,.97)' });
  };
  function clearErrors() {
    ['err-type', 'err-msg', 'err-contact'].forEach((id) => { $('#' + id).textContent = ''; });
    msgEl.removeAttribute('aria-invalid'); contactEl.removeAttribute('aria-invalid'); typeChips.classList.remove('is-invalid');
  }
  function validate() {
    clearErrors();
    const bad = [];
    if (!form.elements.type.value) { $('#err-type').textContent = dyn('err.type'); typeChips.classList.add('is-invalid'); bad.push([typeChips, form.querySelector('input[name="type"]')]); }
    if (msgEl.value.trim().length < 10) { $('#err-msg').textContent = dyn('err.msg'); msgEl.setAttribute('aria-invalid', 'true'); bad.push([msgEl, msgEl]); }
    if (viaApi && contactEl.value.trim().length < 3) { $('#err-contact').textContent = dyn('err.contact'); contactEl.setAttribute('aria-invalid', 'true'); bad.push([contactEl, contactEl]); }
    bad.forEach(([el]) => shake(el));
    if (bad.length) bad[0][1].focus();
    return !bad.length;
  }
  $$('input[name="type"]').forEach((r) => r.addEventListener('change', () => { $('#err-type').textContent = ''; typeChips.classList.remove('is-invalid'); }));
  msgEl.addEventListener('input', () => { delete msgEl.dataset.auto; if (msgEl.value.trim().length >= 10) { $('#err-msg').textContent = ''; msgEl.removeAttribute('aria-invalid'); } });
  contactEl.addEventListener('input', () => { if (contactEl.value.trim().length >= 3) { $('#err-contact').textContent = ''; contactEl.removeAttribute('aria-invalid'); } });

  function renderSent() {
    if (!state) return;
    const k = state.mode === 'fail' ? 'copy' : state.mode;
    $('#sent-t').textContent = dyn('sent.' + k + '.t');
    $('#sent-p').textContent = dyn(state.mode === 'fail' ? 'sent.fail.p' : 'sent.' + k + '.p');
  }
  function showSent(mode, text, url) {
    state = { mode };
    const done = mode === 'ok';
    $('#sent-msg').value = text;
    $('#sent-msg').hidden = done; $('#sent-copy').hidden = done;
    const open = $('#sent-open'); open.hidden = !url; if (url) open.href = url;
    const eb = $('#sent-edit [data-dyn]'); eb.dataset.dyn = done ? 'btn.new' : 'btn.edit'; eb.textContent = dyn(eb.dataset.dyn);
    form.hidden = true; sent.hidden = false;
    renderSent();
    const t = $('#sent-t'); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
    sent.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }

  // состояния кнопки отправки: loading (кольцо) → sent (галочка рисуется); подпись поверх, ширина кнопки не меняется
  const sendBtn = form.querySelector('[type="submit"]');
  sendBtn.insertAdjacentHTML('beforeend', '<span class="btn__state" aria-hidden="true"><i class="spin"></i><svg class="ico"><use href="#i-check"/></svg><span data-dyn="btn.sending"></span></span>');
  const btnState = (s) => {
    const t = $('.btn__state [data-dyn]', sendBtn);
    if (s) { t.dataset.dyn = s === 'sent' ? 'btn.sent' : 'btn.sending'; t.textContent = dyn(t.dataset.dyn); sendBtn.dataset.state = s; } else delete sendBtn.dataset.state;
    form.setAttribute('aria-busy', String(s === 'loading'));
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const text = buildText();
    const btn = sendBtn; btn.disabled = true;
    let mode = 'copy';
    if (viaApi) {
      btnState('loading');
      try {
        // text/plain: «простой» CORS-запрос без preflight; Worker сам разбирает JSON.
        const r = await fetch(SITE.endpoint, {
          method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({
            lang, type: label('type'), typeCode: form.elements.type.value,
            budget: label('budget'), budgetCode: form.elements.budget.value,
            time: label('time'), timeCode: form.elements.time.value,
            pack: pickedPack(), mods: pickedMods(), bonus: pickedBonus(), referrer: refEl.value.trim(),
            message: msgEl.value.trim(), contact: contactEl.value.trim(),
            hp: form.elements.hp.value, t: Math.round(performance.now())
          })
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        mode = 'ok';
      } catch (err) { mode = 'fail'; }
      if (mode === 'ok' && !reduce) { btnState('sent'); await wait(420); } // галочка в кнопке успевает прорисоваться
    }
    const url = tg ? 'https://t.me/' + tg + '?text=' + encodeURIComponent(text) : '';
    if (mode !== 'ok' && tg) mode = 'tg';
    showSent(mode, text, url);
    if (mode === 'tg') window.open(url, '_blank', 'noopener');
    btn.disabled = false; btnState('');
  });

  // копирование: системный буфер; если он не ответил за 1,2 с или запрещён — старый способ через выделение текста
  const copyText = async (text, field) => {
    try { await Promise.race([navigator.clipboard.writeText(text), new Promise((_, no) => setTimeout(no, 1200))]); } catch (err) { field.select(); document.execCommand('copy'); }
  };
  $('#sent-copy').addEventListener('click', async () => {
    const ta = $('#sent-msg'); const span = $('#sent-copy [data-dyn]');
    await copyText(ta.value, ta);
    span.textContent = dyn('btn.copied');
    setTimeout(() => { span.textContent = dyn('btn.copy'); }, 1800);
  });
  $('#sent-edit').addEventListener('click', () => {
    if (state && state.mode === 'ok') { form.reset(); syncModsHint(); budAuto = false; autoSpec = null; delete msgEl.dataset.auto; } // reset не шлёт события: подсказку и «автовыбор» сбрасываем сами
    clearErrors();
    sent.hidden = true; form.hidden = false; msgEl.focus();
    if (!reduce && form.animate) form.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,.9,.3,1)' });
  });

  /* ---------- «Приведи клиента»: имя → ссылка на чат с готовым текстом, «Скопировать», «Поделиться» ---------- */
  const refForm = $('#refgen');
  if (refForm) {
    const refName = $('#ref-name'); const refErr = $('#err-ref'); const refOut = $('#ref-out'); const refLink = $('#ref-link');
    const pct = (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase();
    // имя подставляется функцией (а не строкой): «$&», «$'» в имени не должны стать шаблоном; скобки и «!» кодируем сами — часть мессенджеров обрывает ссылку на «)»
    const refUrl = () => 'https://t.me/' + (tg || 'dorvan_tj') + '?text=' + encodeURIComponent(dyn('ref.text').replace('{n}', () => refName.value.trim())).replace(/[!'()*]/g, pct);
    const grow = () => { refLink.style.height = 'auto'; refLink.style.height = (refLink.scrollHeight + 2) + 'px'; }; // поле растёт по длине ссылки: она видна целиком
    refUpdate = () => {
      if (refErr.textContent) refErr.textContent = dyn('err.refname'); // ошибка — на текущем языке
      if (refOut.hidden) return;
      if (refName.value.trim().length < 2) { refOut.hidden = true; return; } // имя стёрли — ссылку без имени не показываем
      refLink.value = refUrl(); grow();
    };
    refForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (refName.value.trim().length < 2) {
        refErr.textContent = dyn('err.refname'); refName.setAttribute('aria-invalid', 'true'); refOut.hidden = true; shake(refName); refName.focus(); return;
      }
      refErr.textContent = ''; refName.removeAttribute('aria-invalid');
      refOut.hidden = false; refLink.value = refUrl(); grow(); refLink.focus(); // фокус на ссылку: скринридер её прочитает, на телефоне поле окажется в кадре
    });
    refName.addEventListener('input', () => { // ссылка всегда соответствует имени в поле
      if (refName.value.trim().length >= 2) { refErr.textContent = ''; refName.removeAttribute('aria-invalid'); }
      refUpdate();
    });
    $('#ref-copy').addEventListener('click', async () => {
      const span = $('#ref-copy [data-dyn]');
      await copyText(refLink.value, refLink);
      span.textContent = dyn('btn.copied');
      setTimeout(() => { span.textContent = dyn('btn.copy'); }, 1800);
    });
    $('#ref-share').addEventListener('click', async () => {
      const text = dyn('ref.share.text'); const url = refLink.value;
      if (navigator.share) { try { await navigator.share({ title: dyn('ref.share.title'), text, url }); return; } catch (err) { if (err && err.name === 'AbortError') return; } }
      window.open('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text), '_blank', 'noopener'); // нет системного «Поделиться» — окно выбора чата в Telegram
    });
  }

  /* ---------- бесплатный набросок: ссылка и название → чат с готовым текстом ---------- */
  const skForm = $('#sketchform');
  if (skForm) {
    const skLink = $('#sk-link'); const skBiz = $('#sk-biz'); const skErr = $('#err-sk'); const skDone = $('#sk-done'); const skBox = $('#sk-text');
    const skText = () => {
      const biz = skBiz.value.trim(); const link = skLink.value.trim();
      return [dyn('sk.head'), ...(biz ? [dyn('sk.biz.l') + ': ' + biz] : []), ...(link ? [dyn('sk.link.l') + ': ' + link] : [])].join('\n');
    };
    const skUrl = () => 'https://t.me/' + (tg || 'dorvan_tj') + '?text=' + encodeURIComponent(skText());
    const skOk = () => skBiz.value.trim().length >= 2 || skLink.value.trim().length >= 3; // достаточно одного из двух полей
    const skClear = () => { skErr.textContent = ''; skLink.removeAttribute('aria-invalid'); skBiz.removeAttribute('aria-invalid'); };
    langHooks.push(() => { // ошибка, готовый текст и ссылка — на текущем языке
      if (skErr.textContent) skErr.textContent = dyn('sk.err');
      if (!skDone.hidden) { skBox.value = skText(); $('#sk-open').href = skUrl(); }
    });
    skForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!skOk()) {
        skErr.textContent = dyn('sk.err'); skLink.setAttribute('aria-invalid', 'true'); skBiz.setAttribute('aria-invalid', 'true');
        shake(skLink); shake(skBiz); skLink.focus(); return;
      }
      skClear();
      skBox.value = skText(); $('#sk-open').href = skUrl();
      skForm.hidden = true; skDone.hidden = false;
      $('#sk-done-t').focus({ preventScroll: true });
      window.open(skUrl(), '_blank', 'noopener');
    });
    [skLink, skBiz].forEach((i) => i.addEventListener('input', () => { if (skOk()) skClear(); }));
    $('#sk-copy').addEventListener('click', async () => {
      const span = $('#sk-copy [data-dyn]');
      await copyText(skBox.value, skBox);
      span.textContent = dyn('btn.copied');
      setTimeout(() => { span.textContent = dyn('btn.copy'); }, 1800);
    });
    $('#sk-edit').addEventListener('click', () => { skDone.hidden = true; skForm.hidden = false; skLink.focus(); });
  }
  // кнопки «Хочу бесплатный набросок» (главный экран, «Без риска»): страница сама прокручивается к блоку; с мышью курсор ещё и встаёт в первое поле
  // (на телефоне — нет: поле в фокусе открыло бы клавиатуру и закрыло форму)
  $$('[data-sketch]').forEach((a) => a.addEventListener('click', () => setTimeout(() => {
    const target = skForm && !skForm.hidden ? (fine ? $('#sk-link') : null) : $('#sk-done-t');
    if (target) target.focus({ preventScroll: true });
  }, reduce ? 0 : 700)));

  /* ---------- подбор за 30 секунд и калькулятор ---------- */
  // Числа (цены, подарки, пакеты, примеры по нишам) — из JSON в разметке: его пишет gen_prices.py из тех же данных, что и сами блоки цен.
  // Названия берутся из самой разметки каждый раз заново, поэтому они всегда на текущем языке.
  let CALC = null;
  try { const cd = $('#calc-data'); CALC = cd ? JSON.parse(cd.textContent) : null; } catch (err) { /* без данных подбор и калькулятор просто не оживают */ }
  if (CALC) {
    const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); // 1 050 — неразрывный пробел
    const sum = (a) => a.reduce((s, x) => s + x, 0);
    const nameOfTier = (p) => $('#tier-' + p + ' .tierpanel__name').textContent;
    const nameOfMod = (k) => $('input[name="cmods"][value="' + k + '"]').nextElementSibling.firstElementChild.textContent;
    const nameOfBonus = (k) => $('input[name="cbonus"][value="' + k + '"]').nextElementSibling.textContent;
    const nameOfPack = (k) => $('#pack-' + k + ' .pack__name').textContent;
    const quoted = (s) => dyn('q.name').replace('{n}', () => s); // «Вау» по-русски и по-таджикски, “Wow” по-английски
    const tierSpec = (p) => ({ key: $('#tier-' + p + ' [data-pick]').dataset.msg || 'tier.msg', name: () => nameOfTier(p), price: String(p) });
    const scrollToEl = (el) => el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

    /* --- калькулятор: ступень + модули + бонус → итог в долларах и примерно в сомони --- */
    const calcEl = $('#calculator');
    const rate = Number(SITE.somoniRate) > 0 ? Number(SITE.somoniRate) : 0; // курс — одна цифра в js/config.js; нет курса — сомони не показываем
    const cTier = () => Number($('input[name="ctier"]:checked', calcEl).value);
    const cMods = $$('input[name="cmods"]', calcEl); const cBonus = $$('input[name="cbonus"]', calcEl);
    let calcCur = null; // последний расчёт: по нему работают кнопки «Заказать»
    // выбор совпал с пакетом: та же ступень и ровно те же модули (у ступени $500 пакет — это сама ступень)
    const packFor = (tier, mods) => (CALC.tiers[tier].incl.length ? null : CALC.packs.find((p) => p.base === tier && p.mods.length === mods.length && p.mods.every((k) => mods.includes(k))) || null);
    function calcBonusLock() { // бонусов — не больше, чем даёт ступень; остальные пока недоступны
      const t = CALC.tiers[cTier()]; const n = cBonus.filter((b) => b.checked).length;
      cBonus.forEach((b) => { b.disabled = !b.checked && n >= t.bonus; });
      $('#calc-bonus-hint').textContent = dyn('calc.bonus.' + t.bonus);
    }
    function calcTierChanged() { // что уже входит в ступень (у $500 — записи в Telegram и бот для клиентов) — отмечено и недоступно: второй раз его не прибавляем
      const t = CALC.tiers[cTier()];
      cMods.forEach((m) => {
        const inc = t.incl.includes(m.value);
        if (inc) { if (!m.disabled) m.dataset.was = m.checked ? '1' : ''; m.checked = true; } else if (m.disabled) m.checked = m.dataset.was === '1'; // ушли со ступени с «входит» — возвращаем то, что было отмечено до неё
        m.disabled = inc; m.nextElementSibling.lastElementChild.hidden = !inc;
      });
      let n = 0; cBonus.forEach((b) => { if (b.checked && ++n > t.bonus) b.checked = false; });
      calcBonusLock();
    }
    function calcRender() {
      const tier = cTier(); const t = CALC.tiers[tier];
      const mods = cMods.filter((m) => m.checked && !t.incl.includes(m.value)).map((m) => m.value);
      const bonus = promoOn ? cBonus.filter((b) => b.checked).map((b) => b.value) : [];
      const gift = promoOn ? mods.filter((k) => t.gift.includes(k)) : []; // эти модули первым клиентам достаются в подарок
      const free = '🎁 ' + dyn('calc.free');
      const lines = $('#calc-lines'); lines.textContent = '';
      const row = (name, right, isGift) => {
        const li = document.createElement('li'); if (isGift) li.className = 'is-gift';
        const a = document.createElement('span'); a.textContent = name;
        const b = document.createElement('span'); b.className = 'calc__p';
        if (Array.isArray(right)) { const s = document.createElement('s'); s.textContent = right[0]; const em = document.createElement('em'); em.textContent = right[1]; b.append(s, ' ', em); } else b.textContent = right;
        li.append(a, b); lines.appendChild(li);
      };
      row(dyn('calc.line.tier').replace('{n}', () => nameOfTier(tier)), '$' + tier);
      t.incl.forEach((k) => row(nameOfMod(k), $('.chip__inc', calcEl).textContent));
      mods.forEach((k) => (gift.includes(k) ? row(nameOfMod(k), ['+$' + CALC.mods[k], free], true) : row(nameOfMod(k), '+$' + CALC.mods[k])));
      if (promoOn && t.support) row(dyn('calc.support.' + t.support), free, true);
      bonus.forEach((k) => row(dyn('calc.bonus.line').replace('{b}', () => nameOfBonus(k)), free, true));
      const total0 = tier + sum(mods.map((k) => CALC.mods[k])) - sum(gift.map((k) => CALC.mods[k]));
      const pack = packFor(tier, mods);
      const usePack = Boolean(pack) && pack.now <= total0; // пакет показываем, когда он не дороже (а в акции модули в подарок часто делают его невыгодным — тогда честно не предлагаем)
      const total = usePack ? pack.now : total0;
      $('#calc-gift').hidden = !(promoOn && (gift.length || t.support || bonus.length));
      $('#calc-pack').hidden = !usePack; $('#calc-pack-order').hidden = !usePack;
      if (usePack) {
        const more = pack.extra.map((i) => $('#pack-' + pack.k + ' [data-i18n="pk.' + pack.k + '.' + i + '"]').textContent);
        $('#cp-t').textContent = dyn('calc.pack.t').replace('{n}', () => nameOfPack(pack.k));
        $('#cp-more').textContent = more.length ? dyn('calc.pack.more').replace('{x}', () => more.join(', ')) : ''; $('#cp-more').hidden = !more.length;
        $('#cp-was').textContent = '$' + pack.was; $('#cp-now').textContent = '$' + pack.now; $('#cp-save').textContent = '$' + (pack.was - pack.now);
      }
      $('#calc-sum').textContent = '$' + fmt(total);
      $('#calc-tjs-row').hidden = !rate;
      if (rate) $('#calc-tjs').textContent = '≈ ' + fmt(Math.round(total * rate / 10) * 10); // примерно: до десятков сомони
      $('#calc-mini').textContent = '$' + fmt(total); // короткий итог для телефона: держится у верхнего края, пока выбираете
      $('#calc-mini-tjs').textContent = rate ? $('#calc-tjs').textContent + ' ' + $('[data-i18n="calc.tjs"]', calcEl).textContent : '';
      $('#calc-rate').textContent = rate ? dyn('calc.rate').replace('{r}', () => String(rate).replace('.', lang === 'en' ? '.' : ',')) : '';
      calcCur = { tier, t, mods, bonus, total0, pack: usePack ? pack : null };
    }
    const syncPriceTier = (v) => { const pr = $('input[name="tier"][value="' + v + '"]'); if (pr && !pr.checked) { pr.checked = true; showTier(v); } }; // выбранная ступень одна на всю страницу
    function calcSet(sel) { // {tier, mods, bonus}: сюда переносит выбор подбор
      cMods.forEach((m) => { m.disabled = false; m.checked = sel.mods.includes(m.value); });
      cBonus.forEach((b) => { b.disabled = false; b.checked = sel.bonus.includes(b.value); });
      $('input[name="ctier"][value="' + sel.tier + '"]', calcEl).checked = true;
      calcTierChanged(); calcRender(); syncPriceTier(sel.tier);
    }
    $$('input[name="ctier"]', calcEl).forEach((r) => r.addEventListener('change', () => { calcTierChanged(); calcRender(); syncPriceTier(r.value); }));
    cMods.forEach((m) => m.addEventListener('change', calcRender));
    cBonus.forEach((b) => b.addEventListener('change', () => { calcBonusLock(); calcRender(); }));
    $$('input[name="tier"]').forEach((r) => r.addEventListener('change', () => { // выбрали ступень в блоке цен — калькулятор считает её же
      const c = $('input[name="ctier"][value="' + r.value + '"]', calcEl);
      if (c && !c.checked) { c.checked = true; calcTierChanged(); calcRender(); }
    }));
    $('#calc-order').addEventListener('click', () => {
      const c = calcCur;
      applyOrder({ type: 'site', budget: c.t.bud, pack: '', mods: c.mods, bonus: c.bonus, spec: Object.assign(tierSpec(c.tier), { tail: () => dyn('calc.msg').replace('{t}', () => String(c.total0)) }) });
    });
    $('#calc-pack-order').addEventListener('click', () => {
      const c = calcCur; const p = c.pack; // состав пакета уже включает эти модули: в форме их отдельно не отмечаем
      applyOrder({ type: 'site', budget: p.bud, pack: p.k, mods: [], bonus: c.bonus, spec: { key: 'pack.msg', name: () => nameOfPack(p.k), price: String(p.now) } });
    });
    langHooks.push(() => { calcBonusLock(); calcRender(); }); // подсказка про бонусы и все строки расчёта — на новом языке
    $('input[name="ctier"]:checked', calcEl).dispatchEvent(new Event('change')); // первый расчёт

    /* --- подбор: 4 вопроса → ступень, 1–2 модуля, бонус, пример, «Заказать это» --- */
    const quizEl = $('#quiz');
    const QKEYS = ['biz', 'need', 'brand', 'bud']; // что спрашивает каждый из четырёх вопросов
    const QCAP = { b1: 50, b2: 150, b3: 400, b4: Infinity, b0: 400 }; // потолок суммы «ступень + модули» по бюджету; «не знаю» — как у $150–400
    const qSteps = $$('.quiz__q', quizEl); const qRes = $('#quiz-res'); const qTop = $('#quiz-top'); const qBack = $('#quiz-back');
    let qStep = 1; let qAns = {}; let qPick = null; let qLock = 0;
    function qCompute(a) {
      const logo = a.brand === 'both' || a.brand === 'logo'; const insta = a.brand === 'both' || a.brand === 'insta';
      const wantsBooking = a.need === 'book' || a.need === 'order';
      let tier; let up = false; // up — запись или каталог нужны, а бюджет меньше «Запись / заказ»: честно говорим, что даст меньший бюджет
      if (wantsBooking && (a.bud === 'b3' || a.bud === 'b0')) tier = 350;
      else if (wantsBooking && a.bud === 'b4') tier = a.need === 'book' ? 500 : 350;
      else if (wantsBooking) { tier = a.bud === 'b2' ? (logo ? 100 : 70) : (insta ? 40 : 20); up = true; }
      else if (a.bud === 'b1') tier = insta ? 40 : 20;
      else if (a.bud === 'b2') tier = logo ? 100 : 70;
      else if (a.bud === 'b0') tier = 100;
      else tier = 200;
      const t = CALC.tiers[tier];
      const wish = tier === 500 ? ['bookadmin']
        : a.need === 'book' ? (tier >= 350 ? ['tgbook', 'clientbot'] : ['tgbook', 'bot'])
        : a.need === 'order' ? ['table', 'bot']
        : a.biz === 'food' ? ['otash', 'bot'] : a.biz === 'shop' ? ['table', 'bot'] : ['bot'];
      const mods = []; let cost = tier;
      wish.forEach((k) => { if (mods.length < 2 && !t.incl.includes(k) && cost + CALC.mods[k] <= QCAP[a.bud]) { mods.push(k); cost += CALC.mods[k]; } });
      // бонусы по смыслу: нет логотипа — логотип, нет Instagram — оформление; дальше по нише; «Карточка в 2ГИС» уже входит в сайт со ступени «Вау»
      const rank = [...(logo ? [] : ['logo']), ...(insta ? [] : ['insta']), ...(a.biz === 'food' ? ['menu'] : []), 'qr', ...(tier < 100 ? ['2gis'] : []), 'menu', 'insta', 'logo', '2gis'];
      const bonus = [...new Set(rank)].slice(0, t.bonus);
      // пример вашей ниши: с ближайшей ступени (при равенстве — с меньшей); если он сделан на другой ступени, под ним об этом подпись
      const dTier = (d) => parseInt(d, 10); // «100-restaurant» → 100
      const demo = (CALC.niches[a.biz] || t.demos).slice().sort((x, y) => (Math.abs(dTier(x) - tier) - Math.abs(dTier(y) - tier)) || (dTier(x) - dTier(y)))[0];
      return { tier, mods, bonus, demo, up };
    }
    function qRender() { // результат на текущем языке
      const r = qPick;
      $('#qr-name').textContent = quoted(nameOfTier(r.tier)); $('#qr-price').textContent = '$' + r.tier;
      $('#qr-time').textContent = $('#tier-' + r.tier + ' .tierpanel__time b').textContent;
      $('#qr-lead').textContent = $('#tier-' + r.tier + ' .tierpanel__lead').textContent;
      const up = $('#qr-up'); up.hidden = !r.up;
      if (r.up) up.textContent = (r.tier < 70 ? dyn('quiz.up.low') : dyn('quiz.up')).replace('{n}', () => nameOfTier(350)).replace('{p}', '350'); // «Запись / заказ» — самая дешёвая ступень с записью и каталогом; ниже $70 формы заявки нет
      $('#qr-mods-row').hidden = !r.mods.length;
      // модули из подарка акции показываем так же, как в калькуляторе: бесплатными
      $('#qr-mods').textContent = r.mods.map((k) => nameOfMod(k) + (promoOn && CALC.tiers[r.tier].gift.includes(k) ? ' 🎁 ' + dyn('calc.free') : ' +$' + CALC.mods[k])).join(', ');
      $('#qr-bonus-row').hidden = !promoOn || !r.bonus.length;
      $('#qr-bonus').textContent = r.bonus.map(nameOfBonus).join(', ');
      const dTier = parseInt(r.demo, 10);
      const card = $('#tier-' + dTier + ' .demo[href="demos/' + r.demo + '/"]'); // карточка примера лежит в панели его ступени
      $('#qr-ex').hidden = !card;
      if (card) { $('#qr-ex-a').href = card.getAttribute('href'); $('#qr-ex-n').textContent = $('.demo__t', card).textContent; $('#qr-ex-c').textContent = $('.demo__c', card).textContent; }
      const note = $('#qr-ex-note'); note.hidden = !card || dTier === r.tier;
      if (!note.hidden) note.textContent = dyn('quiz.ex.note').replace('{n}', () => nameOfTier(dTier)).replace('{p}', String(dTier));
    }
    function qShow(n, focus) {
      qStep = n; qPick = null;
      qSteps.forEach((f, i) => { f.hidden = i + 1 !== n; });
      qRes.hidden = true; qTop.hidden = false;
      $('#quiz-n').textContent = String(n); $('#quiz-bar').style.transform = 'scaleX(' + (n / qSteps.length).toFixed(3) + ')';
      qBack.hidden = n === 1;
      $$('.qopt', qSteps[n - 1]).forEach((b) => b.setAttribute('aria-pressed', String(qAns[QKEYS[n - 1]] === b.dataset.v)));
      qLock = Date.now() + 350; // двойной щелчок не должен пролистать сразу два вопроса
      if (focus) { $('legend', qSteps[n - 1]).focus({ preventScroll: true }); $('#quiz-box').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); }
    }
    function qFinish() {
      qPick = qCompute(qAns);
      qSteps.forEach((f) => { f.hidden = true; }); qTop.hidden = true; qRes.hidden = false;
      qRender(); qLock = Date.now() + 350;
      $('#quiz-res-t').focus({ preventScroll: true }); $('#quiz-box').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    }
    quizEl.addEventListener('click', (e) => {
      const o = e.target.closest('.qopt'); if (!o || Date.now() < qLock) return;
      qAns[QKEYS[qStep - 1]] = o.dataset.v;
      if (qStep < qSteps.length) qShow(qStep + 1, true); else qFinish();
    });
    qBack.addEventListener('click', () => qShow(qStep - 1, true));
    $('#qr-again').addEventListener('click', () => { qAns = {}; qShow(1, true); });
    $('#qr-order').addEventListener('click', () => {
      const r = qPick;
      applyOrder({ type: 'site', budget: CALC.tiers[r.tier].bud, pack: '', mods: r.mods, bonus: promoOn ? r.bonus : [], spec: tierSpec(r.tier) });
    });
    $('#qr-calc').addEventListener('click', () => { calcSet({ tier: qPick.tier, mods: qPick.mods, bonus: promoOn ? qPick.bonus : [] }); scrollToEl(calcEl); $('#calc-h').focus({ preventScroll: true }); });
    langHooks.push(() => { if (qPick) qRender(); });
  }

  /* ---------- отзывы: настоящие — из js/reviews.js; пусто — честная карточка «Мы новая студия» и место под первый отзыв ---------- */
  const rvGrid = $('#rv-grid');
  if (rvGrid) {
    const url = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : ''); // только обычные ссылки
    const list = (Array.isArray(window.REVIEWS) ? window.REVIEWS : []).filter((r) => r && r.name && (r.text || url(r.video))); // имя и (текст или рабочая ссылка на видео)
    const make = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text) el.textContent = text; return el; };
    const slot = $('#rv-slot');
    list.forEach((r) => {
      const card = make('article', 'card rv');
      if (r.text) { const q = make('blockquote'); q.appendChild(make('p', '', r.text)); card.appendChild(q); }
      const who = make('footer', 'rv__who'); who.appendChild(make('b', '', r.name)); if (r.business) who.appendChild(make('span', '', r.business)); card.appendChild(who);
      const acts = make('div', 'rv__acts');
      [['video', 'rv.video'], ['site', 'rv.site']].forEach(([f, k]) => {
        if (!url(r[f])) return;
        const a = make('a', 'btn btn--ghost'); a.href = url(r[f]); a.target = '_blank'; a.rel = 'noopener noreferrer';
        const s = make('span'); s.dataset.dyn = k; s.textContent = dyn(k); a.appendChild(s); acts.appendChild(a);
      });
      if (acts.children.length) card.appendChild(acts);
      rvGrid.insertBefore(card, slot);
    });
    if (list.length) slot.hidden = true; // место под отзыв нужно, пока настоящих отзывов нет
  }

  /* ---------- старт ---------- */
  $('#year').textContent = new Date().getFullYear();
  let saved = ''; try { saved = localStorage.getItem('dorvan-lang') || ''; } catch (e) { /* private mode */ }
  setLang(new URLSearchParams(location.search).get('lang') || saved, false); // неизвестное значение — русский
  if (window.scrollY > 0) requestAnimationFrame(onScrollFrame); // открыли не с верха (восстановление прокрутки, якорь)
  // аврора — в простое после загрузки, анимации, привязанные к прокрутке, — с первой прокруткой (раньше они не видны):
  // первая отрисовка не ждёт ни больших градиентов, ни таймлайнов
  const lit = () => (window.requestIdleCallback || setTimeout)(() => { hero.classList.add('is-lit'); root.classList.add('grain'); }, { timeout: 2500 });
  if (document.readyState === 'complete') lit(); else addEventListener('load', lit, { once: true });
  addEventListener('scroll', () => root.classList.add('ready'), { once: true, passive: true });
})();
