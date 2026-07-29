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

const html = fs.readFileSync(process.argv[2], 'utf8');
const data = extractShopBizData(html);
for (const [idx, mod] of Object.entries(data.pageModuleMap || {})) {
  const name = mod?.moduleName || mod?.name;
  if (name === 'productCategories' || name === 'products' || name === 'shopProducts') {
    console.log('===', idx, name, '===');
    console.log(JSON.stringify(mod, null, 2).slice(0, 8000));
  }
}
