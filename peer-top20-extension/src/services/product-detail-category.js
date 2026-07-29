import { peerFetch } from 'common';
import { getNested } from 'util/index';
import { CaptchaError } from './compare-products.js';

export { CaptchaError };

function coerceResponseToText(response) {
  if (typeof response === 'string') {
    return response;
  }
  if (response && typeof response === 'object') {
    try {
      return JSON.stringify(response);
    } catch {
      return '';
    }
  }
  return '';
}

function extractJsonObject(text, startIndex) {
  if (typeof text !== 'string' || text[startIndex] !== '{') {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const ch = text[index];
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
          return JSON.parse(text.slice(startIndex, index + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

export function normalizeProductDetailUrl(url) {
  let value = String(url || '').trim();
  if (!value) {
    return '';
  }
  if (value.startsWith('//')) {
    value = `https:${value}`;
  }
  if (!value.startsWith('http')) {
    value = `https://${value}`;
  }
  return value;
}

export function extractProductIdFromUrl(url) {
  const match = String(url || '').match(/_(\d{6,})(?:\.html|[/?#]|$)/);
  return match?.[1] || '';
}

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

function isBlockedDetailPage(html) {
  return (
    typeof html === 'string' &&
    html.length < 12000 &&
    (html.includes('"action": "login"') ||
      html.includes('icbuLogin.htm') ||
      html.includes('mini_login.htm'))
  );
}

function parseProductDetail(html) {
  if (typeof html !== 'string') {
    return null;
  }

  const markers = ['window.detailData = ', 'window.__detail_data__ = ', 'window.__DETAIL_DATA__ = '];
  for (const marker of markers) {
    const start = html.indexOf(marker);
    if (start === -1) {
      continue;
    }
    const jsonStart = start + marker.length;
    const parsedByDepth = extractJsonObject(html, jsonStart);
    if (parsedByDepth) {
      return parsedByDepth;
    }

    const end = html.indexOf('"js_ssr"}}}', start);
    if (end === -1) {
      continue;
    }
    const jsonText = `${html.substring(jsonStart, end)}"js_ssr"}}}`;
    try {
      return JSON.parse(jsonText);
    } catch {
      /* try next marker */
    }
  }

  return null;
}

function parseCategoryFromPathList(html) {
  if (typeof html !== 'string') {
    return null;
  }
  const start = html.indexOf('"pathList":');
  if (start === -1) {
    return null;
  }
  const snippet = html.substring(start, start + 4000);
  const end = snippet.indexOf(']');
  if (end === -1) {
    return null;
  }
  try {
    const pathList = JSON.parse(snippet.substring(0, end + 1).replace('"pathList":', ''));
    if (!Array.isArray(pathList) || !pathList.length) {
      return null;
    }
    const last = pathList[pathList.length - 1];
    const categoryName = getNested(last, 'hrefObject', 'name') || getNested(last, 'name') || '';
    const categoryId =
      getNested(last, 'hrefObject', 'categoryId') ||
      getNested(last, 'categoryId') ||
      categoryName;
    if (!categoryId && !categoryName) {
      return null;
    }
    return {
      categoryId: String(categoryId || categoryName),
      categoryName: String(categoryName || categoryId || '未分类'),
    };
  } catch {
    return null;
  }
}

function parseCategoryFromHtmlPatterns(html) {
  if (typeof html !== 'string') {
    return null;
  }

  const categoryIdMatch =
    html.match(/"productCategoryId"\s*:\s*"?(\d+)"?/) ||
    html.match(/productCategoryId['"]\s*:\s*['"]?(\d+)/);

  let categoryName = '';
  const pathListMatch = html.match(/"pathList"\s*:\s*(\[[\s\S]{0,12000}?\])\s*,/);
  if (pathListMatch) {
    try {
      const pathList = JSON.parse(pathListMatch[1]);
      const last = pathList[pathList.length - 1];
      categoryName = getNested(last, 'hrefObject', 'name') || getNested(last, 'name') || '';
    } catch {
      /* ignore malformed pathList */
    }
  }

  if (!categoryIdMatch && !categoryName) {
    return parseCategoryFromPathList(html);
  }

  const categoryId = categoryIdMatch?.[1] || categoryName;
  if (!categoryId) {
    return null;
  }

  return {
    categoryId: String(categoryId),
    categoryName: String(categoryName || categoryId),
  };
}

function extractCategoryPath(detailData, html, fallbackCategory) {
  const pathList = getNested(detailData, 'globalData', 'seo', 'breadCrumb', 'pathList');
  if (Array.isArray(pathList) && pathList.length) {
    return pathList
      .map((item) => ({
        categoryId: String(
          getNested(item, 'hrefObject', 'categoryId') ||
            getNested(item, 'categoryId') ||
            getNested(item, 'hrefObject', 'name') ||
            getNested(item, 'name') ||
            '',
        ),
        categoryName: String(
          getNested(item, 'hrefObject', 'name') || getNested(item, 'name') || '未分类',
        ),
      }))
      .filter((item) => item.categoryId || item.categoryName);
  }

  if (fallbackCategory?.categoryId || fallbackCategory?.categoryName) {
    return [
      {
        categoryId: String(fallbackCategory.categoryId || fallbackCategory.categoryName),
        categoryName: String(fallbackCategory.categoryName || fallbackCategory.categoryId),
      },
    ];
  }

  if (typeof html === 'string') {
    const pathListMatch = html.match(/"pathList"\s*:\s*(\[[\s\S]{0,12000}?\])\s*,/);
    if (pathListMatch) {
      try {
        const parsed = JSON.parse(pathListMatch[1]);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map((item) => ({
            categoryId: String(
              getNested(item, 'hrefObject', 'categoryId') ||
                getNested(item, 'categoryId') ||
                getNested(item, 'hrefObject', 'name') ||
                getNested(item, 'name') ||
                '',
            ),
            categoryName: String(
              getNested(item, 'hrefObject', 'name') || getNested(item, 'name') || '未分类',
            ),
          }));
        }
      } catch {
        /* ignore */
      }
    }
  }

  return [];
}

export function getCategoryInfo(detailData, html) {
  const categoryId = getNested(detailData, 'globalData', 'product', 'productCategoryId') || '';
  const pathList = getNested(detailData, 'globalData', 'seo', 'breadCrumb', 'pathList') || [];
  const last = pathList[pathList.length - 1];
  let categoryName =
    getNested(last, 'hrefObject', 'name') ||
    getNested(last, 'name') ||
    '';

  if (categoryId || categoryName) {
    const base = {
      categoryId: String(categoryId || categoryName),
      categoryName: String(categoryName || categoryId),
    };
    return {
      ...base,
      categoryPath: extractCategoryPath(detailData, html, base),
    };
  }

  const fallback = parseCategoryFromHtmlPatterns(html);
  if (!fallback?.categoryId) {
    return { categoryId: '', categoryName: '', categoryPath: [] };
  }

  return {
    ...fallback,
    categoryPath: extractCategoryPath(detailData, html, fallback),
  };
}

export function buildProductDetailUrl(productId, productDetailUrl) {
  const direct = normalizeProductDetailUrl(productDetailUrl);
  if (direct) {
    return direct;
  }

  const id = String(productId || '').trim();
  if (!id) {
    return '';
  }

  return `https://www.alibaba.com/product-detail/_${id}.html`;
}

export function formatCategoryDisplay(categoryInfo) {
  if (!categoryInfo?.categoryName && !categoryInfo?.categoryId) {
    return '-';
  }

  const path = Array.isArray(categoryInfo.categoryPath) ? categoryInfo.categoryPath : [];
  const names = path.map((item) => item.categoryName).filter(Boolean);
  if (names.length) {
    return names.join(' > ');
  }

  return String(categoryInfo.categoryName || categoryInfo.categoryId || '-');
}

export async function fetchProductDetailCategory(productDetailUrl, options = {}) {
  const {
    verifyUrl = 'https://www.alibaba.com/detail/compareProducts.html',
    debugContext = null,
    timeout = 25000,
    productId = '',
  } = options;
  const url = buildProductDetailUrl(productId, productDetailUrl);
  if (!url) {
    return null;
  }

  let html = coerceResponseToText(
    await peerFetch({
      url,
      timeout,
      browserLike: true,
      headers: { Referer: verifyUrl },
    }),
  );
  assertNotCaptcha(html, url, verifyUrl);

  if (isBlockedDetailPage(html)) {
    if (debugContext?.enabled) {
      debugContext.detailPage = {
        url,
        reason: 'login-or-block-page',
        htmlLength: html.length,
        snippet: html.slice(0, 400),
      };
    }
    return null;
  }

  const detailData = parseProductDetail(html);
  const { categoryId, categoryName, categoryPath } = getCategoryInfo(detailData, html);
  if (!categoryId) {
    if (debugContext?.enabled) {
      debugContext.detailPage = {
        url,
        reason: 'category-not-found',
        htmlLength: html.length,
        hasDetailData: Boolean(detailData),
        productId: extractProductIdFromUrl(url),
        snippet: html.slice(0, 400),
      };
    }
    return null;
  }

  return {
    categoryId,
    categoryName,
    categoryPath,
  };
}
