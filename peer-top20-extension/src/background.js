import './polyfills.js';

import reportDetailService from './services/report-detail.js';
import { queryShopCategoryInquiries, CaptchaError } from './services/industry-hot-inquiries.js';

const GET_VERSION = 'getVersion';
const ATTEMPT_EXTENSION_UPDATE = 'attemptExtensionUpdate';
const GET_DATA_REPORT_DETAIL = 'getDataReportDetail';
const SHOP_CATEGORY_INQUIRIES = 'shopCategoryInquiries';
const OPEN_VERIFICATION_PAGE = 'openVerificationPage';
const TASK_TIMEOUT_MS = 180000;
const SHOP_INQUIRY_TIMEOUT_MS = 150000;

console.log(
  `[Peer Top20] 插件已加载 id=${chrome.runtime.id}, version=${chrome.runtime.getManifest().version}`,
);

if (chrome.runtime.onUpdateAvailable) {
  chrome.runtime.onUpdateAvailable.addListener(() => {
    console.log('[Peer Top20] 检测到 Chrome 自动更新，正在重载插件...');
    chrome.runtime.reload();
  });
}

function attemptExtensionUpdate() {
  return new Promise((resolve) => {
    if (!chrome.runtime.requestUpdateCheck) {
      resolve({
        success: false,
        updated: false,
        status: 'unsupported',
        message: '当前安装方式不支持 Chrome 自动更新',
      });
      return;
    }

    chrome.runtime.requestUpdateCheck((status, details) => {
      if (status === 'update_available') {
        resolve({
          success: true,
          updated: false,
          pendingReload: true,
          status,
          version: details?.version || '',
          message: 'Chrome 已检测到新版本，正在自动安装...',
        });
        return;
      }

      if (status === 'no_update') {
        resolve({
          success: false,
          updated: false,
          status,
          message: 'Chrome 未检测到可自动安装的更新包，请手动下载安装',
        });
        return;
      }

      resolve({
        success: false,
        updated: false,
        status: status || 'unknown',
        message: '无法通过 Chrome 自动更新，请手动下载安装',
      });
    });
  });
}

const progressPort = {
  postMessage(message) {
    console.log('[Peer Top20 progress]', message);
  },
};

function startKeepAlive() {
  return setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {});
  }, 15000);
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

chrome.runtime.onMessageExternal.addListener((request, _sender, sendResponse) => {
  handleExternalMessage(request).then(sendResponse).catch((error) => {
    sendResponse({
      success: false,
      message: error.message || '插件处理失败',
    });
  });
  return true;
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  handleInternalMessage(request).then(sendResponse).catch((error) => {
    sendResponse({
      success: false,
      message: error.message || '插件处理失败',
    });
  });
  return true;
});

async function handleInternalMessage(request) {
  if (request.type === 'getExtensionInfo') {
    return {
      success: true,
      id: chrome.runtime.id,
      version: chrome.runtime.getManifest().version,
      name: chrome.runtime.getManifest().name,
    };
  }
  return handleExternalMessage(request);
}

async function handleExternalMessage(request) {
  const { type, query } = request;

  if (type === OPEN_VERIFICATION_PAGE) {
    const url = request.url || query?.url || '';
    if (!url) {
      return { success: false, message: '缺少验证页面 URL' };
    }
    await chrome.tabs.create({ url, active: true });
    return { success: true };
  }

  if (type === GET_VERSION) {
    return {
      success: true,
      value: chrome.runtime.getManifest().version,
    };
  }

  if (type === ATTEMPT_EXTENSION_UPDATE) {
    return attemptExtensionUpdate();
  }

  if (type === GET_DATA_REPORT_DETAIL) {
    const keepAlive = startKeepAlive();
    try {
      const { ctoken, nickname, cookieCount } = await getTokenAndNickname();
      if (!ctoken) {
        return {
          success: false,
          message:
            '未检测到阿里巴巴登录状态。请先在 Chrome 中打开 https://i.alibaba.com 并完成登录，然后刷新页面重试。',
        };
      }

      if (cookieCount < 3) {
        console.warn('[Peer Top20] alibaba cookies count is low:', cookieCount);
      }

      if (!query?.sameIndustryAnalyse) {
        return {
          success: false,
          message: '当前插件仅支持 sameIndustryAnalyse（同行 Top20）',
        };
      }

      const keywordCount = (query.keywordArray || []).filter(Boolean).length;
      const timeoutMs = TASK_TIMEOUT_MS + Math.max(0, keywordCount - 1) * 60000;

      return enrichTop20CaptchaResponse(
        await withTimeout(
          reportDetailService.getReportDetail(query, ctoken, nickname, progressPort),
          timeoutMs,
          `插件抓取超时（${Math.round(timeoutMs / 1000)} 秒）。请确认已登录阿里巴巴且关键词有效。`,
        ),
        query,
      );
    } finally {
      clearInterval(keepAlive);
    }
  }

  if (type === SHOP_CATEGORY_INQUIRIES) {
    const keepAlive = startKeepAlive();
    try {
      const { ctoken } = await getTokenAndNickname();
      if (!ctoken) {
        return {
          success: false,
          message: '未检测到阿里巴巴登录状态，请先登录 https://i.alibaba.com',
        };
      }

      const shopUrl = query?.shopUrl || query?.shop || request.shopUrl || '';
      if (!shopUrl) {
        return { success: false, message: '缺少店铺链接' };
      }

      try {
        const data = await withTimeout(
          queryShopCategoryInquiries(shopUrl, {
            debug: Boolean(query?.debug),
            productsPerCategory: query?.productsPerCategory,
          }),
          SHOP_INQUIRY_TIMEOUT_MS,
          `店铺类目询盘查询超时（${Math.round(SHOP_INQUIRY_TIMEOUT_MS / 1000)} 秒）`,
        );
        return { success: true, data };
      } catch (error) {
        if (error instanceof CaptchaError || error.verifyUrl || error.captchaUrl) {
          const normalizedShopUrl = shopUrl.replace(/\/$/, '');
          const captchaUrl = error.captchaUrl || error.verifyUrl || '';
          return {
            success: false,
            isExistVerificationCode: true,
            captcha: true,
            verificationUrl: captchaUrl || `${normalizedShopUrl}/company_profile.html`,
            verificationUrls: buildShopVerificationUrls(normalizedShopUrl, captchaUrl),
            shopUrl: normalizedShopUrl,
            message: error.message,
          };
        }
        throw error;
      }
    } finally {
      clearInterval(keepAlive);
    }
  }

  return {
    success: false,
    message: `不支持的消息类型: ${type}`,
  };
}

