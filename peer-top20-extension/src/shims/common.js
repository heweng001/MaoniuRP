import { encode } from 'util/index';
import sleep from 'util/sleep';

let allowCount = 15;
let current = 0;
let timeInterval = 3000;

let syncRankCurrent = 0;
let syncRankAllowCount = 10;
let syncRankTimeInterval = 3000;

let gather1688ProductAllowCount = 1;
let gather1688ProductCurrent = 0;
let gather1688ProductTimeInterval = 1000;

let sameIndustryAnalyseAllowCount = 3;
let currentSameIndustryAnalyseCount = 0;
let sameIndustryAnalyseTimeInterval = 1000;

const REQUEST_TIMEOUT_MS = 12000;
const PEER_REQUEST_TIMEOUT_MS = 15000;

/**
 * 同行 Top20 专用请求：不限流，超时更短，避免整批任务卡死。
 */
export async function peerFetch(options = {}) {
  const url = buildRequestUrl(options.url, options.params);
  const cookies = await getAlibabaCookies();
  const cookieHeader = buildCookieHeader(cookies);
  const method = (options.method || 'GET').toUpperCase();
  const timeoutMs = options.timeout || PEER_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    const headers = {
      Accept: options.browserLike
        ? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        : '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: getReferer(url),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(options.headers || {}),
    };
    if (!options.browserLike) {
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    response = await fetch(url, {
      method,
      credentials: 'include',
      signal: controller.signal,
      headers,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`请求超时（${Math.round(timeoutMs / 1000)}s）`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  if (text.includes('"action": "captcha"')) {
    return text;
  }

  const trimmed = text.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return text;
    }
  }

  return text;
}

const fetchProductTransaction = {
  current: 0,
  allowCount: 5,
  timeInterval: 1000,
};

setInterval(() => {
  fetchProductTransaction.current = 0;
}, fetchProductTransaction.timeInterval);

setInterval(() => {
  currentSameIndustryAnalyseCount = 0;
}, sameIndustryAnalyseTimeInterval);

setInterval(() => {
  current = 0;
}, timeInterval);

setInterval(() => {
  syncRankCurrent = 0;
}, syncRankTimeInterval);

setInterval(() => {
  gather1688ProductCurrent = 0;
}, gather1688ProductTimeInterval);

function isFetchProductTransactionData(url) {
  return url.includes(
    'https://www.alibaba.com/event/app/productExportOrderQuery/transactionOverview.htm',
  );
}

function needLimitRate(url) {
  return (
    url.includes('https://hz-mydata.alibaba.com') ||
    url.includes('https://www2.alibaba.com/api/report')
  );
}

function isSyncRank(url) {
  return url.includes('https://hz-productposting.alibaba.com');
}

function isGather1688Product(url) {
  return url.includes('https://detail.1688.com/') || url.includes('https://search.1688.com/');
}

function isSameIndustryAnalyse(url) {
  return (
    url.includes('https://www.alibaba.com/trade/search') ||
    url.includes('https://open-s.alibaba.com/openservice/galleryProductOfferResultViewService') ||
    url.includes('https://www.alibaba.com/detail/compareProducts.html')
  );
}

function getAlibabaCookies() {
  return new Promise((resolve) => {
    chrome.cookies.getAll({ domain: '.alibaba.com' }, (cookies) => resolve(cookies || []));
  });
}

function buildCookieHeader(cookies) {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}

function buildRequestUrl(url, params) {
  if (!params || !Object.keys(params).length) {
    return url;
  }
  const query = encode(params, []);
  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}

function getReferer(url) {
  if (url.includes('compareProducts')) {
    return 'https://www.alibaba.com/detail/compareProducts.html';
  }
  if (url.includes('open-s.alibaba.com')) {
    return 'https://www.alibaba.com/trade/search';
  }
  if (url.includes('i.alibaba.com')) {
    return 'https://i.alibaba.com/';
  }
  if (/\.alibaba\.com/i.test(url)) {
    try {
      const normalized = url.startsWith('http') ? url : `https:${url}`;
      return `${new URL(normalized).origin}/`;
    } catch {
      return 'https://www.alibaba.com/';
    }
  }
  return 'https://www.alibaba.com/trade/search';
}

async function waitForRateLimit(url) {
  if (needLimitRate(url)) {
    while (current >= allowCount) {
      await sleep(500);
    }
    current += 1;
  }

  if (isFetchProductTransactionData(url)) {
    while (fetchProductTransaction.current >= fetchProductTransaction.allowCount) {
      await sleep(500);
    }
    fetchProductTransaction.current += 1;
  }

  if (isSyncRank(url)) {
    while (syncRankCurrent >= syncRankAllowCount) {
      await sleep(500);
    }
    syncRankCurrent += 1;
  }

  if (isGather1688Product(url)) {
    while (gather1688ProductCurrent >= gather1688ProductAllowCount) {
      await sleep(500);
    }
    gather1688ProductCurrent += 1;
  }

  if (isSameIndustryAnalyse(url)) {
    while (currentSameIndustryAnalyseCount >= sameIndustryAnalyseAllowCount) {
      await sleep(500);
    }
    currentSameIndustryAnalyseCount += 1;
  }
}

export const Axios = async function Axios(options = {}) {
  const url = buildRequestUrl(options.url, options.params);
  await waitForRateLimit(url);

  const cookies = await getAlibabaCookies();
  const cookieHeader = buildCookieHeader(cookies);
  const method = (options.method || 'GET').toUpperCase();

  const timeoutMs = options.timeout || REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: getReferer(url),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`请求超时（${Math.round(timeoutMs / 1000)}s）: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`请求失败 HTTP ${response.status}: ${url}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  if (text.includes('"action": "captcha"')) {
    return text;
  }

  const trimmed = text.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return text;
    }
  }

  return text;
};
