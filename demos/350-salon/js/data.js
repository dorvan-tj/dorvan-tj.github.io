/* Iris beauty studio — «Концепт»: все данные вымышленные.
   Один источник правды: из него берут услуги и мастеров страницы «Услуги», «Мастера» и онлайн-запись.
   Файл обычный (не модуль), поэтому сайт открывается и двойным щелчком из папки. */
(function (root) {
  var DATA = {
    brand: {
      name: "Iris",
      full: "Iris beauty studio",
      city: "Душанбе",
      address: "Душанбе, ул. Образцовая, 7",
      addressNote: "адрес для примера",
      phone: "+992 37 000 55 66",
      phoneHref: "tel:+992370005566",
      telegram: "@iris_demo",
      instagram: "@iris.demo",
      mail: "hello@iris.example",
      hours: "Ежедневно с 10:00 до 20:00",
    },

    // Рабочий день: слоты каждые 30 минут с 10:00 до 20:00
    day: { from: 10 * 60, to: 20 * 60, step: 30 },

    categories: [
      { id: "hair", name: "Волосы", text: "Стрижки, окрашивание, укладки и уход", photo: "img/cat-hair.webp" },
      { id: "nails", name: "Ногти", text: "Маникюр, педикюр, дизайн", photo: "img/cat-nails.webp" },
      { id: "face", name: "Лицо", text: "Чистка, пилинг и уход", photo: "img/cat-face.webp" },
      { id: "brows", name: "Брови и ресницы", text: "Коррекция, ламинирование, наращивание", photo: "img/cat-brows.webp" },
      { id: "makeup", name: "Макияж", text: "Дневной, вечерний и свадебный", photo: "img/cat-makeup.webp" },
    ],

    // off — выходные дни недели (0 — воскресенье)
    masters: [
      { id: "dilnoza", name: "Дилноза", role: "Стилист-колорист", exp: "9 лет в профессии", cats: ["hair"], off: [0], photo: "img/master-dilnoza.webp",
        bio: "Подбирает цвет и форму под черты лица и образ жизни. Любит мягкие переходы и естественный результат." },
      { id: "saida", name: "Саида", role: "Стилист", exp: "6 лет в профессии", cats: ["hair"], off: [1], photo: "img/master-saida.webp",
        bio: "Делает стрижки, укладки и уходы. Объясняет, как повторить укладку дома за пять минут." },
      { id: "firuz", name: "Фируз", role: "Барбер", exp: "7 лет в профессии", cats: ["hair"], off: [0], photo: "img/master-firuz.webp",
        bio: "Мужские стрижки и оформление бороды. Чёткие линии, аккуратный результат, без лишних разговоров, если вы торопитесь." },
      { id: "madina", name: "Мадина", role: "Мастер маникюра и педикюра", exp: "8 лет в профессии", cats: ["nails"], off: [1], photo: "img/master-madina.webp",
        bio: "Ровное покрытие, аккуратная кутикула и дизайн от минимализма до яркого. Каждый инструмент стерилизуется перед визитом." },
      { id: "zarina", name: "Зарина", role: "Косметолог", exp: "10 лет в профессии", cats: ["face"], off: [0], photo: "img/master-zarina.webp",
        bio: "Подбирает уход по типу кожи, честно говорит, что нужно, а что можно пропустить." },
      { id: "nigina", name: "Нигина", role: "Бровист, лэш-мастер, визажист", exp: "7 лет в профессии", cats: ["brows", "makeup"], off: [2], photo: "img/master-nigina.webp",
        bio: "Брови, ресницы и макияж для будней, праздников и свадеб. Макияж держится весь день." },
    ],

    // masters — кто выполняет услугу; min — длительность в минутах; price — в сомони
    services: [
      { id: "cut-w", cat: "hair", name: "Женская стрижка", text: "Консультация, мытьё головы, стрижка и укладка", min: 60, price: 180, masters: ["dilnoza", "saida"] },
      { id: "cut-m", cat: "hair", name: "Мужская стрижка", text: "Стрижка машинкой и ножницами, укладка", min: 45, price: 120, masters: ["firuz"] },
      { id: "beard", cat: "hair", name: "Оформление бороды", text: "Форма, горячее полотенце, уход", min: 30, price: 80, masters: ["firuz"] },
      { id: "color", cat: "hair", name: "Окрашивание в один тон", text: "Корни или вся длина, уход после окрашивания", min: 150, price: 520, masters: ["dilnoza", "saida"] },
      { id: "balayage", cat: "hair", name: "Сложное окрашивание", text: "Балаяж, airtouch, мелирование", min: 240, price: 1150, masters: ["dilnoza"] },
      { id: "styling", cat: "hair", name: "Укладка", text: "Локоны, объём или гладкая укладка на праздник", min: 45, price: 150, masters: ["dilnoza", "saida"] },
      { id: "hair-care", cat: "hair", name: "Восстановление волос", text: "Маска, прогрев и бережный уход", min: 90, price: 380, masters: ["dilnoza", "saida"] },

      { id: "mani", cat: "nails", name: "Маникюр классический", text: "Обработка, форма, уход за кутикулой", min: 60, price: 110, masters: ["madina"] },
      { id: "mani-gel", cat: "nails", name: "Маникюр с гель-лаком", text: "Обработка и стойкое покрытие на 3–4 недели", min: 90, price: 170, masters: ["madina"] },
      { id: "pedi", cat: "nails", name: "Педикюр с покрытием", text: "Аппаратная обработка и покрытие гель-лаком", min: 100, price: 230, masters: ["madina"] },
      { id: "nail-ext", cat: "nails", name: "Наращивание и дизайн", text: "Коррекция формы, дизайн на выбор", min: 150, price: 280, masters: ["madina"] },

      { id: "clean", cat: "face", name: "Чистка лица", text: "Ультразвуковая или комбинированная, маска, крем", min: 75, price: 320, masters: ["zarina"] },
      { id: "peel", cat: "face", name: "Пилинг", text: "Мягкое обновление кожи, подобранное по типу", min: 45, price: 240, masters: ["zarina"] },
      { id: "glow", cat: "face", name: "Уход «Сияние»", text: "Массаж лица, маска и сыворотка", min: 60, price: 290, masters: ["zarina"] },

      { id: "brow", cat: "brows", name: "Коррекция и окрашивание бровей", text: "Форма и цвет, которые подходят вашему лицу", min: 40, price: 110, masters: ["nigina"] },
      { id: "brow-lam", cat: "brows", name: "Ламинирование бровей", text: "Ровные уложенные брови на 4–6 недель", min: 50, price: 160, masters: ["nigina"] },
      { id: "lash", cat: "brows", name: "Наращивание ресниц", text: "Классика или 2D, эффект выбираете вы", min: 120, price: 240, masters: ["nigina"] },

      { id: "mk-day", cat: "makeup", name: "Дневной макияж", text: "Лёгкий естественный образ", min: 45, price: 160, masters: ["nigina"] },
      { id: "mk-eve", cat: "makeup", name: "Вечерний макияж", text: "Выразительный образ для праздника", min: 60, price: 220, masters: ["nigina"] },
      { id: "mk-bride", cat: "makeup", name: "Свадебный макияж с пробным", text: "Пробный визит и образ в день свадьбы", min: 90, price: 380, masters: ["nigina"] },
    ],

    popular: ["mani-gel", "cut-w", "color", "brow-lam"],
  };

  /* ---------- Свободное время (в демо — придуманное, но всегда одинаковое для одного дня) ---------- */

  // Стабильное «случайное» число 0…1 из строки: один и тот же слот всегда занят или свободен одинаково
  function rnd(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ((h2 >>> 0) * 4294967296 + (h1 >>> 0)) / 18446744073709551616;
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function hhmm(min) { return pad(Math.floor(min / 60)) + ":" + pad(min % 60); }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  /* ---------- Память демо: только этот браузер, никуда не отправляется ----------
     Записи с сайта, статусы и выходные из демо-админки лежат в localStorage под одним ключом. Сайт и админка читают его одинаково,
     поэтому выходной в админке сразу убирает окна в онлайн-записи, а запись с сайта сразу появляется в админке.
     off[мастер] — даты выходных, поставленные в админке; bookings — записи; seedDay — день, на который созданы примеры. */
  var STORE_KEY = "dorvan-demo-iris-v1";
  var memStore = null; // если браузер не даёт сохранять (закрытый режим), демо работает в пределах одной страницы
  var cacheRaw = null, cacheObj = null;
  var idSeq = 0;
  function emptyStore() { return { v: 1, bookings: [], off: {}, seedDay: "" }; }
  // Из памяти берём только записи и выходные правильной формы: после старой версии демо там может лежать что угодно,
  // а одна «кривая» запись не должна ломать сайт и админку.
  var STATUS_OK = { "new": 1, confirmed: 1, done: 1, cancelled: 1 };
  var RX_DATE = /^\d{4}-\d{2}-\d{2}$/, RX_TIME = /^\d{2}:\d{2}$/;
  function cleanStore(o) {
    var out = emptyStore();
    if (!o || o.v !== 1 || !Array.isArray(o.bookings) || !o.off || typeof o.off !== "object") return out;
    out.seedDay = typeof o.seedDay === "string" ? o.seedDay.slice(0, 10) : "";
    o.bookings.forEach(function (b) {
      if (!b || typeof b !== "object" || typeof b.id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(b.id)) return;
      if (!RX_DATE.test(b.date) || !RX_TIME.test(b.time) || !byId(DATA.services, b.service) || !byId(DATA.masters, b.master)) return;
      if (!(b.min > 0 && b.min <= 600) || !STATUS_OK[b.status]) return;
      out.bookings.push({ id: b.id, service: b.service, master: b.master, date: b.date, time: b.time, min: +b.min, price: +b.price || 0,
        name: String(b.name || "").slice(0, 80), phone: String(b.phone || "").slice(0, 30), comment: String(b.comment || "").slice(0, 400),
        status: b.status, created: +b.created || 0, example: !!b.example, touched: !!b.touched });
    });
    Object.keys(o.off).forEach(function (m) {
      if (!byId(DATA.masters, m) || !Array.isArray(o.off[m])) return;
      var days = o.off[m].filter(function (x) { return typeof x === "string" && RX_DATE.test(x); });
      if (days.length) out.off[m] = days;
    });
    return out;
  }
  function readStore() {
    if (memStore) return memStore; // браузер не даёт сохранять — живём в памяти страницы
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return emptyStore(); }
    if (raw === cacheRaw && cacheObj) return cacheObj;
    var obj;
    try { obj = cleanStore(JSON.parse(raw)); } catch (e) { obj = emptyStore(); }
    cacheRaw = raw; cacheObj = obj;
    return obj;
  }
  /** Изменить память: fn получает копию, результат записывается целиком */
  function updateStore(fn) {
    var s = JSON.parse(JSON.stringify(readStore()));
    fn(s);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); memStore = null; }
    catch (e) { memStore = s; }
    return s;
  }
  function storeWorks() {
    try { localStorage.setItem(STORE_KEY + "-t", "1"); localStorage.removeItem(STORE_KEY + "-t"); return true; } catch (e) { return false; }
  }
  function resetStore() {
    memStore = null; cacheRaw = null; cacheObj = null;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* нечего чистить */ }
  }
  function addBooking(b) {
    var rec = Object.assign({ status: "new", created: Date.now(), comment: "" }, b);
    rec.id = "b" + Date.now().toString(36) + (idSeq++).toString(36) + Math.floor(Math.random() * 1296).toString(36); // счётчик: примеры создаются в одну миллисекунду
    updateStore(function (s) { s.bookings.push(rec); });
    return rec;
  }
  function isOff(masterId, date) { // выходной, поставленный в админке
    var list = readStore().off[masterId];
    return !!list && list.indexOf(iso(date)) !== -1;
  }
  function bookedCells(masterId, date) { // ячейки по 30 минут, занятые записями из демо (отменённые время не держат)
    var day = iso(date), cells = [];
    readStore().bookings.forEach(function (b) {
      if (b.master !== masterId || b.date !== day || b.status === "cancelled") return;
      var p = b.time.split(":");
      var start = (+p[0] * 60 + +p[1] - DATA.day.from) / DATA.day.step;
      for (var j = 0; j < Math.ceil(b.min / DATA.day.step); j++) cells.push(start + j);
    });
    return cells;
  }

  /* Занятость мастера на день. Записи идут «блоками» по 1–2 часа, как в настоящем расписании, — поэтому и длинные услуги
     (например, окрашивание на 4 часа) находят окна. День делится на 4 «полосы» по 2,5 часа; в каждой полосе с вероятностью 60 %
     есть одна запись. Раз в неделю у мастера «лёгкий» день: первые пять часов свободны (так в любые две недели есть окно). */
  function weekStart(date) { // понедельник той недели, в которую попадает день
    return iso(new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7)));
  }
  function isLightDay(m, date) {
    var work = [1, 2, 3, 4, 5, 6, 0].filter(function (w) { return m.off.indexOf(w) === -1; });
    return date.getDay() === work[Math.floor(rnd(m.id + "|" + weekStart(date) + "|light") * work.length)];
  }
  function busyCells(m, date) {
    var n = (DATA.day.to - DATA.day.from) / DATA.day.step; // ячеек по 30 минут
    var band = n / 4;
    var busy = [];
    for (var i = 0; i < n; i++) busy.push(false);
    var key = m.id + "|" + iso(date);
    var light = isLightDay(m, date);
    for (var b = 0; b < 4; b++) {
      if (light && b < 2) continue;
      if (rnd(key + "|band" + b) < 0.4) continue; // полоса свободна целиком
      var len = 2 + Math.floor(rnd(key + "|len" + b) * 3); // запись на 1, 1,5 или 2 часа
      var start = b * band + Math.floor(rnd(key + "|at" + b) * (band - Math.min(len, band) + 1));
      for (var j = 0; j < len && start + j < n; j++) busy[start + j] = true;
    }
    return busy;
  }

  /** Список слотов мастера на день для услуги: [{ time: "14:30", free: true }] */
  function slots(masterId, date, service, now) {
    now = now || new Date();
    var m = byId(DATA.masters, masterId);
    var out = [];
    if (!m || m.off.indexOf(date.getDay()) !== -1 || isOff(m.id, date)) return out;
    var need = Math.ceil(service.min / DATA.day.step);
    var busy = busyCells(m, date);
    bookedCells(m.id, date).forEach(function (i) { if (i >= 0 && i < busy.length) busy[i] = true; });
    var day = iso(date);
    var past = day < iso(now); // прошедшие дни записать нельзя (вкладку могли оставить открытой с вечера)
    var nowMin = now.getHours() * 60 + now.getMinutes() + 60; // записываем минимум за час
    for (var i = 0; i < busy.length; i++) {
      var t = DATA.day.from + i * DATA.day.step;
      var ok = !past && i + need <= busy.length;
      for (var j = 0; ok && j < need; j++) if (busy[i + j]) ok = false;
      if (day === iso(now) && t < nowMin) ok = false;
      out.push({ time: hhmm(t), free: ok });
    }
    return out;
  }

  /** Слоты на день: для конкретного мастера или «любого» из тех, кто делает услугу */
  function daySlots(masterId, date, service, now) {
    if (masterId && masterId !== "any") {
      return slots(masterId, date, service, now).map(function (s) { s.master = masterId; return s; });
    }
    var merged = {};
    var order = [];
    service.masters.forEach(function (mid) {
      slots(mid, date, service, now).forEach(function (s) {
        if (!merged[s.time]) { merged[s.time] = { time: s.time, free: false, master: null }; order.push(s.time); }
        if (s.free && !merged[s.time].free) { merged[s.time].free = true; merged[s.time].master = mid; }
      });
    });
    return order.map(function (t) { return merged[t]; });
  }

  function freeCount(masterId, date, service, now) {
    return daySlots(masterId, date, service, now).filter(function (s) { return s.free; }).length;
  }

  /** Ближайшее свободное окно среди всех мастеров для услуги (для плашки на главной) */
  function nearest(serviceId, now) {
    now = now || new Date();
    var s = byId(DATA.services, serviceId);
    for (var d = 0; d < 14; d++) {
      var date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      var list = daySlots("any", date, s, now).filter(function (x) { return x.free; });
      if (list.length) return { date: date, time: list[0].time, master: list[0].master, service: s, days: d };
    }
    return null;
  }

  /* ---------- Русская типографика ----------
     Короткие слова, числа и тире склеиваются с соседним словом неразрывным пробелом: «до 20:00», «3–4 недели», «ул. Образцовая, 7»
     не рвутся посередине. Применяется к данным один раз при загрузке и к готовым страницам при сборке (build-pages.mjs). */
  var NB = " ";
  var SHORT_WORD = /(^|[\s(«"„—–-])([а-яёА-ЯЁ]{1,2}) (?=\S)/g;
  function glue(s) {
    var prev;
    do {
      prev = s;
      s = s.replace(SHORT_WORD, "$1$2" + NB);
    } while (s !== prev);
    return s
      .replace(/(\d) (?=[\dа-яёА-Яa-zA-Z])/g, "$1" + NB)
      .replace(/(^|[\s(])(ул|пр|д|г|стр)\. /g, "$1$2." + NB)
      .replace(/, (?=\d)/g, "," + NB)
      .replace(/(\d)–(?=\d)/g, "$1–⁠") // «3–4»: после тире не переносим (невидимый «соединитель слов»)
      .replace(/ ([—–]) /g, NB + "$1 ");
  }
  function deep(v) {
    if (typeof v === "string") return glue(v);
    if (Array.isArray(v)) return v.map(deep);
    if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { o[k] = deep(v[k]); }); return o; }
    return v;
  }
  DATA = deep(DATA);

  DATA.util = { rnd: rnd, iso: iso, hhmm: hhmm, byId: byId, slots: slots, daySlots: daySlots, freeCount: freeCount, nearest: nearest, glue: glue,
    store: { KEY: STORE_KEY, get: readStore, update: updateStore, reset: resetStore, works: storeWorks, add: addBooking, isOff: isOff } };

  if (typeof module !== "undefined" && module.exports) module.exports = DATA;
  else root.IRIS = DATA;
})(typeof window !== "undefined" ? window : this);
