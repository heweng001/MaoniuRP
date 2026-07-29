const fs = require('fs');

function extractShopBizData(html) {
  const marker = 'window.shopBizData = ';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const jsonStart = start + marker.length;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = jsonStart; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(jsonStart, i + 1));
    }
  }
  return null;
}

function getProductId(item) {
  return item?.id || item?.productId || item?.detailId || item?.productID || null;
}

function uniqueProductIds(ids) {
  return [...new Set((ids || []).map(String).filter(Boolean))];
}

function collectAllProductCategoriesIds(categories) {
  const ids = [];
  for (const category of categories || []) {
    const products = category?.products || category?.productList || [];
    if (Array.isArray(products) && products.length) {
      ids.push(...products.map(getProductId).filter(Boolean));
    }
  }
  return ids;
}

function countFromHtml(html) {
  const shopBizData = extractShopBizData(html);
  if (!shopBizData?.pageModuleMap) {
    return { error: 'no shopBizData' };
  }
  const mod = Object.values(shopBizData.pageModuleMap).find(
    (m) => m?.moduleName === 'productCategories',
  );
  const categories = mod?.moduleData?.categories || [];
  const rawIds = collectAllProductCategoriesIds(categories);
  const perCategory = categories.map((cat) => ({
    title: cat.title || cat.categoryId,
    count: (cat.products || []).length,
  }));
  return {
    categoryCount: categories.length,
    rawCount: rawIds.length,
    uniqueCount: uniqueProductIds(rawIds).length,
    perCategory,
    uniqueIds: uniqueProductIds(rawIds),
  };
}

const htmlPath = process.argv[2];
if (!htmlPath || !fs.existsSync(htmlPath)) {
  console.log(JSON.stringify({ error: 'HTML file missing or captcha page' }, null, 2));
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
if (html.includes('"action": "captcha"') || html.includes('punish-component')) {
  console.log(JSON.stringify({ error: 'captcha page', size: html.length }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(countFromHtml(html), null, 2));
