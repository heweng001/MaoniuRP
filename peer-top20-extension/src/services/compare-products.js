import { peerFetch } from 'common';
import md5 from 'crypto-js/md5.js';
import { isObject } from 'lodash';

export class CaptchaError extends Error {
  constructor(captchaUrl, message = '阿里巴巴出现验证码，请先完成验证后再查询', verifyUrl = '') {
    super(message);
    this.name = 'CaptchaError';
    this.captchaUrl = captchaUrl || verifyUrl || '';
    this.verifyUrl = verifyUrl || captchaUrl || '';
  }
}

export function getCompareId(productIds) {
  return md5([...productIds, '91801202compare'].join(',')).toString();
}

export async function getCompareProductsData(productIds, options = {}) {
  if (!productIds?.length) {
    return [];
  }

  const verifyUrl =
    options.verifyUrl || 'https://www.alibaba.com/detail/compareProducts.html';

  const res = await peerFetch({
    url: 'https://www.alibaba.com/detail/compareProducts.html',
    method: 'get',
    params: {
      ids: productIds.join(','),
      compareId: getCompareId(productIds),
    },
    timeout: 20000,
  });

  if (typeof res === 'string' && res.includes('"action": "captcha"')) {
    throw new CaptchaError(
      'https://www.alibaba.com/detail/compareProducts.html',
      undefined,
      verifyUrl,
    );
  }

  if (isObject(res)) {
    throw new Error(res?.ret?.[1] || 'compareProducts 返回异常');
  }

  const startFlag = '  data: ';
  const endFlag = ' });';
  const startIndex = res.indexOf(startFlag);
  const endIndex = res.indexOf(endFlag, startIndex);
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('compareProducts 页面结构已变化');
  }

  const data = res.substring(startIndex + startFlag.length, endIndex);
  const parsed = JSON.parse(data);
  const listView = parsed.listView || [];

  if (typeof options.onDebugSample === 'function' && listView.length) {
    options.onDebugSample(buildCompareProductsDebug(listView, productIds, parsed));
  }

  return listView;
}

export function buildCompareProductsDebug(listView, productIds, parsedRoot = {}) {
  const sample = listView[0] || null;
  return {
    capturedAt: new Date().toISOString(),
    source: 'https://www.alibaba.com/detail/compareProducts.html',
    productIds: [...productIds],
    listViewCount: listView.length,
    rootKeys: Object.keys(parsedRoot || {}),
    sample,
    fieldKeys: sample
      ? {
          topLevel: Object.keys(sample),
          compareCompanyView: Object.keys(sample.compareCompanyView || {}),
          compareProductView: Object.keys(sample.compareProductView || {}),
        }
      : null,
  };
}
