const fs = require('fs');

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

const html = fs.readFileSync(process.argv[2], 'utf8');
const pageData = extractGridModules(html);
const groups = getNested(pageData, 'productGroups', 'mds', 'moduleData', 'data', 'groups') || [];

function summarize(nodes, depth = 0) {
  for (const node of nodes || []) {
    console.log('  '.repeat(depth) + (node.name || '?') + ' -> ' + (node.url || ''));
    if (node.children?.length && depth < 2) summarize(node.children, depth + 1);
  }
}

console.log('Top groups:');
summarize(groups.slice(0, 15));
