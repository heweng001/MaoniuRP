/** Compare / 类目解析失败原因统计与诊断样本 */

export function createFailureStats() {
  return {
    compare: {
      timeout: 0,
      emptyList: 0,
      structureChange: 0,
      httpError: 0,
      apiError: 0,
      captcha: 0,
      other: 0,
    },
    detail: {
      timeout: 0,
      loginBlock: 0,
      categoryNotFound: 0,
      noDetailUrl: 0,
      httpError: 0,
      captcha: 0,
      other: 0,
    },
  };
}

export function createScrapeDiagnostics() {
  return {
    compareProducts: null,
    compareFailure: null,
    detailPage: null,
  };
}

export function classifyCompareError(error) {
  if (!error) {
    return 'other';
  }
  if (error.name === 'CaptchaError') {
    return 'captcha';
  }
  const message = String(error.message || error);
  if (message.includes('超时')) {
    return 'timeout';
  }
  if (message.includes('返回空数据')) {
    return 'emptyList';
  }
  if (message.includes('页面结构已变化')) {
    return 'structureChange';
  }
  if (message.includes('HTTP ')) {
    return 'httpError';
  }
  if (message.includes('返回异常')) {
    return 'apiError';
  }
  return 'other';
}

export function classifyDetailFailureReason(reasonOrError) {
  if (!reasonOrError) {
    return 'other';
  }
  if (typeof reasonOrError === 'string') {
    if (reasonOrError === 'login-or-block-page') {
      return 'loginBlock';
    }
    if (reasonOrError === 'category-not-found') {
      return 'categoryNotFound';
    }
    if (reasonOrError === 'no-detail-url') {
      return 'noDetailUrl';
    }
    if (reasonOrError === 'captcha') {
      return 'captcha';
    }
    if (reasonOrError.includes('超时')) {
      return 'timeout';
    }
    if (reasonOrError.includes('HTTP ')) {
      return 'httpError';
    }
    return 'other';
  }
  return classifyCompareError(reasonOrError);
}

export function recordCompareFailure(failureStats, error) {
  if (!failureStats?.compare) {
    return 'other';
  }
  const key = classifyCompareError(error);
  failureStats.compare[key] = (failureStats.compare[key] || 0) + 1;
  return key;
}

export function recordDetailFailure(failureStats, reasonOrError) {
  if (!failureStats?.detail) {
    return 'other';
  }
  const key = classifyDetailFailureReason(reasonOrError);
  failureStats.detail[key] = (failureStats.detail[key] || 0) + 1;
  return key;
}

export function captureCompareSuccessSample(diagnostics, payload) {
  if (!diagnostics || diagnostics.compareProducts || !payload) {
    return;
  }
  diagnostics.compareProducts = payload;
}

export function captureCompareFailureSample(diagnostics, payload) {
  if (!diagnostics || diagnostics.compareFailure || !payload) {
    return;
  }
  diagnostics.compareFailure = payload;
}

export function captureDetailFailureSample(diagnostics, payload) {
  if (!diagnostics || diagnostics.detailPage || !payload) {
    return;
  }
  diagnostics.detailPage = {
    capturedAt: new Date().toISOString(),
    ...payload,
  };
}

export function mergeFailureStats(target, source) {
  if (!source) {
    return target;
  }
  for (const bucket of ['compare', 'detail']) {
    for (const [key, value] of Object.entries(source[bucket] || {})) {
      target[bucket][key] = (target[bucket][key] || 0) + (Number(value) || 0);
    }
  }
  return target;
}

const COMPARE_LABELS = {
  timeout: 'Compare超时',
  emptyList: 'Compare空数据',
  structureChange: 'Compare页面结构变化',
  httpError: 'Compare HTTP错误',
  apiError: 'Compare接口异常',
  captcha: 'Compare验证码',
  other: 'Compare其他',
};

const DETAIL_LABELS = {
  timeout: '类目解析超时',
  loginBlock: '类目解析登录/拦截',
  categoryNotFound: '类目未找到',
  noDetailUrl: '缺少详情URL',
  httpError: '类目解析HTTP错误',
  captcha: '类目解析验证码',
  other: '类目解析其他',
};

export function formatFailureStatsSummary(failureStats) {
  if (!failureStats) {
    return '';
  }
  const parts = [];
  for (const [key, count] of Object.entries(failureStats.compare || {})) {
    if (count > 0) {
      parts.push(`${COMPARE_LABELS[key] || key} ${count}`);
    }
  }
  for (const [key, count] of Object.entries(failureStats.detail || {})) {
    if (count > 0) {
      parts.push(`${DETAIL_LABELS[key] || key} ${count}`);
    }
  }
  return parts.join('，');
}

export function hasScrapeDiagnostics(diagnostics) {
  return Boolean(
    diagnostics?.compareProducts || diagnostics?.compareFailure || diagnostics?.detailPage,
  );
}
