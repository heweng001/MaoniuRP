const fs = require('fs');
const path = require('path');

const PRODUCTS_PER_PROFILE_GROUP = 8;

function getNested(obj, ...keys) {
  return keys.reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function getProductId(item) {
  return item?.id || item?.productId || item?.detailId || item?.productID || null;
}

function extractProductsFromGroupNode(group) {
  const list = group?.products || group?.productList || group?.items || [];
  return Array.isArray(list) && list.length ? list : [];
}

function collectGroupProductIds(groups, limitPerGroup) {
  const ids = [];
  const walk = (items) => {
    for (const item of items || []) {
      if (item.children?.length) {
        walk(item.children);
        continue;
      }
      const products = extractProductsFromGroupNode(item);
      if (products.length) {
        ids.push(...products.slice(0, limitPerGroup).map(getProductId).filter(Boolean));
      }
    }
  };
  walk(groups);
  return ids;
}

function uniqueProductIds(ids) {
  return [...new Set((ids || []).map(String).filter(Boolean))];
}

function countLeafGroups(items) {
  let count = 0;
  const walk = (nodes) => {
    for (const item of nodes || []) {
      if (item.children?.length) walk(item.children);
      else if (extractProductsFromGroupNode(item).length) count += 1;
    }
  };
  walk(items);
  return count;
}

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
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(html.slice(jsonStart, i + 1));
      }
    }
  }
  return null;
}

function findProductsData(root) {
  const queue = [root];
  const seen = new Set();
  let best = null;

  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== 'object' || seen.has(node)) continue;
    seen.add(node);

    const groups =
      node.groups ||
      node.productGroups ||
      getNested(node, 'products', 'groups') ||
      getNested(node, 'products', 'productGroups');

    const hasGroupProducts = Array.isArray(groups) && groups.some((g) => extractProductsFromGroupNode(g).length);
    if (hasGroupProducts) {
      best = node.products && typeof node.products === 'object' ? node.products : node;
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') queue.push(value);
    }
  }

  return best;
}

const htmlPath = process.argv[2] || path.join(__dirname, '../../tmp_company_profile.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const shopBizData = extractShopBizData(html);

if (!shopBizData) {
  console.log(JSON.stringify({ error: '未找到 window.shopBizData' }, null, 2));
  process.exit(1);
}

const productsData = findProductsData(shopBizData);
if (!productsData) {
  const productKeys = Object.keys(shopBizData).filter((k) => /product/i.test(k));
  console.log(
    JSON.stringify(
      {
        error: '未在 shopBizData 中找到带 groups/products 的 products 板块',
        topKeys: Object.keys(shopBizData),
        productKeys,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const groups =
  productsData.groups ||
  productsData.productGroups ||
  getNested(productsData, 'products', 'groups') ||
  [];

const groupIds = collectGroupProductIds(groups, PRODUCTS_PER_PROFILE_GROUP);
const uniqueGroupIds = uniqueProductIds(groupIds);

console.log(
  JSON.stringify(
    {
      source: 'company_profile.html products section only (item 1 rule)',
      leafGroupCount: countLeafGroups(groups),
      groupIdsRaw: groupIds.length,
      uniqueGroupIds: uniqueGroupIds.length,
      note: '当前 v1.2.1 仅从 company_profile 抓取分组前8个；不再包含首页产品列表',
      groupIdsSample: groupIds.slice(0, 10),
    },
    null,
    2,
  ),
);
