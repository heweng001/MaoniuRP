const fs = require('fs');

const PRODUCTS_PER_PROFILE_GROUP = 8;

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

function countWithProductCategories(categories) {
  const perGroup = [];
  for (const cat of categories || []) {
    const products = cat.products || [];
    if (!products.length) continue;
    const picked = products.slice(0, PRODUCTS_PER_PROFILE_GROUP).map(getProductId).filter(Boolean);
    perGroup.push({
      title: cat.title || cat.categoryId,
      totalProductsInGroup: products.length,
      picked: picked.length,
      ids: picked,
    });
  }
  const groupIdsRaw = perGroup.flatMap((g) => g.ids);
  return {
    perGroup,
    groupIdsRaw: groupIdsRaw.length,
    uniqueGroupIds: uniqueProductIds(groupIdsRaw).length,
  };
}

const html = fs.readFileSync(process.argv[2], 'utf8');
const shopBizData = extractShopBizData(html);
const mod = Object.values(shopBizData?.pageModuleMap || {}).find(
  (m) => m?.moduleName === 'productCategories',
);
const categories = mod?.moduleData?.categories || [];
const result = countWithProductCategories(categories);

console.log(
  JSON.stringify(
    {
      shop: 'https://shengdeproduct.en.alibaba.com/company_profile.html',
      pageFormat: 'Silkworm / shopBizData.productCategories',
      categoryCount: categories.length,
      groupsWithProducts: result.perGroup.length,
      groupIdsRaw: result.groupIdsRaw,
      uniqueGroupIds: result.uniqueGroupIds,
      perGroup: result.perGroup.map((g) => ({
        title: g.title,
        totalProductsInGroup: g.totalProductsInGroup,
        picked: g.picked,
      })),
      currentCodeWouldParse: 0,
      currentCodeReason:
        '现有解析器只读 module-data 里的 icbu-pc-products/groups，此页已改为 shopBizData.pageModuleMap.productCategories',
    },
    null,
    2,
  ),
);
