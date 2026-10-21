/* Фото — Unsplash (hotlink, лицензия Unsplash: бесплатное использование, в т.ч. коммерческое).
   Значение — ID снимка на images.unsplash.com ИЛИ путь к своему файлу (img/cake.jpg, https://…).
   Чтобы заменить фото на собственные, поменяйте значение ключа — больше ничего трогать не нужно. */
var PHOTO = {
  /* торты */
  'choc-raspberry': '1567009349827-ab242f2c96e6',
  'medovik': '1713274786966-628fed3e41b0',
  'red-velvet': '1602630209855-dceac223adfe',
  'strawberry-cloud': '1650419424455-d0513aaf0dd6',
  'carrot': '1602095459485-3dc39c9b79f2',
  'napoleon': '1789583522267-a3b2022dc385',
  'black-forest': '1606890737304-57a1ca8a5b62',
  /* десерты */
  'pavlova': '1641848373324-bc744c442d5b',
  'eclair-caramel': '1774119637002-f14d666851f6',
  'eclair-choc': '1784841399281-40c323e95339',
  'tiramisu': '1714385905983-6f8e06fffae1',
  'cheesecake': '1777457668761-01b877207a78',
  'lemon-tart': '1519915028121-7d3463d20b13',
  'berry-tart': '1620980776848-84ac10194945',
  'brownie': '1570145820259-b5b80c5c8bd6',
  'meringue-roll': '1778634304525-8da563b420e8',
  /* макаронс */
  'macarons-6': '1558024920-b41e1887dc32',
  'macarons-12': '1766233420655-df6652fd2331',
  /* выпечка */
  'croissant': '1787069943470-66fd161e100a',
  'almond-croissant': '1759303380903-11154bc5d5bf',
  'cinnamon-roll': '1686207855146-c3ffe2166d40',
  'baklava': '1778448806128-18e8354356e1',
  'cookies': '1634188023615-7e08901193b6',
  'cupcake': '1599785209796-786432b228bc',
  'donut': '1626094309830-abbb0c99da4a',
  /* напитки */
  'cappuccino': '1502462041640-b3d7e50d0662',
  'latte': '1758417675725-104b6aab1602',
  /* галерея и сайт */
  'g-drip-pink': '1554163328-61681c4f303f',
  'g-drip-macaron': '1562440499-64c9a111f713',
  'g-drip-white': '1677840147140-252adb9ca347',
  'g-naked-figs': '1565661834013-d196ca46e14e',
  'g-display': '1776797142667-dcee509ff200',
  'g-tray': '1762032313029-7d799c618eae',
  'g-latte-croissant': '1763647872237-c76e660cf38b',
  'g-dessert-table': '1561940329-7382e6704231',
  'g-gift-macarons': '1775327278508-beb3308fcca6',
  'g-baker': '1532635224-cf024e66d122',
  'g-bday': '1558301211-0d8c8ddee6ec',
  /* вкусы Таджикистана */
  'l-pomegranate': '1615485925600-97237c4fc1ec',
  'l-pomegranate-seeds': '1654648742474-7f22ca616d0b',
  'l-apricot-dried': '1781773338966-373f0b949645',
  'l-honey': '1613548058193-1cd24c1bebcf',
  'l-pistachio': '1704079662049-d00890d21a69',
  'l-mulberry': '1778620062251-09a2447ddfdc',
  'l-market': '1666562680749-d1e42974c3dc',
  /* Душанбе */
  'p-somoni': '1728288154153-edf28e2400a7',
  'p-lake': '1788070637906-1807af262661'
};

/* photo('croissant', 600) → URL нужной ширины (Unsplash отдаёт webp/avif сам) */
function photo(key, w) {
  var v = PHOTO[key] || key;
  if (v.indexOf('/') > -1 || v.indexOf('.') > -1) return v;
  return 'https://images.unsplash.com/photo-' + v + '?auto=format&fit=crop&w=' + (w || 800) + '&q=72';
}