function buildShopVerificationUrls(shopUrl, captchaUrl) {
  const urls = [];
  const seen = new Set();
  const add = (url, label) => {
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    urls.push({ url, label });
  };

  add(captchaUrl, '触发验证的页面');
  add(`${shopUrl}/company_profile.html`, '公司主页');
  add(`${shopUrl}/productlist.html`, '产品列表');
  add(`${shopUrl}/featureproductlist.html`, '特色产品页');
  add('https://www.alibaba.com/detail/compareProducts.html', 'Compare 对比页');
  return urls;
}

function buildTop20VerificationUrls(primaryUrl, keywords) {
  const searchUrl = keywords[0]
    ? `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText=${encodeURIComponent(keywords[0])}`
    : 'https://www.alibaba.com/trade/search';
  const urls = [];
  const seen = new Set();
  const add = (url, label) => {
    const normalized = String(url || '').trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    urls.push({ url: normalized, label });
  };

  add(primaryUrl, inferCaptchaLabel(primaryUrl));
  add('https://www.alibaba.com/detail/compareProducts.html', 'Compare 对比页');
  if (primaryUrl !== searchUrl) {
    add(searchUrl, '产品搜索页');
  }
  add('https://i.alibaba.com', '阿里巴巴后台登录页');
  return urls;
}

function inferCaptchaLabel(url = '') {
  const text = String(url);
  if (/product-detail|\/detail\//i.test(text)) {
    return '触发验证的类目解析页';
  }
  if (/compareProducts/i.test(text)) {
    return 'Compare 对比页';
  }
  if (/trade\/search/i.test(text)) {
    return '产品搜索页';
  }
  return '触发验证的页面';
}

function enrichTop20CaptchaResponse(result, query) {
  if (!result?.data?.isExistVerificationCode) {
    return result;
  }

  const keywords = (query?.keywordArray || []).filter(Boolean);
  const searchUrl = keywords[0]
    ? `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText=${encodeURIComponent(keywords[0])}`
    : 'https://www.alibaba.com/trade/search';
  const primaryUrl = result.data.verificationCodeUrlPage || searchUrl;

  result.isExistVerificationCode = true;
  result.captcha = true;
  result.verificationUrl = primaryUrl;
  result.verificationUrls = buildTop20VerificationUrls(primaryUrl, keywords);
  if (!result.message) {
    result.message =
      result.data.captchaSource === 'detail'
        ? '阿里巴巴在类目解析时出现验证码，请打开实际触发验证的页面完成验证后再试'
        : '阿里巴巴出现验证码，请先完成验证后再试';
  }
  return result;
}

function getTokenAndNickname() {
  return new Promise((resolve) => {
    chrome.cookies.getAll({ domain: '.alibaba.com' }, (cookies) => {
      let token = '';
      let nick = '';
      const loginCookie = (cookies || []).find((item) => item.name === 'xman_us_t');

      if (loginCookie?.value) {
        const pairs = loginCookie.value.split('&');
        token =
          pairs.find((pair) => pair.startsWith('ctoken='))?.split('=')[1] || '';
        nick =
          pairs.find((pair) => pair.startsWith('x_lid='))?.split('=')[1] || '';
      }

      resolve({
        ctoken: token,
        nickname: nick,
        cookieCount: (cookies || []).length,
      });
    });
  });
}
