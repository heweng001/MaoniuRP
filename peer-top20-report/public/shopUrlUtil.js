(function initShopUrlUtil(global) {
  function normalizeAlibabaShopUrl(input) {
    const raw = String(input || '').trim();
    if (!raw) {
      return { valid: false, message: '请填写阿里巴巴店铺网址' };
    }

    let value = raw;
    if (!/^https?:\/\//i.test(value)) {
      value = `https://${value}`;
    }

    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      return {
        valid: false,
        message: '网址格式不正确，请填写类似 https://example.en.alibaba.com 的店铺链接',
      };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname.includes('alibaba.com')) {
      return {
        valid: false,
        message: `不是有效的阿里巴巴店铺网址：${raw}。请使用 alibaba.com 域名下的店铺链接（如 https://example.en.alibaba.com）`,
      };
    }

    if (hostname === 'www.alibaba.com' || hostname === 'alibaba.com') {
      return {
        valid: false,
        message:
          '请填写店铺子域名链接（如 https://example.en.alibaba.com），不要填写 www.alibaba.com 上的产品页或搜索页',
      };
    }

    if (!/\.alibaba\.com$/i.test(hostname)) {
      return {
        valid: false,
        message: `域名 ${parsed.hostname} 不是标准的阿里巴巴国际站店铺域名`,
      };
    }

    const shopUrl = `${parsed.protocol}//${parsed.hostname}`.replace(/\/$/, '');
    const hasExtraPath = Boolean(parsed.pathname && parsed.pathname !== '/');
    const inputWithoutSlash = value.replace(/\/$/, '');
    const wasCorrected = hasExtraPath || inputWithoutSlash !== shopUrl;

    return {
      valid: true,
      shopUrl,
      originalInput: raw,
      wasCorrected,
      correctionHint: wasCorrected ? `已自动矫正为店铺首页：${shopUrl}` : '',
    };
  }

  global.ShopUrlUtil = {
    normalize: normalizeAlibabaShopUrl,
  };
})(window);
