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

function resolveProductCategories(html) {
  const shopBizData = extractShopBizData(html);
  if (!shopBizData?.pageModuleMap) return null;
  const module = Object.values(shopBizData.pageModuleMap).find(
    (m) => m?.moduleName === 'productCategories',
  );
  return module?.moduleData?.categories || null;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  return res.text();
}

async function main() {
  const shopUrl = 'https://conceptcaseclothing.en.alibaba.com';
  const profileHtml = await fetchHtml(`${shopUrl}/company_profile.html`);
  const categories = resolveProductCategories(profileHtml);
  if (!categories?.length) {
    console.log('No categories found');
    process.exit(1);
  }

  console.log('=== 12 company_profile 分组 ===');
  categories.forEach((c, i) => {
    const title = c.title || c.name || c.categoryId;
    const id = c.categoryId || c.id;
    const url = c.url || c.groupUrl || c.link || '';
    console.log(`${i + 1}. ${title} (id: ${id})${url ? ' -> ' + url : ''}`);
  });

  console.log('\n=== 固定额外 2 个分组 ===');
  console.log('13. featureproductlist -> /featureproductlist.html (16 个产品 ID，全页采样)');
  console.log('14. productlist 销量排序第一页 -> /productlist-1.html?filter=all&sortType=ctrOrder-desc (16 个产品 ID，全页采样)');
}

main().catch(console.error);
