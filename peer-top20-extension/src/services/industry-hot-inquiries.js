import { peerFetch } from 'common';
import { getNested } from 'util/index';
import { getCompareProductsData, CaptchaError } from './compare-products.js';
import { mapWithConcurrency, SEARCH_CONCURRENCY } from './parallel-fetch.js';
import { SCRAPE_MAX_RETRIES, SCRAPE_RETRY_DELAY_MS, sleep } from './scrape-retry.js';
import {
  fetchProductDetailCategory as fetchProductDetailCategoryInfo,
} from './product-detail-category.js';

export { CaptchaError };

const COMPARE_BATCH_SIZE = 20;
const DEFAULT_PRODUCTS_PER_PROFILE_CATEGORY = 2;
const PROFILE_CATEGORY_FETCH_DELAY_MS = 500;
const INQUIRY_DETAIL_THRESHOLD = 5;
const DETAIL_CONCURRENCY = 10;
const DETAIL_FETCH_DELAY_MS = 150;
const DETAIL_PARSE_MAX_RETRIES = 2;
const DETAIL_RETRY_DELAY_MS = 600;
const COMPARE_CONCURRENCY = 2;

const PROFILE_PRODUCT_MODULE_NAMES = [
  'icbu-pc-products',
  'icbu-pc-shopProducts',
  'icbu-pc-productListPc',
  'products',
  'productListPc',
];

function isCaptchaResponse(html) {
  return (
    typeof html === 'string' &&
    (html.includes('"action": "captcha"') ||
      html.includes('<punish-component') ||
      html.includes('Captcha Intercept'))
  );
}

function assertNotCaptcha(html, captchaUrl, verifyUrl) {
  if (isCaptchaResponse(html)) {
    throw new CaptchaError(captchaUrl, undefined, verifyUrl);
  }
}

function normalizeShopUrl(shopUrl) {
  let url = String(shopUrl || '').trim();
  if (!url) {
    return '';
  }
  if (url.startsWith('//')) {
    url = `https:${url}`;
  }
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }
  url = url.replace(/\/company_profile.*$/i, '').replace(/\/$/, '');
  return url;
}

function getVerifyUrl(shopUrl) {
  return `${normalizeShopUrl(shopUrl)}/productlist.html`;
}

function createStatsContext() {
  return {
    compareCalls: 0,
    compareItems: 0,
    compareErrors: 0,
    compareCandidates: 0,
    detailAttempts: 0,
    detailSuccess: 0,
    detailFailed: 0,
    detailErrors: 0,
    detailRetryRounds: 0,
    detailSkippedLowInquiry: 0,
    parseSuccessRate: 1,
    isComplete: true,
    uniqueProducts: 0,
    profileProducts: 0,
    profileCategoryCount: 0,
    profileCategoryFetches: 0,
    samplingGroupCount: 0,
    sampledProductIdTotal: 0,
    platformLeafCategories: 0,
    featureProductListProducts: 0,
    productListOrderProducts: 0,
    skippedNoInquiry: 0,
    skippedNoDetailUrl: 0,
  };
}

function createShopInquiryTimings() {
  return {
    profilePageMs: 0,
    samplingMs: 0,
    compareMs: 0,
    compareBatches: 0,
    compareBatchFailures: 0,
    detailMs: 0,
    mergeMs: 0,
    totalMs: 0,
    uniqueProducts: 0,
    compareCandidates: 0,
    platformLeafCategories: 0,
    samplingGroupCount: 0,
    sampledProductIdTotal: 0,
  };
}

function safeDecodeModuleData(raw) {
  if (!raw) {
    return null;
  }
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

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const divArr = doc.querySelectorAll('div[module-id][module-title][module-data]');
    divArr.forEach((div) => {
      const title = div.getAttribute('module-title');
      const moduleData = safeDecodeModuleData(div.getAttribute('module-data'));
      if (title && moduleData) {
        data[title] = moduleData;
      }
    });
  }

  if (Object.keys(data).length) {
    return data;
  }

  const regex =
    /module-title=(['"])([^'"]+)\1[^>]*module-data=(['"])([\s\S]*?)\3/gi;
  let match = regex.exec(html);
  while (match) {
    const moduleData = safeDecodeModuleData(match[4]);
    if (moduleData) {
      data[match[2]] = moduleData;
    }
    match = regex.exec(html);
  }

  return data;
}

