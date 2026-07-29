const fs = require('fs');

const PRODUCTS_PER_PROFILE_CATEGORY = 8;

function safeDecodeModuleData(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

function extractGridModules(html) {
  const data = {};
  const regex = /module-title=(['"])([^'"]+)\1[^>]*module-data=(['"])([\s\S]*?)\3/gi;
  let match = regex.exec(html);
  while (match) {
    const moduleData = safeDecodeModuleData(match[4]);
    if (moduleData) data[match[2]] = moduleData;
    match = regex.exec(html);
  }
  return data;
}

function getNested(obj, ...keys) {
  return keys.reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function getProductId(item) {
  return item?.id || item?.productId || item?.detailId || item?.productID || null;
}

function uniqueProductIds(ids) {
  return [...new Set((ids || []).map(String).filter(Boolean))];
}

function collectLeafGroups(groups, out = []) {
  for (const item of groups || []) {
    if (item.children?.length) collectLeafGroups(item.children, out);
    else if (item.url) out.push(item);
  }
  return out;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://shengdeproduct.en.alibaba.com/productlist.html',
    },
  });
  return res.text();
}

function parseProductList(html) {
  const pageData = extractGridModules(html);
  return getNested(pageData, 'productListPc', 'mds', 'moduleData', 'data', 'productList') || [];
}

async function main() {
  const shopUrl = 'https://shengdeproduct.en.alibaba.com';
  const productlistHtml = fs.readFileSync(process.argv[2], 'utf8');
  const pageData = extractGridModules(productlistHtml);
  const groups = getNested(pageData, 'productGroups', 'mds', 'moduleData', 'data', 'groups') || [];
  const leaves = collectLeafGroups(groups);

  const results = [];
  for (const group of leaves) {
    const html = await fetchHtml(`${shopUrl}${group.url}`);
    const list = parseProductList(html);
    const ids = list.slice(0, PRODUCTS_PER_PROFILE_CATEGORY).map(getProductId).filter(Boolean);
    results.push({ name: group.name, url: group.url, count: ids.length, ids });
    await new Promise((r) => setTimeout(r, 250));
  }

  const rawIds = results.flatMap((r) => r.ids);
  console.log(
    JSON.stringify(
      {
        leafGroupCount: leaves.length,
        rawCount: rawIds.length,
        uniqueCount: uniqueProductIds(rawIds).length,
        perGroup: results.map((r) => ({ name: r.name, url: r.url, count: r.count })),
      },
      null,
      2,
    ),
  );
}

main();
