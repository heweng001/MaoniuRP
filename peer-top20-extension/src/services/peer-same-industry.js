import { peerFetch } from 'common';
import { getNested } from 'util/index';
import { getCompareProductsData, CaptchaError } from './compare-products.js';
import { mapWithConcurrency, SEARCH_CONCURRENCY } from './parallel-fetch.js';
import {
  fetchProductDetailCategory,
  formatCategoryDisplay,
  buildProductDetailUrl,
} from './product-detail-category.js';

const DEFAULT_SEARCH_PAGE_COUNT = 5;
const COMPARE_BATCH_SIZE = 20;
const COMPARE_CONCURRENCY = 2;
const TOP_COUNT = 20;
const TOP20_DETAIL_CONCURRENCY = 10;
const TOP20_DETAIL_DELAY_MS = 150;
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
      value: sortRecordsByInquiry(value),
    }))
    .sort((a, b) => getRecordInquiry(a.value[0]) - getRecordInquiry(b.value[0]))
    .reverse();
}

function mergeCompareResults(supplierMap, compareProductData) {
  for (const item of compareProductData) {
    const supplierId = item.compareCompanyView?.supplierId;
    if (!supplierId) {
      continue;
    }
    const existing = supplierMap.get(supplierId);
    if (!existing || getInquiryNumber(item) > getInquiryNumber(existing)) {
      supplierMap.set(supplierId, item);
    }
  }
}

async function fetchAllCompareItems(productIds, timings, onProgress) {
  const batches = partition(productIds, COMPARE_BATCH_SIZE);
  timings.compareBatches = batches.length;
  const supplierMap = new Map();
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
          return await getCompareProductsData(batch);
        } catch (error) {
          timings.compareBatchFailures += 1;
          console.warn('[Peer Top20] compare batch failed:', error);
          return [];
        }
      }),
    );

    for (const compareProductData of batchResults) {
      mergeCompareResults(supplierMap, compareProductData);
    }
  }

  timings.compareMs = Date.now() - compareStartedAt;
  timings.uniqueSuppliers = supplierMap.size;
  return Array.from(supplierMap.values());
}

async function resolveProductCategories(items, onProgress) {
  const categories = new Array(items.length).fill(null);
  let completed = 0;

  await mapWithConcurrency(
    items.map((_, index) => index),
    TOP20_DETAIL_CONCURRENCY,
    async (index) => {
      const compareProductView = items[index].compareProductView || {};
      const productDetailUrl = buildProductDetailUrl(
        compareProductView.productId,
        compareProductView.productDetailUrl || compareProductView.detailUrl,
      );
      if (!productDetailUrl) {
        completed += 1;
        return null;
      }

      try {
        const categoryInfo = await fetchProductDetailCategory(productDetailUrl, {
          verifyUrl: TOP20_DETAIL_VERIFY_URL,
          productId: compareProductView.productId,
        });
        categories[index] = categoryInfo;
        return categoryInfo;
      } catch (error) {
        if (error instanceof CaptchaError) {
          throw error;
        }
        console.warn('[Peer Top20] product category failed:', error);
        return null;
      } finally {
        completed += 1;
        onProgress(
          86 + Math.round((completed / items.length) * 10),
          `正在解析产品类目（${completed}/${items.length}）…`,
        );
      }
    },
    TOP20_DETAIL_DELAY_MS,
  );

  return categories;
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

  const totalResult = await fetchAllCompareItems(productIds, timings, onProgress);

  totalResult.sort(sortByInquiry);

  onProgress(86, `正在解析 ${totalResult.length} 个 compare 产品类目…`);
  const detailStartedAt = Date.now();
  const categoryResults = await resolveProductCategories(totalResult, onProgress);
  timings.detailMs = Date.now() - detailStartedAt;
  timings.detailCandidates = totalResult.length;
  timings.detailSuccess = categoryResults.filter(Boolean).length;

  onProgress(96, '正在整理同行数据…');
  const rankStartedAt = Date.now();
  const allEffectData = totalResult.map((item, index) => toIndustryData(item, categoryResults[index]));
  const effectDataCategoryGrouped = buildCategoryGroups(allEffectData);
  const effectData = sortRecordsByInquiry(allEffectData).slice(0, TOP_COUNT);
  timings.rankMs = Date.now() - rankStartedAt;
  timings.totalMs = Date.now() - totalStartedAt;

  onProgress(100, '抓取完成');
  console.log(
    `[Peer Top20] ${normalizedKeyword}: ${pageCount}页产品 ${timings.uniqueProducts} 个，compare ${timings.compareBatches} 批，供应商 ${timings.uniqueSuppliers} 家，类目 ${timings.detailSuccess}/${timings.detailCandidates}，耗时 ${timings.totalMs}ms`,
    timings,
  );
  if (effectData[0]) {
    console.log('[Peer Top20] sample platformCategory:', effectData[0].platformCategory);
  }

  return {
    keyword: normalizedKeyword,
    effectData,
    effectDataCategoryGrouped,
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
    merged.rankMs += item.timings.rankMs || 0;
    merged.totalMs += item.timings.totalMs || 0;
    merged.uniqueProducts += item.timings.uniqueProducts || 0;
    merged.uniqueSuppliers += item.timings.uniqueSuppliers || 0;
    merged.compareBatches += item.timings.compareBatches || 0;
    merged.compareBatchFailures += item.timings.compareBatchFailures || 0;
  }

  return merged;
}