function extractModuleByName(html, moduleName) {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const targetDiv = doc.querySelector(`div[module-name="${moduleName}"]`);
    if (targetDiv) {
      return safeDecodeModuleData(targetDiv.getAttribute('module-data'));
    }
  }

  const patterns = [
    new RegExp(
      `module-name=['"]${moduleName}['"][^>]*module-data=['"]([^'"]+)['"]`,
      'i',
    ),
    new RegExp(
      `module-data=['"]([^'"]+)['"][^>]*module-name=['"]${moduleName}['"]`,
      'i',
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const parsed = safeDecodeModuleData(match[1]);
      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
}

function getProductListFromModule(moduleData) {
  return getNested(moduleData, 'mds', 'moduleData', 'data', 'productList') || [];
}

function getProductId(item) {
  return item?.id || item?.productId || item?.detailId || item?.productID || null;
}

function uniqueProductIds(ids) {
  return [...new Set((ids || []).map((id) => String(id)).filter(Boolean))];
}

function partition(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

async function fetchShopHtml(url, verifyUrl) {
  const shopOrigin = normalizeShopUrl(url).split('/productlist')[0];
  const html = await peerFetch({
    url,
    timeout: 25000,
    headers: {
      Referer: `${shopOrigin}/`,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  assertNotCaptcha(html, url, verifyUrl);
  return html;
}

function unwrapModuleData(moduleData) {
  if (!moduleData) {
    return null;
  }
  return getNested(moduleData, 'mds', 'moduleData', 'data') || moduleData;
}

function resolveProfileProductsData(html, modules) {
  for (const name of PROFILE_PRODUCT_MODULE_NAMES) {
    const fromGrid = unwrapModuleData(modules[name]);
    if (fromGrid) {
      return fromGrid;
    }
    const extracted = unwrapModuleData(extractModuleByName(html, name));
    if (extracted) {
      return extracted;
    }
  }

  if (modules.products) {
    return unwrapModuleData(modules.products);
  }

  return null;
}

function extractProductsFromGroupNode(group) {
  const list = group?.products || group?.productList || group?.items || [];
  if (Array.isArray(list) && list.length) {
    return list;
  }
  return [];
}

function extractShopBizData(html) {
  if (typeof html !== 'string') {
    return null;
  }
  const marker = 'window.shopBizData = ';
  const start = html.indexOf(marker);
  if (start === -1) {
    return null;
  }
  const jsonStart = start + marker.length;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let index = jsonStart; index < html.length; index += 1) {
    const ch = html[index];
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
    if (ch === '{') {
      depth += 1;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(jsonStart, index + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
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
        return new URL(rawUrl).pathname;
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

function extractGroupUrlMapFromHtml(html) {
  if (!html) {
    return {};
  }
  const modules = extractGridModules(html);
  const groups =
    getNested(modules, 'productGroups', 'mds', 'moduleData', 'data', 'groups') || [];
  const map = {};
  for (const group of groups) {
    const title = String(group?.name || '').trim().toLowerCase();
    if (title && group?.url) {
      map[title] = group.url.startsWith('/') ? group.url : `/${group.url}`;
    }
  }
  return map;
}

async function getProductListFromPageWithRetry(shopUrl, pagePath, verifyUrl, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const list = await getProductListFromPage(shopUrl, pagePath, verifyUrl);
    if (list.length) {
      return list;
    }
    if (attempt < retries) {
      await sleep(350 * (attempt + 1));
    }
  }
  return [];
}

function normalizeProductsPerCategory(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_PRODUCTS_PER_PROFILE_CATEGORY;
  }
  return Math.min(20, Math.max(1, parsed));
}

function sliceProductIds(products, limit = DEFAULT_PRODUCTS_PER_PROFILE_CATEGORY) {
  return (products || []).slice(0, limit).map(getProductId).filter(Boolean);
}

async function buildGroupUrlByTitle(shopUrl, verifyUrl, profileHtml = '') {
  let map = extractGroupUrlMapFromHtml(profileHtml);
  if (Object.keys(map).length >= 3) {
    return map;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const html = await fetchShopHtml(`${shopUrl}/productlist.html`, verifyUrl);
      map = { ...map, ...extractGroupUrlMapFromHtml(html) };
      if (Object.keys(map).length) {
        return map;
      }
    } catch (error) {
      if (error instanceof CaptchaError) {
        throw error;
      }
      if (attempt < 2) {
        await sleep(400 * (attempt + 1));
      }
    }
  }

  return map;
}

async function fetchProductsForCategoryTab(
  shopUrl,
  category,
  verifyUrl,
  groupUrlByTitle,
  stats,
  productsPerCategory,
) {
  const categoryMeta = getCategoryMeta(category);
  const inlineIds = sliceProductIds(
    category?.products || category?.productList || [],
    productsPerCategory,
  );
  const pagePath =
    String(categoryMeta.categoryId).toLowerCase() === 'all'
      ? resolveCategoryPagePath(category, groupUrlByTitle) || '/productlist-1.html?filter=all'
      : resolveCategoryPagePath(category, groupUrlByTitle);

  if (pagePath) {
    stats.profileCategoryFetches += 1;
    const list = await getProductListFromPageWithRetry(shopUrl, pagePath, verifyUrl);
    const pageIds = sliceProductIds(list, productsPerCategory);
    if (pageIds.length) {
      return createProductCategoryEntries(pageIds, categoryMeta);
    }
  }

  return createProductCategoryEntries(inlineIds, categoryMeta);
}

async function fetchProductsForLegacyProfileGroup(
  shopUrl,
  group,
  verifyUrl,
  stats,
  productsPerCategory,
) {
  const categoryMeta = getCategoryMeta(group);
  const pagePath = resolveCategoryPagePath(group);
  if (pagePath) {
    stats.profileCategoryFetches += 1;
    const list = await getProductListFromPageWithRetry(shopUrl, pagePath, verifyUrl);
    const pageIds = sliceProductIds(list, productsPerCategory);
    if (pageIds.length) {
      return createProductCategoryEntries(pageIds, categoryMeta);
    }
  }

  return createProductCategoryEntries(
    sliceProductIds(extractProductsFromGroupNode(group), productsPerCategory),
    categoryMeta,
  );
}

async function collectCompanyProfileProductIds(
  shopUrl,
  html,
  modules,
  verifyUrl,
  stats,
  productsPerCategory,
) {
  // company_profile 分组仅用于扩大产品采样范围，报告类目来自产品详情页的平台叶子类目。
  const categories = resolveProductCategoriesFromShopBiz(html);
  if (categories?.length) {
    stats.profileCategoryCount = categories.length;
    const groupUrlByTitle = await buildGroupUrlByTitle(shopUrl, verifyUrl, html);

    const results = await mapWithConcurrency(
      categories,
      SEARCH_CONCURRENCY,
      async (category) =>
        fetchProductsForCategoryTab(
          shopUrl,
          category,
          verifyUrl,
          groupUrlByTitle,
          stats,
          productsPerCategory,
        ),
      PROFILE_CATEGORY_FETCH_DELAY_MS,
    );

    const entries = results.flat();
    return {
      profileIds: uniqueProductIds(entries.map((entry) => entry.productId)),
      productCategoryEntries: entries,
    };
  }

  const productsData = resolveProfileProductsData(html, modules);
  if (productsData) {
    const productsSection = productsData.products || productsData;
    const groups =
      productsSection.groups ||
      productsData.groups ||
      productsData.productGroups ||
      productsSection.productGroups ||
      [];

    if (groups.length) {
      stats.profileCategoryCount = groups.length;
      const results = await mapWithConcurrency(
        groups,
        SEARCH_CONCURRENCY,
        async (group) =>
          fetchProductsForLegacyProfileGroup(shopUrl, group, verifyUrl, stats, productsPerCategory),
      );
      const entries = results.flat();
      return {
        profileIds: uniqueProductIds(entries.map((entry) => entry.productId)),
        productCategoryEntries: entries,
      };
    }

    return {
      profileIds: uniqueProductIds(
        sliceProductIds(collectProfileProductListIds(productsData), productsPerCategory * 2),
      ),
      productCategoryEntries: [],
    };
  }

  return { profileIds: [], productCategoryEntries: [] };
}

function collectProfileProductListIds(productsData) {
  if (!productsData) {
    return [];
  }

  const productsSection = productsData.products || productsData;
  const candidates = [
    productsSection.productList,
    productsData.productList,
    productsSection.list,
    productsData.list,
    Array.isArray(productsSection) ? productsSection : null,
    Array.isArray(productsData.products) ? productsData.products : null,
  ];

  for (const list of candidates) {
    if (Array.isArray(list) && list.length) {
      return list.map(getProductId).filter(Boolean);
    }
  }

  return getProductListFromModule({
    mds: { moduleData: { data: productsSection } },
  })
    .map(getProductId)
    .filter(Boolean);
}

function resolveProductCategoriesFromShopBiz(html) {
  const shopBizData = extractShopBizData(html);
  if (!shopBizData?.pageModuleMap) {
    return null;
  }

  const module = Object.values(shopBizData.pageModuleMap).find(
    (item) => item?.moduleName === 'productCategories',
  );
  const categories = module?.moduleData?.categories;
  if (!Array.isArray(categories) || !categories.length) {
    return null;
  }

  return categories;
}

async function getProductListFromPage(shopUrl, pagePath, verifyUrl) {
  const html = await fetchShopHtml(`${shopUrl}${pagePath}`, verifyUrl);
  if (typeof html !== 'string') {
    return [];
  }
  const pageData = extractGridModules(html);
  const moduleData =
    pageData.productListPc || extractModuleByName(html, 'icbu-pc-productListPc');
  return getProductListFromModule(moduleData);
}

function getCategoryMeta(category) {
  const categoryName = String(category?.title || category?.name || category?.categoryId || '未分类').trim();
  const categoryId = String(category?.categoryId || category?.id || categoryName);
  const normalized = categoryName.toLowerCase();
  const isAllTab =
    String(categoryId).toLowerCase() === 'all' || normalized === 'all' || normalized === '全部';
  return { categoryId, categoryName, isAllTab };
}

function createProductCategoryEntries(productIds, categoryMeta) {
  // 店铺 company_profile 分组仅用于产品采样，不代表阿里巴巴平台类目。
  return (productIds || []).map((productId) => ({
    productId: String(productId),
    shopGroupId: categoryMeta.categoryId,
    shopGroupName: categoryMeta.categoryName,
    isAllTab: categoryMeta.isAllTab,
  }));
}

function captureDetailDebug(debugContext, payload) {
  if (!debugContext?.enabled || debugContext.detailPage || !payload) {
    return;
  }
  debugContext.detailPage = payload;
  console.log('[Peer Top20 debug] product detail sample', payload);
}

async function fetchProductDetailCategory(productDetailUrl, inquiries, verifyUrl, debugContext) {
  const result = await fetchProductDetailCategoryInfo(productDetailUrl, {
    verifyUrl,
    debugContext,
  });
  if (!result) {
    return null;
  }

  return {
    ...result,
    iquiries: inquiries,
  };
}

function parseInquiryNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  return Number.parseInt(String(value).replace(/[,+]/g, ''), 10) || 0;
}

function hasInquiryValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

async function getProductCategoryInquiry(
  productDetailUrl,
  inquiries,
  verifyUrl,
  stats,
  debugContext,
) {
  stats.detailAttempts += 1;
  try {
    const result = await fetchProductDetailCategory(
      productDetailUrl,
      inquiries,
      verifyUrl,
      debugContext,
    );
    if (!result) {
      stats.detailErrors += 1;
    }
    return result;
  } catch (error) {
    stats.detailErrors += 1;
    throw error;
  }
}

function captureCompareDebug(debugContext, payload) {
  if (!debugContext?.enabled || debugContext.compareProducts || !payload) {
    return;
  }
  debugContext.compareProducts = payload;
  console.log('[Peer Top20 debug] compareProducts.html listView[0]', payload.sample);
  console.log('[Peer Top20 debug] compareProducts field keys', payload.fieldKeys);
}

async function fetchCompareBatchWithRetry(batch, verifyUrl, debugContext, stats) {
  let lastError;
  for (let attempt = 0; attempt <= SCRAPE_MAX_RETRIES; attempt += 1) {
    try {
      stats.compareCalls += 1;
      const listView = await getCompareProductsData(batch, {
        verifyUrl,
        onDebugSample: (payload) => captureCompareDebug(debugContext, payload),
      });
      if (!listView?.length) {
        throw new Error('compareProducts 返回空数据');
      }
      stats.compareItems += listView.length;
      return listView;
    } catch (error) {
      if (error instanceof CaptchaError) {
        throw error;
      }
      lastError = error;
      if (attempt < SCRAPE_MAX_RETRIES) {
        await sleep(SCRAPE_RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  stats.compareErrors += 1;
  console.warn('[Peer Top20] compare products failed after retries:', lastError);
  return null;
}

async function fetchAllCompareItems(productIds, verifyUrl, debugContext, stats, timings) {
  const batches = partition(productIds, COMPARE_BATCH_SIZE);
  timings.compareBatches = batches.length;
  const allItems = [];
  const compareStartedAt = Date.now();

  for (let index = 0; index < batches.length; index += COMPARE_CONCURRENCY) {
    const batchGroup = batches.slice(index, index + COMPARE_CONCURRENCY);
    const batchResults = await Promise.all(
      batchGroup.map(async (batch) => {
        try {
          const listView = await fetchCompareBatchWithRetry(batch, verifyUrl, debugContext, stats);
          if (!listView) {
            timings.compareBatchFailures += 1;
          }
          return listView;
        } catch (error) {
          if (error instanceof CaptchaError) {
            throw error;
          }
          timings.compareBatchFailures += 1;
          return null;
        }
      }),
    );
    for (const listView of batchResults) {
      if (listView?.length) {
        allItems.push(...listView);
      }
    }
  }

  timings.compareMs = Date.now() - compareStartedAt;
  return allItems;
}

async function resolveHighInquiryCategories(compareItems, verifyUrl, stats, debugContext, timings) {
  const detailStartedAt = Date.now();
  const tasks = compareItems
    .map((item) => {
      const inquiries = item.compareCompanyView?.iquiries;
      const productDetailUrl =
        item.compareProductView?.productDetailUrl || item.compareProductView?.detailUrl;
      const inquiryNumber = parseInquiryNumber(inquiries);

      if (!productDetailUrl) {
        stats.skippedNoDetailUrl += 1;
        return null;
      }
      if (!hasInquiryValue(inquiries)) {
        stats.skippedNoInquiry += 1;
        return null;
      }
      if (inquiryNumber <= INQUIRY_DETAIL_THRESHOLD) {
        stats.detailSkippedLowInquiry += 1;
        return null;
      }

      return {
        productDetailUrl,
        inquiries,
        inquiryNumber,
      };
    })
    .filter(Boolean);

  stats.compareCandidates = tasks.length;
  const outcomes = new Array(tasks.length).fill(null);

  async function parseTaskAt(index) {
    if (outcomes[index]) {
      return outcomes[index];
    }
    try {
      const result = await getProductCategoryInquiry(
        tasks[index].productDetailUrl,
        tasks[index].inquiries,
        verifyUrl,
        stats,
        debugContext,
      );
      if (result) {
        outcomes[index] = result;
      }
      return result;
    } catch (error) {
      if (error instanceof CaptchaError) {
        throw error;
      }
      console.warn('[Peer Top20] product detail failed:', error);
      return null;
    }
  }

  async function runPass(indices) {
    await mapWithConcurrency(
      indices,
      DETAIL_CONCURRENCY,
      async (index) => parseTaskAt(index),
      DETAIL_FETCH_DELAY_MS,
    );
  }

  await runPass(tasks.map((_, index) => index));

  for (let retry = 0; retry < DETAIL_PARSE_MAX_RETRIES; retry += 1) {
    const pending = outcomes
      .map((result, index) => (result ? null : index))
      .filter((index) => index !== null);
    if (!pending.length) {
      break;
    }
    stats.detailRetryRounds += 1;
    await sleep(DETAIL_RETRY_DELAY_MS * (retry + 1));
    await runPass(pending);
  }

  stats.detailSuccess = outcomes.filter(Boolean).length;
  stats.detailFailed = Math.max(0, stats.compareCandidates - stats.detailSuccess);
  timings.detailMs = Date.now() - detailStartedAt;
  timings.compareCandidates = stats.compareCandidates;
  return outcomes.filter(Boolean);
}

function evaluateDetailParseCompleteness(stats, merged, timings = {}) {
  const candidates = Number(stats.compareCandidates) || 0;
  const success = Number(stats.detailSuccess) || 0;
  stats.platformLeafCategories = merged.length;
  stats.detailFailed = Math.max(0, candidates - success);
  stats.parseSuccessRate = candidates > 0 ? success / candidates : 1;
  const compareComplete =
    (Number(timings.compareBatchFailures) || 0) === 0 && (Number(stats.compareErrors) || 0) === 0;
  stats.isComplete = compareComplete && (candidates === 0 || success >= candidates);
  return stats.isComplete;
}

function mergeCategoryInquiries(rows) {
  const uniqueData = {};
  for (const item of rows) {
    if (!item?.categoryId) {
      continue;
    }
    const current = parseInquiryNumber(item.iquiries);
    const existing = uniqueData[item.categoryId];
    if (!existing || current > parseInquiryNumber(existing.iquiries)) {
      uniqueData[item.categoryId] = item;
    }
  }
  return Object.values(uniqueData).sort(
    (a, b) => parseInquiryNumber(b.iquiries) - parseInquiryNumber(a.iquiries),
  );
}

function buildFailureMessage(hint, stats) {
  const parts = [
    hint,
    `去重产品 ${stats.uniqueProducts} 个`,
    `compare ${stats.compareCalls} 批/${stats.compareItems} 条`,
    `高询盘样本 ${stats.compareCandidates} 个`,
    `平台类目解析 ${stats.detailSuccess}/${stats.compareCandidates}`,
    stats.detailRetryRounds ? `详情页重试 ${stats.detailRetryRounds} 轮` : '',
    `跳过低询盘 ${stats.detailSkippedLowInquiry} 个`,
  ].filter(Boolean);
  if (stats.compareErrors) {
    parts.push(`compare 失败 ${stats.compareErrors} 批`);
  }
  if (stats.skippedNoInquiry) {
    parts.push(`无询盘字段 ${stats.skippedNoInquiry} 条`);
  }
  if (stats.skippedNoDetailUrl) {
    parts.push(`无详情链接 ${stats.skippedNoDetailUrl} 条`);
  }
  return parts.join('，');
}


async function collectShopProductIds(shopUrl, verifyUrl, stats, timings, productsPerCategory) {
  const limit = normalizeProductsPerCategory(productsPerCategory);
  stats.productsPerCategory = limit;
  timings.productsPerCategory = limit;

  const samplingStartedAt = Date.now();
  const profilePageStartedAt = Date.now();
  const profileHtml = await fetchShopHtml(`${shopUrl}/company_profile.html`, verifyUrl);
  timings.profilePageMs = Date.now() - profilePageStartedAt;
  const profileModules = extractGridModules(profileHtml);
  const [profileResult, featureProductListProducts, productListOrderProducts] = await Promise.all([
    collectCompanyProfileProductIds(
      shopUrl,
      profileHtml,
      profileModules,
      verifyUrl,
      stats,
      limit,
    ),
    getProductListFromPage(shopUrl, '/featureproductlist.html', verifyUrl),
    getProductListFromPage(
      shopUrl,
      '/productlist-1.html?filter=all&sortType=ctrOrder-desc',
      verifyUrl,
    ),
  ]);
  timings.samplingMs = Date.now() - samplingStartedAt;
  const profileSampledIds = profileResult.productCategoryEntries?.length
    ? profileResult.productCategoryEntries.length
    : profileResult.profileIds.length;
  stats.profileProducts = profileResult.profileIds.length;
  stats.featureProductListProducts = featureProductListProducts.length;
  stats.productListOrderProducts = productListOrderProducts.length;
  stats.samplingGroupCount = (stats.profileCategoryCount || 0) + 2;
  stats.sampledProductIdTotal =
    profileSampledIds + stats.featureProductListProducts + stats.productListOrderProducts;
  timings.samplingGroupCount = stats.samplingGroupCount;
  timings.sampledProductIdTotal = stats.sampledProductIdTotal;

  return {
    productIds: uniqueProductIds([
      ...profileResult.profileIds,
      ...featureProductListProducts.map(getProductId),
      ...productListOrderProducts.map(getProductId),
    ]),
  };
}

export async function queryShopCategoryInquiries(shopUrlInput, options = {}) {
  const shopUrl = normalizeShopUrl(shopUrlInput);
  if (!shopUrl) {
    throw new Error('店铺链接不能为空');
  }

  const productsPerCategory = normalizeProductsPerCategory(options.productsPerCategory);
  const debugContext = options.debug ? { enabled: true, compareProducts: null, detailPage: null } : null;
  const stats = createStatsContext();
  stats.productsPerCategory = productsPerCategory;
  const timings = createShopInquiryTimings();
  timings.productsPerCategory = productsPerCategory;
  const totalStartedAt = Date.now();
  const verifyUrl = getVerifyUrl(shopUrl);

  const { productIds } = await collectShopProductIds(
    shopUrl,
    verifyUrl,
    stats,
    timings,
    productsPerCategory,
  );
  stats.uniqueProducts = productIds.length;
  timings.uniqueProducts = productIds.length;

  if (!productIds.length) {
    throw new Error(
      '未能读取店铺产品 ID（company_profile 各分类页 / featureproductlist / productlist 销量排序第一页），请确认店铺链接正确且店铺为公开状态',
    );
  }

  const compareItems = await fetchAllCompareItems(
    productIds,
    verifyUrl,
    debugContext,
    stats,
    timings,
  );
  const detailResults = await resolveHighInquiryCategories(
    compareItems,
    verifyUrl,
    stats,
    debugContext,
    timings,
  );
  const mergeStartedAt = Date.now();
  const merged = mergeCategoryInquiries(detailResults);
  timings.mergeMs = Date.now() - mergeStartedAt;
  timings.platformLeafCategories = merged.length;
  timings.totalMs = Date.now() - totalStartedAt;

  console.log(
    `[Peer Top20] 店铺 ${shopUrl} 平台叶子类目询盘(每分组${productsPerCategory}个): 产品 ${productIds.length} 个，compare ${timings.compareBatches} 批/${compareItems.length} 条，平台类目 ${merged.length} 个，耗时 ${timings.totalMs}ms`,
    { stats, timings },
  );

  if (!merged.length) {
    const hint =
      stats.compareItems === 0
        ? '已读取 company_profile / featureproductlist / productlist 销量页产品，但 compareProducts 未返回数据，请确认已登录 https://i.alibaba.com 或是否触发验证码'
        : stats.compareCandidates === 0
          ? `compareProducts 已返回数据，但没有类目询盘大于 ${INQUIRY_DETAIL_THRESHOLD} 的产品`
          : stats.detailSuccess === 0
            ? '已有高询盘产品，但未能解析类目（详情页可能被拦截或页面结构变化），请稍后重试或开启 Debug 模式排查'
            : '已读取产品并完成 compare，但未能汇总类目询盘';

    const message = buildFailureMessage(hint, stats);

    if (debugContext?.compareProducts || debugContext?.detailPage) {
      return {
        shopUrl,
        categories: [],
        stats,
        timings,
        totalChecked: 0,
        debug: {
          profileProducts: stats.profileProducts,
          profileCategoryCount: stats.profileCategoryCount,
          profileCategoryFetches: stats.profileCategoryFetches,
          platformLeafCategories: stats.platformLeafCategories,
          featureProductListProducts: stats.featureProductListProducts,
          productListOrderProducts: stats.productListOrderProducts,
          uniqueProducts: stats.uniqueProducts,
          sampleCount: 0,
          uniqueCount: 0,
          compareProducts: debugContext.compareProducts,
          detailPage: debugContext.detailPage,
          stats,
          timings,
          note: message,
        },
      };
    }

    throw new Error(message);
  }

  const isComplete = evaluateDetailParseCompleteness(stats, merged, timings);

  return {
    shopUrl,
    categories: merged,
    stats,
    timings,
    isComplete,
    totalChecked: detailResults.length,
    debug: {
      profileProducts: stats.profileProducts,
      profileCategoryCount: stats.profileCategoryCount,
      profileCategoryFetches: stats.profileCategoryFetches,
      platformLeafCategories: merged.length,
      featureProductListProducts: stats.featureProductListProducts,
      productListOrderProducts: stats.productListOrderProducts,
      uniqueProducts: stats.uniqueProducts,
      sampleCount: detailResults.length,
      uniqueCount: merged.length,
      compareProducts: debugContext?.compareProducts || null,
      stats,
      timings,
      isComplete,
    },
  };
}
