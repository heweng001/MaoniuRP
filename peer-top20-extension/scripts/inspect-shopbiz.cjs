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

function walk(obj, path = '', hits = []) {
  if (!obj || typeof obj !== 'object') return hits;
  if (Array.isArray(obj.groups) && obj.groups.length) {
    hits.push({ path, keys: Object.keys(obj), groupsLen: obj.groups.length });
  }
  if (Array.isArray(obj.productList) && obj.productList.length) {
    hits.push({ path, keys: Object.keys(obj), productListLen: obj.productList.length });
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') walk(v, path ? `${path}.${k}` : k, hits);
  }
  return hits;
}

const html = fs.readFileSync(process.argv[2], 'utf8');
const data = extractShopBizData(html);
for (const [idx, mod] of Object.entries(data.pageModuleMap || {})) {
  const name = mod?.moduleName || mod?.name || mod?.componentName || mod?.moduleTitle;
  const hits = walk(mod, `pageModuleMap.${idx}`);
  if (hits.length || /product/i.test(String(name))) {
    console.log('---', idx, name || '(no name)', '---');
    console.log(JSON.stringify(hits.slice(0, 5), null, 2));
  }
}
