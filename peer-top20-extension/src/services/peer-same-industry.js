import { peerFetch } from 'common';
import { getNested } from 'util/index';
import { getCompareProductsData, CaptchaError } from './compare-products.js';
import { mapWithConcurrency, SEARCH_CONCURRENCY } from './parallel-fetch.js';
import { SCRAPE_MAX_RETRIES, SCRAPE_RETRY_DELAY_MS, sleep } from './scrape-retry.js';
import {
  fetchProductDetailCategory,
  formatCategoryDisplay,
  buildProductDetailUrl,
} from './product-detail-category.js';

const DEFAULT_SEARCH_PAGE_COUNT = 5;
const COMPARE_BATCH_SIZE = 20;
const COMPARE_CONCURRENCY = 2;
const INQUIRY_THRESHOLD = 50;
const TOP20_DETAIL_CONCURRENCY = 10;
const TOP20_DETAIL_DELAY_MS = 150;
const DETAIL_PARSE_MAX_RETRIES = 2;
const DETAIL_RETRY_DELAY_MS = 600;
const TOP20_DETAIL_VERIFY_URL = 'https://www.alibaba.com/detail/compareProducts.html';

let keywordSearchResult = [];

function normalizeSearchPageCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SEARCH_PAGE_COUNT;
  }
  return Math.min(20, Math.max(1, parsed));
}

function createTimings(searchPageCount = DEFAULT_SEARCH_PAGE_COUNT) {
  return {
    searchMs: 0,
    searchPages: searchPageCount,
    compareMs: 0,
    compareBatches: 0,
    compareBatchFailures: 0,
    detailMs: 0,
    detailCandidates: 0,
    detailSuccess: 0,
    detailFailed: 0,
    detailRetryRounds: 0,
    rankMs: 0,
    totalMs: 0,
    uniqueProducts: 0,
    uniqueSuppliers: 0,
  };
}

function unicodeToChar(text) {
  return text.replace(/\\u[\dA-F]{4}/gi, (match) =>
    String.fromCharCode(Number.parseInt(match.replace(/\\u/g, ''), 16)),
  );
}

function isExistCaptchaPage(data) {
  return String(data).includes('"action": "captcha"');
}

function convertStringInquiryToInt(value) {
  if (!value) {
    return undefined;
  }
  return Number.parseInt(String(value).replace(/[,+]/g, ''), 10);
}

function getInquiryNumber(item) {
  return convertStringInquiryToInt(item?.compareCompanyView?.iquiries) || 0;
}

