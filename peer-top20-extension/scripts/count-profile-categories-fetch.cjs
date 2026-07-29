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

function extractModuleByName(html, moduleName) {
  const patterns = [
    new RegExp(`module-name=['"]${moduleName}['"][^>]*module-data=['"]([^'"]+)['"]`, 'i'),
    new RegExp(`module-data=['"]([^'"]+)['"][^>]*module-name=['"]${moduleName}['"]`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const parsed = safeDecodeModuleData(match[1]);
      if (parsed) return parsed;
    }
  }
  return null;
}

function getNested(obj, ...keys) {
  return keys.reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function getProductListFromModule(moduleData) {
  return getNested(moduleData, 'mds', 'moduleData', 'data', 'productList') || [];
}

function getProductId(item) {
  return item?.id || item?.productId || item?.detailId || item?.productID || null;
}

function uniqueProductIds(ids) {
  return [...new Set((ids || []).map(String).filter(Boolean))];
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

function resolveProductCategories(html) {
  const shopBizData = extractShopBizData(html);
  if (!shopBizData?.pageModuleMap) return null;
  const module = Object.values(shopBizData.pageModuleMap).find(
    (m) => m?.moduleName === 'productCategories',
  );
  return module?.moduleData?.categories || null;
}

function resolveCategoryPagePath(category) {
  const rawUrl = category?.url || category?.groupUrl || category?.link || category?.href;
  if (rawUrl) {
    if (rawUrl.startsWith('http')) {
      try {
        return new URL(rawUrl).pathname;
      } catch {
        return rawUrl;
      }
    }
    return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  }
  const id = category?.id || category?.groupId || category?.categoryId;
  if (id && String(id).toLowerCase() !== 'all' && /^\d+$/.test(String(id))) {
    return `/productgrouplist-${id}.html`;
  }
  return null;
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

function parseProductListFromHtml(html) {
  const pageData = extractGridModules(html);
  const moduleData =
    pageData.productListPc || extractModuleByName(html, 'icbu-pc-productListPc');
  return getProductListFromModule(moduleData);
}

async function fetchCategoryProductIds(shopUrl, category) {
  const inline = (category?.products || category?.productList || [])
    .map(getProductId)
    .filter(Boolean)
    .slice(0, PRODUCTS_PER_PROFILE_CATEGORY);

  const pagePath = resolveCategoryPagePath(category);
  if (pagePath) {
    try {
      const html = await fetchHtml(`${shopUrl}${pagePath}`);
      const list = parseProductListFromHtml(html);
      const pageIds = list.slice(0, PRODUCTS_PER_PROFILE_CATEGORY).map(getProductId).filter(Boolean);
      if (pageIds.length) {
        return {
          title: category.title || category.categoryId,
          pagePath,
          source: 'page',
          ids: pageIds,
        };
      }
    } catch (error) {
      /* fallback inline */
    }
  }

  return {
    title: category.title || category.categoryId,
    pagePath: pagePath || '(inline)',
    source: 'inline',
    ids: inline,
  };
}

async function main() {
  const shopUrl = 'https://shengdeproduct.en.alibaba.com';
  let profileHtml = '';
  const profilePath = process.argv[2];
  if (profilePath && fs.existsSync(profilePath)) {
    profileHtml = fs.readFileSync(profilePath, 'utf8');
  } else {
    profileHtml = await fetchHtml(`${shopUrl}/company_profile.html`);
  }

  const categories = resolveProductCategories(profileHtml);
  if (!categories?.length) {
    console.log(JSON.stringify({ error: 'no productCategories', captcha: profileHtml.includes('captcha') }, null, 2));
    process.exit(1);
  }

  const results = [];
  for (const category of categories) {
    results.push(await fetchCategoryProductIds(shopUrl, category));
    await new Promise((r) => setTimeout(r, 300));
  }

  const rawIds = results.flatMap((r) => r.ids);
  const uniqueIds = uniqueProductIds(rawIds);

  console.log(
    JSON.stringify(
      {
        shop: `${shopUrl}/company_profile.html`,
        categoryCount: categories.length,
        rawCount: rawIds.length,
        uniqueCount: uniqueIds.length,
        perCategory: results.map((r) => ({
          title: r.title,
          pagePath: r.pagePath,
          source: r.source,
          count: r.ids.length,
        })),
        sampleCategoryFields: Object.keys(categories[1] || categories[0] || {}),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
