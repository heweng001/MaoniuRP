const fs = require('fs');
const SHOP = 'https://bomo.en.alibaba.com';

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html',
      Referer: `${SHOP}/`,
    },
  });
  return await res.text();
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

function extractGridModules(html) {
  const data = {};
  const regex = /module-title=(['"])([^'"]+)\1[^>]*module-data=(['"])([\s\S]*?)\3/gi;
  let match = regex.exec(html);
  while (match) {
    const moduleData = safeDecode(match[4]);
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
      const parsed = safeDecode(match[1]);
      if (parsed) return parsed;
    }
  }
  return null;
}

const PROFILE_NAMES = [
  'icbu-pc-products',
  'icbu-pc-shopProducts',
  'icbu-pc-productListPc',
  'products',
  'productListPc',
];

function unwrap(moduleData) {
  if (!moduleData) return null;
  return moduleData?.mds?.moduleData?.data || moduleData;
}

(async () => {
  const profileHtml = await fetchHtml(`${SHOP}/company_profile.html`);
  const shopBiz = extractShopBizData(profileHtml);
  const modules = extractGridModules(profileHtml);

  const pageModules = Object.entries(shopBiz?.pageModuleMap || {}).map(([k, v]) => ({
    key: k,
    moduleName: v?.moduleName,
    categoryCount: v?.moduleData?.categories?.length || 0,
  }));

  let productsData = null;
  let source = null;
  for (const name of PROFILE_NAMES) {
    const fromGrid = unwrap(modules[name]);
    if (fromGrid) {
      productsData = fromGrid;
      source = `grid:${name}`;
      break;
    }
    const extracted = unwrap(extractModuleByName(profileHtml, name));
    if (extracted) {
      productsData = extracted;
      source = `module-name:${name}`;
      break;
    }
  }

  const productsSection = productsData?.products || productsData;
  const groups =
    productsSection?.groups ||
    productsData?.groups ||
    productsData?.productGroups ||
    productsSection?.productGroups ||
    [];

  const productlistHtml = await fetchHtml(`${SHOP}/productlist.html`);
  const plModules = extractGridModules(productlistHtml);
  const plGroups = plModules.productGroups?.mds?.moduleData?.data?.groups || [];

  console.log(JSON.stringify({
    hasShopBiz: !!shopBiz,
    pageModules,
    profileModuleKeys: Object.keys(modules),
    profileDataSource: source,
    legacyGroupCount: groups.length,
    legacyGroups: groups.map((g) => ({
      name: g.name || g.title,
      url: g.url,
      id: g.id || g.groupId,
      inlineProducts: (g.products || g.productList || g.items || []).length,
    })),
    productlistGroupCount: plGroups.length,
    productlistGroups: plGroups.map((g) => ({
      name: g.name,
      url: g.url,
    })),
    captcha: profileHtml.includes('captcha') || profileHtml.includes('punish-component'),
  }, null, 2));
})();