function partition(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

function sortByInquiry(a, b) {
  const aInquiry = convertStringInquiryToInt(a.compareCompanyView.iquiries);
  const aPageViews = convertStringInquiryToInt(a.compareCompanyView.pageViews);
  const bInquiry = convertStringInquiryToInt(b.compareCompanyView.iquiries);
  const bPageViews = convertStringInquiryToInt(b.compareCompanyView.pageViews);

  if (!aInquiry) {
    return 1;
  }
  if (!bInquiry) {
    return -1;
  }
  if (aInquiry === bInquiry && aPageViews && bPageViews) {
    return bPageViews - aPageViews;
  }
  return bInquiry - aInquiry;
}

function appendSearchResults(result, items) {
  if (!items?.length) {
    return;
  }
  result.push(...items);
}

async function fetchSearchPathJson(keyword, page) {
  const searchWord = keyword.split(' ').join('_');
  const res = await peerFetch({
    url: 'https://open-s.alibaba.com/openservice/galleryProductOfferResultViewService',
    params: {
      appName: 'magellan',
      appKey: 'a5m1ismomeptugvfmkkjnwwqnwyrhpb1',
      searchweb: 'Y',
      SearchText: searchWord,
      IndexArea: 'product_en',
      page,
      ISJSON: 1,
      waterfallReqCount: 1,
      asyncLoadIndex: 2,
      asyncLoad: true,
    },
  });
  return getNested(res, 'data', 'offerList') || [];
}

async function fetchSearchPathHtml(keyword, page) {
  const res = await peerFetch({
    url: 'https://www.alibaba.com/trade/search',
    params: {
      page,
      fsb: 'y',
      IndexArea: 'product_en',
      n: 50,
      SearchText: keyword,
      XPJAX: '1',
    },
  });

  if (typeof res !== 'string') {
    return { captcha: false, list: res.normalList || [] };
  }
  if (isExistCaptchaPage(res)) {
    return { captcha: true, list: [] };
  }

  let dataStr = res.replace(/:\s*,/g, ': null,');
  const startFlag = '"offerList":';
  const endFlag = 'p4pCount';
  if (!dataStr.includes(startFlag) || !dataStr.includes(endFlag)) {
    return { captcha: false, list: [] };
  }
  dataStr = dataStr.substring(dataStr.indexOf(startFlag), dataStr.length);
  dataStr = dataStr.substring(startFlag.length, dataStr.indexOf(endFlag));
  dataStr = dataStr.substring(0, dataStr.lastIndexOf(','));
  dataStr = unicodeToChar(dataStr);
  return { captcha: false, list: JSON.parse(dataStr) || [] };
}

async function getKeywordSearchResult(keyword, page) {
  const result = [];

  try {
    appendSearchResults(result, await fetchSearchPathJson(keyword, page));
  } catch (error) {
    console.warn('[Peer Top20] search json failed:', error);
  }

  if (result.length < 20) {
    try {
      const htmlResult = await fetchSearchPathHtml(keyword, page);
      if (htmlResult.captcha) {
        return { captcha: true, items: [] };
      }
      appendSearchResults(result, htmlResult.list);
    } catch (error) {
      console.warn('[Peer Top20] search html failed:', error);
    }
  }

  const items = result.map((item) => ({
    productId: item.id,
    supplierName: item.supplier.supplierName,
    supplierYear: item.supplier.supplierYear,
    transactionLevel: item.company.transactionLevel,
    displayStarLevel: item.company.displayStarLevel,
    page,
  }));

  return { captcha: false, items };
}

async function fetchAllSearchPages(keyword, searchPageCount, onProgress) {
  const pages = Array.from({ length: searchPageCount }, (_, index) => index + 1);
  let completedPages = 0;

  const pageResults = await mapWithConcurrency(pages, SEARCH_CONCURRENCY, async (page) => {
    const searchState = await getKeywordSearchResult(keyword, page);
    completedPages += 1;
    onProgress(
      5 + Math.round((completedPages / searchPageCount) * 35),
      `正在搜索关键词结果（${completedPages}/${searchPageCount} 页）…`,
    );
    return searchState;
  });

  if (pageResults.some((state) => state.captcha)) {
    return { captcha: true, items: [] };
  }

  return {
    captcha: false,
    items: pageResults.flatMap((state) => state.items || []),
  };
}

function getTransactionHistoryData(item, industryData) {
  const transactionHistory = item.compareCompanyView.transactionHistory;
  if (!transactionHistory) {
    return;
  }
  const transactionNumber = transactionHistory.substring(
    0,
    transactionHistory.indexOf('Transaction'),
  );
  const transactionPrice = transactionHistory.substring(
    transactionHistory.indexOf('$'),
    transactionHistory.indexOf(' in'),
  );
  if (transactionNumber && transactionPrice) {
    industryData.transactionNumber = transactionNumber;
    industryData.transactionPrice = transactionPrice;
  }
}

function toIndustryData(item, categoryInfo = null) {
  const {
    compareCompanyView: { companyName, iquiries, pageViews, mainProducts },
    compareProductView: { productId },
  } = item;

  const industryData = {
    companyName,
    iquiries,
    pageViews,
    mainProducts,
    productId: String(productId || ''),
    home: item.compareCompanyView.companyUrl,
    productDetailUrl: item.compareProductView.productDetailUrl,
    category: '全部',
    categoryId: categoryInfo?.categoryId || '',
    categoryName: categoryInfo?.categoryName || '',
    categoryPath: categoryInfo?.categoryPath || [],
    platformCategory:
      categoryInfo && (categoryInfo.categoryName || categoryInfo.categoryId)
        ? formatCategoryDisplay(categoryInfo)
        : '-',
  };

  getTransactionHistoryData(item, industryData);

  const meta = keywordSearchResult.find(
    (row) => row.productId === Number.parseInt(productId, 10),
  );
  if (meta) {
    industryData.supplierName = meta.supplierName;
    industryData.supplierYear = meta.supplierYear;
    industryData.transactionLevel = meta.transactionLevel;
    industryData.displayStarLevel = meta.displayStarLevel;
  }

  return industryData;
}

function getRecordInquiry(record) {
  return convertStringInquiryToInt({ compareCompanyView: { iquiries: record?.iquiries } }) || 0;
}

function sortRecordsByInquiry(records) {
  return [...records].sort((a, b) => getRecordInquiry(b) - getRecordInquiry(a));
}

function resolveCategoryKey(record) {
  const platformCategory = String(record.platformCategory || '').trim();
  if (platformCategory && platformCategory !== '-') {
    return platformCategory;
  }
  const categoryName = String(record.categoryName || '').trim();
  return categoryName || '未分类';
}

function buildListedProductSnapshot(record) {
  return {
    productId: String(record.productId || ''),
    mainProducts: String(record.mainProducts || ''),
    platformCategory: String(record.platformCategory || '-'),
    pageViews: String(record.pageViews || ''),
    iquiries: String(record.iquiries || ''),
    productDetailUrl: String(record.productDetailUrl || ''),
  };
}

function groupRecordsByCompany(records) {
  const map = new Map();
  for (const record of records) {
    const company = String(record.companyName || '').trim() || '未知公司';
    if (!map.has(company)) {
      map.set(company, []);
    }
    map.get(company).push(record);
  }

  return sortRecordsByInquiry(
    [...map.values()].map((products) => {
      const sorted = sortRecordsByInquiry(products);
      const primary = { ...sorted[0] };
      primary.listedProducts = sorted.map(buildListedProductSnapshot);
      primary.listedProductCount = sorted.length;
      return primary;
    }),
  );
}

function buildCategoryGroups(records) {
  const groups = new Map();
  for (const record of records) {
    const key = resolveCategoryKey(record);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(record);
  }

  return [...groups.entries()]
    .map(([category, value]) => ({
      key: category,
      category,
      value: groupRecordsByCompany(value),
    }))
    .sort((a, b) => getRecordInquiry(a.value[0]) - getRecordInquiry(b.value[0]))
    .reverse();
}

async function fetchCompareBatchWithRetry(batch) {
  let lastError;
  for (let attempt = 0; attempt <= SCRAPE_MAX_RETRIES; attempt += 1) {
    try {
      const listView = await getCompareProductsData(batch);
      if (!listView?.length) {
        throw new Error('compareProducts 返回空数据');
      }
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
  console.warn('[Peer Top20] compare batch failed after retries:', lastError);
  return null;
}

async function fetchAllCompareProducts(productIds, timings, onProgress) {
  const batches = partition(productIds, COMPARE_BATCH_SIZE);
  timings.compareBatches = batches.length;
  const productMap = new Map();
  const compareStartedAt = Date.now();

  for (let index = 0; index < batches.length; index += COMPARE_CONCURRENCY) {
    const batchGroup = batches.slice(index, index + COMPARE_CONCURRENCY);
    const completed = Math.min(index + batchGroup.length, batches.length);
    onProgress(
      40 + Math.round((completed / batches.length) * 45),
      `正在抓取对比数据（${completed}/${batches.length} 批）…`,
    );

    const batchResults = await Promise.all(
      batchGroup.map(async (batch) => {
        try {
          return await fetchCompareBatchWithRetry(batch);
        } catch (error) {
          if (error instanceof CaptchaError) {
            throw error;
          }
          console.warn('[Peer Top20] compare batch failed after retries:', error);
          timings.compareBatchFailures += 1;
          return null;
        }
      }),
    );

    for (const compareProductData of batchResults) {
      if (!compareProductData?.length) {
        continue;
      }
      for (const item of compareProductData) {
        const productId = item?.compareProductView?.productId;
        if (!productId) {
          continue;
        }
        const existing = productMap.get(productId);
        if (!existing || getInquiryNumber(item) > getInquiryNumber(existing)) {
          productMap.set(productId, item);
        }
      }
    }
  }

  timings.compareMs = Date.now() - compareStartedAt;
  const allResults = Array.from(productMap.values());
  timings.uniqueSuppliers = new Set(
    allResults.map((item) => item.compareCompanyView?.supplierId).filter(Boolean),
  ).size;
  return allResults;
}

async function fetchItemCategoryInfo(item) {
  const compareProductView = item.compareProductView || {};
  const productDetailUrl = buildProductDetailUrl(
    compareProductView.productId,
    compareProductView.productDetailUrl || compareProductView.detailUrl,
  );
  if (!productDetailUrl) {
    return null;
  }

  try {
    return await fetchProductDetailCategory(productDetailUrl, {
      verifyUrl: TOP20_DETAIL_VERIFY_URL,
      productId: compareProductView.productId,
    });
  } catch (error) {
    if (error instanceof CaptchaError) {
      throw error;
    }
    console.warn('[Peer Top20] product category failed:', error);
    return null;
  }
}

async function resolveProductCategories(items, onProgress) {
  const categories = new Array(items.length).fill(null);
  let detailRetryRounds = 0;

  async function fetchAt(index) {
    if (categories[index]) {
      return categories[index];
    }
    const categoryInfo = await fetchItemCategoryInfo(items[index]);
    categories[index] = categoryInfo;
    return categoryInfo;
  }

  async function runPass(indices) {
    await mapWithConcurrency(
      indices,
      TOP20_DETAIL_CONCURRENCY,
      async (index) => {
        await fetchAt(index);
      },
      TOP20_DETAIL_DELAY_MS,
    );
    const parsedCount = categories.filter(Boolean).length;
    onProgress(
      86 + Math.round((parsedCount / items.length) * 10),
      `正在解析产品类目（${parsedCount}/${items.length}）…`,
    );
  }

  await runPass(items.map((_, index) => index));

  for (let retry = 0; retry < DETAIL_PARSE_MAX_RETRIES; retry += 1) {
    const pending = categories
      .map((category, index) => (category ? null : index))
      .filter((index) => index !== null);
    if (!pending.length) {
      break;
    }
    detailRetryRounds += 1;
    await sleep(DETAIL_RETRY_DELAY_MS * (retry + 1));
    await runPass(pending);
  }

  const detailSuccess = categories.filter(Boolean).length;
  return {
    categories,
    detailRetryRounds,
    detailSuccess,
    detailFailed: Math.max(0, items.length - detailSuccess),
  };
}

export async function fetchPeerTop20({ keyword, searchPageCount = DEFAULT_SEARCH_PAGE_COUNT, onProgress = () => {} }) {
  keywordSearchResult = [];
  const pageCount = normalizeSearchPageCount(searchPageCount);
  const timings = createTimings(pageCount);
  const totalStartedAt = Date.now();

  const normalizedKeyword =
    keyword.indexOf(',') !== -1 ? keyword.substring(0, keyword.indexOf(',')) : keyword;

  const searchStartedAt = Date.now();
  const searchState = await fetchAllSearchPages(normalizedKeyword, pageCount, onProgress);
  if (searchState.captcha) {
    return true;
  }
  keywordSearchResult = searchState.items;
  timings.searchMs = Date.now() - searchStartedAt;

  const productIds = [
    ...new Set(keywordSearchResult.map((item) => item.productId).filter(Boolean)),
  ];
  timings.uniqueProducts = productIds.length;

  if (!productIds.length) {
    timings.totalMs = Date.now() - totalStartedAt;
    return {
      keyword: normalizedKeyword,
      effectData: [],
      effectDataCategoryGrouped: [],
      timings,
    };
  }

  const allCompareResults = await fetchAllCompareProducts(productIds, timings, onProgress);
  const highInquiryProducts = allCompareResults.filter(
    (item) => getInquiryNumber(item) > INQUIRY_THRESHOLD,
  );

  onProgress(
    86,
    `已筛选询盘>${INQUIRY_THRESHOLD}的 ${highInquiryProducts.length} 个产品，十路并发解析类目…`,
  );
  const detailStartedAt = Date.now();
  const categoryOutcome = await resolveProductCategories(highInquiryProducts, onProgress);
  timings.detailMs = Date.now() - detailStartedAt;
  timings.detailCandidates = highInquiryProducts.length;
  timings.detailSuccess = categoryOutcome.detailSuccess;
  timings.detailFailed = categoryOutcome.detailFailed;
  timings.detailRetryRounds = categoryOutcome.detailRetryRounds;
  timings.inquiryThreshold = INQUIRY_THRESHOLD;
  timings.highInquiryProductCount = highInquiryProducts.length;

  onProgress(96, '正在整理同行数据…');
  const rankStartedAt = Date.now();
  const parsedRecords = highInquiryProducts.map((item, index) =>
    toIndustryData(item, categoryOutcome.categories[index]),
  );
  const effectDataCategoryGrouped = buildCategoryGroups(parsedRecords);
  const effectData = effectDataCategoryGrouped.flatMap((group) => group.value);
  const scrapingStats = {
    compareBatches: timings.compareBatches,
    compareBatchFailures: timings.compareBatchFailures,
    detailCandidates: highInquiryProducts.length,
    detailSuccess: categoryOutcome.detailSuccess,
    detailFailed: categoryOutcome.detailFailed,
    detailRetryRounds: categoryOutcome.detailRetryRounds,
    inquiryThreshold: INQUIRY_THRESHOLD,
    highInquiryProductCount: highInquiryProducts.length,
    isComplete: timings.compareBatchFailures === 0 && categoryOutcome.detailFailed === 0,
  };
  timings.isComplete = scrapingStats.isComplete;
  timings.rankMs = Date.now() - rankStartedAt;
  timings.totalMs = Date.now() - totalStartedAt;

  onProgress(100, '抓取完成');
  console.log(
    `[Peer Top20] ${normalizedKeyword}: ${pageCount}页产品 ${timings.uniqueProducts} 个，compare ${timings.compareBatches} 批/${allCompareResults.length} 条（失败 ${timings.compareBatchFailures} 批），询盘>${INQUIRY_THRESHOLD} ${highInquiryProducts.length} 个，类目解析 ${categoryOutcome.detailSuccess}/${highInquiryProducts.length}，报告 ${effectData.length} 家公司，完整 ${scrapingStats.isComplete}，耗时 ${timings.totalMs}ms`,
    timings,
    scrapingStats,
  );
  if (effectData[0]) {
    console.log('[Peer Top20] sample platformCategory:', effectData[0].platformCategory);
  }

  return {
    keyword: normalizedKeyword,
    effectData,
    effectDataCategoryGrouped,
    scrapingStats,
    timings,
  };
}

export function mergeTop20Timings(items = []) {
  const merged = createTimings();
  merged.searchPages = DEFAULT_SEARCH_PAGE_COUNT;

  for (const item of items) {
    if (!item?.timings) {
      continue;
    }
    if (item.timings.searchPages) {
      merged.searchPages = Math.max(merged.searchPages, item.timings.searchPages);
    }
    merged.searchMs += item.timings.searchMs || 0;
    merged.compareMs += item.timings.compareMs || 0;
    merged.detailMs += item.timings.detailMs || 0;
    merged.detailCandidates += item.timings.detailCandidates || 0;
    merged.detailSuccess += item.timings.detailSuccess || 0;
    merged.detailFailed += item.timings.detailFailed || 0;
    merged.detailRetryRounds += item.timings.detailRetryRounds || 0;
    merged.rankMs += item.timings.rankMs || 0;
    merged.totalMs += item.timings.totalMs || 0;
    merged.uniqueProducts += item.timings.uniqueProducts || 0;
    merged.uniqueSuppliers += item.timings.uniqueSuppliers || 0;
    merged.compareBatches += item.timings.compareBatches || 0;
    merged.compareBatchFailures += item.timings.compareBatchFailures || 0;
  }

  merged.isComplete =
    items.length > 0 &&
    items.every((item) => item.scrapingStats?.isComplete !== false && item.timings?.isComplete !== false);

  return merged;
}
