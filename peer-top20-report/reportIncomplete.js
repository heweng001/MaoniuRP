export function buildTop20IncompleteNote(scrapeStats = {}) {
  const parts = [];
  const compareFailures = Number(scrapeStats.compareBatchFailures) || 0;
  const compareBatches = Number(scrapeStats.compareBatches) || 0;
  const detailFailed = Number(scrapeStats.detailFailed) || 0;
  const detailCandidates = Number(scrapeStats.detailCandidates) || 0;
  const detailSuccess = Number(scrapeStats.detailSuccess) || 0;
  const detailRetryRounds = Number(scrapeStats.detailRetryRounds) || 0;
  const failureSummary = formatTop20FailureStatsSummary(scrapeStats.failureStats);

  if (compareFailures > 0) {
    parts.push(
      `Compare 不完整（${compareFailures}/${compareBatches || compareFailures} 批失败，已重试 2 次）`,
    );
  }
  if (detailFailed > 0 && detailCandidates > 0) {
    parts.push(
      `类目解析不完整（${detailSuccess}/${detailCandidates} 已成功${
        detailRetryRounds ? `，已重试 ${detailRetryRounds} 轮` : ''
      }）`,
    );
  }
  if (failureSummary) {
    parts.push(`失败分布：${failureSummary}`);
  }
  return parts.join('；');
}

function formatTop20FailureStatsSummary(failureStats) {
  if (!failureStats) {
    return '';
  }
  const compareLabels = {
    timeout: 'Compare超时',
    emptyList: 'Compare空数据',
    structureChange: 'Compare页面结构变化',
    httpError: 'Compare HTTP错误',
    apiError: 'Compare接口异常',
    captcha: 'Compare验证码',
    other: 'Compare其他',
  };
  const detailLabels = {
    timeout: '类目解析超时',
    loginBlock: '类目解析登录/拦截',
    categoryNotFound: '类目未找到',
    noDetailUrl: '缺少详情URL',
    httpError: '类目解析HTTP错误',
    captcha: '类目解析验证码',
    other: '类目解析其他',
  };
  const parts = [];
  for (const [key, count] of Object.entries(failureStats.compare || {})) {
    if (count > 0) {
      parts.push(`${compareLabels[key] || key} ${count}`);
    }
  }
  for (const [key, count] of Object.entries(failureStats.detail || {})) {
    if (count > 0) {
      parts.push(`${detailLabels[key] || key} ${count}`);
    }
  }
  return parts.join('，');
}

export function buildShopInquiryIncompleteNote(scrapeStats = {}, scrapeTimings = {}) {
  const parts = [];
  const compareFailures =
    Number(scrapeTimings.compareBatchFailures) || Number(scrapeStats.compareErrors) || 0;
  const compareBatches = Number(scrapeTimings.compareBatches) || 0;
  const detailCandidates = Number(scrapeStats.compareCandidates) || 0;
  const detailSuccess = Number(scrapeStats.detailSuccess) || 0;
  const detailRetryRounds = Number(scrapeStats.detailRetryRounds) || 0;
  const detailFailed = Math.max(0, detailCandidates - detailSuccess);

  if (compareFailures > 0) {
    parts.push(
      `Compare 不完整（${compareFailures}/${compareBatches || compareFailures} 批失败，已重试 2 次）`,
    );
  }
  if (detailFailed > 0 && detailCandidates > 0) {
    parts.push(
      `平台类目解析不完整（${detailSuccess}/${detailCandidates} 个高询盘产品已成功解析${
        detailRetryRounds ? `，已重试 ${detailRetryRounds} 轮` : ''
      }）`,
    );
  }
  return parts.join('；');
}
