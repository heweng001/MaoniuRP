const fs = require('fs');

function parseList(html) {
  const regex = /module-title=(['"])productListPc\1[^>]*module-data=(['"])([\s\S]*?)\2/i;
  const m = html.match(regex);
  if (!m) return [];
  const d = JSON.parse(decodeURIComponent(m[3]));
  return d.mds.moduleData.data.productList || [];
}

const groups = [
  ['All', null],
  ['Main Product', '/productgrouplist-958968350/Main_Product.html'],
  ['Hot Sales', '/productgrouplist-950308838/Hot_Sales.html'],
  ['Yoga Mat Series', '/productgrouplist-940867730/Yoga_Mat_Series.html'],
  ['Yoga Accessories', '/productgrouplist-940819848/Yoga_Accessories.html'],
  ['Fitness Series', '/productgrouplist-940824635/Fitness_Series.html'],
  ['Home Series', '/productgrouplist-940906069/Home_Series.html'],
  ['Outdoor Series', '/productgrouplist-946819552/Outdoor_Series.html'],
  ['Health Massage Equipment Series', '/productgrouplist-941131522/Health_Massage_Equipment_Series.html'],
  ['Swimming Equipment', '/productgrouplist-940819851/Swimming_Equipment.html'],
  ['Sports Safety', '/productgrouplist-940493210/Sports_Safety.html'],
];

async function fetchHtml(path) {
  const url = path
    ? `https://shengdeproduct.en.alibaba.com${path}`
    : 'https://shengdeproduct.en.alibaba.com/productlist-1.html?filter=all';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://shengdeproduct.en.alibaba.com/productlist.html',
    },
  });
  return res.text();
}

function getProductId(item) {
  return item?.id || item?.productId || item?.detailId || null;
}

(async () => {
  const results = [];
  for (const [title, path] of groups) {
    const html = await fetchHtml(path);
    const list = parseList(html);
    const ids = list.slice(0, 8).map(getProductId).filter(Boolean);
    results.push({ title, path: path || '/productlist-1.html?filter=all', count: ids.length, ids });
    await new Promise((r) => setTimeout(r, 250));
  }
  const raw = results.flatMap((r) => r.ids);
  const unique = [...new Set(raw)];
  console.log(
    JSON.stringify(
      {
        rawCount: raw.length,
        uniqueCount: unique.length,
        perCategory: results.map((r) => ({ title: r.title, count: r.count })),
      },
      null,
      2,
    ),
  );
})();
