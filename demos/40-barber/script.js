/* Ступень $40: шапка, меню, появление блоков, «открыто сейчас», галерея с просмотром, карта, подсказка. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // шапка получает фон, когда страницу прокрутили
  var hdr = $('#hdr');
  function onScroll() { hdr.classList.toggle('is-stuck', window.scrollY > 24); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // меню на телефоне закрывается после выбора раздела и по Esc
  var menu = $('.menu');
  if (menu) {
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu.open = false; });
  }

  // плавное появление блоков
  var rv = $$('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  // «открыто сейчас» по времени Душанбе (UTC+5): плашка на главном экране, карточка и строка таблицы
  var box = $('#hours');
  if (box) {
    var hours = JSON.parse(box.getAttribute('data-hours'));
    var ACC = ['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье'];
    var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var toMin = function (s) { var p = s.split(':'); return +p[0] * 60 + +p[1]; };
    var now = function () {
      try {
        var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dushanbe', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
        var g = function (t) { return parts.filter(function (p) { return p.type === t; })[0].value; };
        return { day: WD.indexOf(g('weekday')), min: +g('hour') * 60 + +g('minute') };
      } catch (e) {
        var d = new Date();
        return { day: (d.getDay() + 6) % 7, min: d.getHours() * 60 + d.getMinutes() };
      }
    };
    var state = function () {
      var n = now(), t = hours[n.day];
      if (t && n.min >= toMin(t[0]) && n.min < toMin(t[1])) return { open: true, big: 'Сейчас открыто', short: 'Открыто до ' + t[1], sub: 'Сегодня до ' + t[1] };
      var when;
      if (t && n.min < toMin(t[0])) when = 'сегодня в ' + t[0];
      else {
        for (var i = 1; i <= 7; i++) {
          var d = (n.day + i) % 7;
          if (hours[d]) { when = (i === 1 ? 'завтра' : ACC[d]) + ' в ' + hours[d][0]; break; }
        }
      }
      return { open: false, big: 'Сейчас закрыто', short: 'Закрыто · откроемся ' + when, sub: 'Откроемся ' + when };
    };
    var s = state();
    var set = function (sel, text) { $$(sel).forEach(function (el) { el.textContent = text; }); };
    set('[data-status="short"]', s.short);
    set('[data-status="big"]', s.big);
    set('[data-status="sub"]', s.sub);
    $$('[data-status-dot]').forEach(function (el) { el.classList.toggle('off', !s.open); });
    var rows = $$('#hours tbody tr');
    if (rows[now().day]) rows[now().day].setAttribute('aria-current', 'date');
  }

  // галерея: просмотр фото, стрелки на клавиатуре, Esc закрывает
  var items = $$('.g-item'), dlg = $('#lb');
  if (items.length && dlg && dlg.showModal) {
    var img = $('img', dlg), cap = $('.lb-cap', dlg), cnt = $('.lb-count', dlg), cur = 0;
    var show = function (i) {
      cur = (i + items.length) % items.length;
      var b = items[cur], im = $('img', b);
      img.src = im.currentSrc || im.src;
      img.alt = im.alt;
      cap.textContent = b.getAttribute('data-cap') || '';
      cnt.textContent = (cur + 1) + ' / ' + items.length;
    };
    items.forEach(function (b, i) { b.addEventListener('click', function () { show(i); dlg.showModal(); }); });
    $('.lb-prev', dlg).addEventListener('click', function () { show(cur - 1); });
    $('.lb-next', dlg).addEventListener('click', function () { show(cur + 1); });
    $('.lb-close', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (!e.target.closest('img, button')) dlg.close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });
    // на телефоне листаем свайпом
    var x0 = null;
    dlg.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    });
  }

  // карта не перехватывает прокрутку страницы, пока по ней не нажмут
  var guard = $('.map-guard');
  if (guard) guard.addEventListener('click', function () {
    guard.classList.add('off');
    var f = $('.map-frame iframe'); if (f) f.removeAttribute('tabindex');
  });

  // подсказка вместо перехода по вымышленным контактам (кнопки с data-demo)
(function () {
  var t = document.getElementById('toast'), timer;
  var M = { tg: 'здесь откроется чат в Telegram вашего бизнеса', wa: 'здесь откроется WhatsApp вашего бизнеса', call: 'здесь начнётся звонок на ваш номер' };
  function hide() { t.classList.remove('on'); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-demo]');
    if (!a) { hide(); return; }
    e.preventDefault();
    t.innerHTML = '<span>Концепт: ' + M[a.getAttribute('data-demo')] + '.</span> <a href="' + t.getAttribute('data-want') + '" target="_blank" rel="noopener">Хочу такой&nbsp;→</a>';
    t.classList.add('on');
    clearTimeout(timer); timer = setTimeout(hide, 9000);
  });
})();
})();
