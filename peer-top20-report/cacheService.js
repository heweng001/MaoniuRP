import crypto from 'node:crypto';
import { computeShopInquirySummary, parseInquiryNumeric } from './shopInquiryTree.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data', 'cache');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

export const REPORT_TYPES = {
  TOP20: 'top20',
  SHOP_INQUIRY: 'shop-inquiry',
};

export const REPORT_TYPE_LABELS = {
  [REPORT_TYPES.TOP20]: 'Top同行报告',
  [REPORT_TYPES.SHOP_INQUIRY]: '指定同行报告',
};

async function ensureCacheDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readIndex() {
  await ensureCacheDir();
  try {
    const raw = await fs.readFile(INDEX_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeIndex(items) {
  await ensureCacheDir();
  await fs.writeFile(INDEX_FILE, JSON.stringify({ items }, null, 2), 'utf8');
}

function deriveTargetObject(entry) {
  if (entry.targetObject) {
    return entry.targetObject;
  }
  if (entry.type === REPORT_TYPES.TOP20) {
    if (Array.isArray(entry.payload?.keywords) && entry.payload.keywords.length) {
      return entry.payload.keywords.join(', ');
    }
    return String(entry.payload?.keywordText || '').trim();
  }
  if (entry.type === REPORT_TYPES.SHOP_INQUIRY) {
    return String(entry.payload?.shopUrl || '').trim();
  }
  return '';
}

function computeTop20MaxInquiry(reports) {
  let max = 0;
  for (const report of reports || []) {
    for (const category of report.categories || []) {
      for (const row of category.rows || []) {
        const value = parseInquiryNumeric(row.inquiries);
        if (value > max) {
          max = value;
        }
      }
    }
  }
  return max > 0 ? String(max) : '';
}

function computeInquirySummary(record) {
  if (record.type === REPORT_TYPES.SHOP_INQUIRY) {
    const categories = record.payload?.categories;
    if (!Array.isArray(categories) || !categories.length) {
      return '';
    }
    return computeShopInquirySummary(categories).totalInquiry || '';
  }
  if (record.type === REPORT_TYPES.TOP20) {
    const reports = record.reports || record.payload?.reports;
    return computeTop20MaxInquiry(reports);
  }
  return '';
}

function computeReportParams(record) {
  if (record.type === REPORT_TYPES.TOP20) {
    const searchPageCount = Number.parseInt(
      record.payload?.searchPageCount ?? record.payload?.timings?.searchPages,
      10,
    );
    const pages = Number.isFinite(searchPageCount) && searchPageCount > 0 ? searchPageCount : 5;
    return `${pages}页`;
  }
  if (record.type === REPORT_TYPES.SHOP_INQUIRY) {
    const productsPerCategory = Number.parseInt(
      record.payload?.productsPerCategory ?? record.payload?.timings?.productsPerCategory,
      10,
    );
    const count =
      Number.isFinite(productsPerCategory) && productsPerCategory > 0 ? productsPerCategory : 2;
    return `${count}个/分组`;
  }
  return '';
}

function summarizeItem(item) {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    typeLabel: item.typeLabel,
    targetObject: deriveTargetObject(item),
    createdBy: item.createdBy,
    createdAt: item.createdAt,
    pluginVersion: item.pluginVersion || '-',
    status: item.status,
    durationMs: item.durationMs,
    errorMessage: item.errorMessage || '',
    inquirySummary: computeInquirySummary(item) || item.inquirySummary || '',
    reportParams: computeReportParams(item) || item.reportParams || '',
  };
}

export async function saveReportCache(entry) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const record = {
    id,
    title: entry.title || '未命名报告',
    type: entry.type,
    typeLabel: REPORT_TYPE_LABELS[entry.type] || entry.type,
    targetObject: deriveTargetObject(entry),
    createdBy: entry.createdBy,
    createdAt,
    pluginVersion: entry.pluginVersion || '',
    status: entry.status || 'success',
    durationMs: entry.durationMs || 0,
    errorMessage: entry.errorMessage || '',
    html: entry.html || '',
    payload: entry.payload || null,
    reports: entry.reports || null,
  };

  await ensureCacheDir();
  await fs.writeFile(path.join(DATA_DIR, `${id}.json`), JSON.stringify(record), 'utf8');

  const items = await readIndex();
  items.unshift(summarizeItem(record));
  await writeIndex(items.slice(0, 500));

  return summarizeItem(record);
}

export async function listReportCache() {
  const items = await readIndex();
  const enriched = await Promise.all(
    items.map(async (item) => {
      let next = item;
      if (!item.targetObject || !item.inquirySummary || !item.reportParams) {
        try {
          const full = await getReportCache(item.id);
          next = {
            ...item,
            targetObject: item.targetObject || deriveTargetObject(full),
            inquirySummary: item.inquirySummary || computeInquirySummary(full),
            reportParams: item.reportParams || computeReportParams(full),
          };
        } catch {
          next = {
            ...item,
            targetObject: item.targetObject || '',
            inquirySummary: item.inquirySummary || '',
            reportParams: item.reportParams || '',
          };
        }
      }
      return next;
    }),
  );
  return enriched.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getReportCache(id) {
  await ensureCacheDir();
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${id}.json`), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('缓存报告不存在');
    }
    throw error;
  }
}

function normalizeShopCacheUrl(shopUrl) {
  return String(shopUrl || '')
    .trim()
    .toLowerCase()
    .replace(/\/$/, '');
}

export async function findBestShopInquiryCache(shopUrl) {
  const normalizedTarget = normalizeShopCacheUrl(shopUrl);
  if (!normalizedTarget) {
    return null;
  }

  const items = await readIndex();
  let best = null;

  for (const item of items) {
    if (item.type !== REPORT_TYPES.SHOP_INQUIRY || item.status !== 'success') {
      continue;
    }
    const target = normalizeShopCacheUrl(item.targetObject);
    if (target !== normalizedTarget) {
      continue;
    }
    try {
      const full = await getReportCache(item.id);
      const categories = full.payload?.categories;
      const count = Array.isArray(categories) ? categories.length : 0;
      if (!count) {
        continue;
      }
      if (!best || count > best.categoryCount) {
        best = {
          id: full.id,
          createdAt: full.createdAt,
          createdBy: full.createdBy,
          categories,
          categoryCount: count,
          payload: full.payload,
          html: full.html,
        };
      }
    } catch {
      /* skip broken cache */
    }
  }

  return best;
}

export function shouldReuseShopInquiryCache(incomingCategories, scrapeStats, bestCached) {
  if (!bestCached) {
    return false;
  }
  const incomingCount = Array.isArray(incomingCategories) ? incomingCategories.length : 0;
  if (incomingCount > 0) {
    return false;
  }
  const bestCount = bestCached.categoryCount || 0;
  return bestCount >= 3;
}
