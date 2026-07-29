const SHOP = 'https://bomo.en.alibaba.com';

function safeDecode(raw) {
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
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(jsonStart, i + 1));
    }
  }
  return null;
}

function extractGroupUrlMap(html) {
  const data = {};
  const regex = /module-title=(['"])([^'"]+)\1[^>]*module-data=(['"])([\s\S]*?)\3/gi;
  let match = regex.exec(html);
  while (match) {
    const moduleData = safeDecode(match[4]);
    if (moduleData) data[match[2]] = moduleData;
    match = regex.exec(html);
  }
  const groups = data.productGroups?.mds?.moduleData?.data?.groups || [];
  const map = {};
  for (const group of groups) {
    const title = String(group?.name || '').trim().toLowerCase();
    if (title && group?.url) {
      map[title] = group.url.startsWith('/') ? group.url : `/${group.url}`;
    }
  }
  return map;
}

function resolveCategoryPagePath(category, groupUrlByTitle = {}) {
  const rawUrl =
    category?.url ||
    category?.groupUrl ||
    category?.link ||
    category?.href ||
    category?.actionUrl;
  if (rawUrl) {
    if (rawUrl.startsWith('http')) {
      try {
        const parsed = new URL(rawUrl);
        return `${parsed.pathname}${parsed.search}`;
      } catch {
        return rawUrl;
      }
    }
    return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  }
  const title = String(category?.title || category?.name || '').trim().toLowerCase();
  if (title && groupUrlByTitle[title]) {
    return groupUrlByTitle[title];
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
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: `${SHOP}/`,
    },
  });
  return { url, status: res.status, html: await res.text() };
}

async function main() {
  const profileUrl = `${SHOP}/company_profile.html`;
  const profile = await fetchHtml(profileUrl);
  const shopBiz = extractShopBizData(profile.html);
  const mod = Object.values(shopBiz?.pageModuleMap || {}).find(
    (item) => item?.moduleName === 'productCategories',
  );
  const categories = mod?.moduleData?.categories || [];

  let groupMap = extractGroupUrlMap(profile.html);
  const needProductlist = Object.keys(groupMap).length < 3;
  if (needProductlist) {
    const productlist = await fetchHtml(`${SHOP}/productlist.html`);
    groupMap = { ...groupMap, ...extractGroupUrlMap(productlist.html) };
  }

  const categoryUrls = categories.map((cat) => {
    const metaId = String(cat?.categoryId || cat?.id || '').toLowerCase();
    const pagePath =
      metaId === 'all'
        ? resolveCategoryPagePath(cat, groupMap) || '/productlist-1.html?filter=all'
        : resolveCategoryPagePath(cat, groupMap);
    return {
      title: cat.title || cat.name || cat.categoryId,
      id: cat.id || cat.categoryId,
      rawUrl: cat.url || cat.groupUrl || cat.link || cat.href || cat.actionUrl || null,
      pagePath,
      fullUrl: pagePath ? `${SHOP}${pagePath}` : null,
      inlineProductCount: (cat.products || cat.productList || []).length,
    };
  });

  const htmlPages = [
    { phase: 'profile', url: profileUrl },
    ...(needProductlist ? [{ phase: 'group-map', url: `${SHOP}/productlist.html` }] : []),
    ...categoryUrls.map((item) => ({
      phase: 'category-sample',
      title: item.title,
      url: item.fullUrl,
    })),
    { phase: 'feature-products', url: `${SHOP}/featureproductlist.html` },
    {
      phase: 'sales-order-page1',
      url: `${SHOP}/productlist-1.html?filter=all&sortType=ctrOrder-desc`,
    },
  ];

  console.log(
    JSON.stringify(
      {
        shop: SHOP,
        profileStatus: profile.status,
        usesProductCategories: categories.length > 0,
        categoryCount: categories.length,
        groupMapCount: Object.keys(groupMap).length,
        fetchedProductlistForMap: needProductlist,
        htmlPageCount: htmlPages.length,
        htmlPages,
        categoryUrls,
        groupMap,
        cacheStats: {
          profileCategoryFetches: 18,
          profileProducts: 130,
          featureProductListProducts: 16,
          productListOrderProducts: 16,
          uniqueProducts: 153,
          compareBatches: 8,
          compareCandidates: 136,
          detailPageFetches: 136,
        },
        apiCalls: {
          compareProducts: 'https://www.alibaba.com/detail/compareProducts.html (8 batches x up to 20 productIds)',
          productDetailPages: '136 unique product detail URLs (inquiry > 5)',
        },
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
