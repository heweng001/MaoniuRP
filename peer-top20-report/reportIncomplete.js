export function buildTop20IncompleteNote(scrapeStats = {}) {
  const parts = [];
  const compareFailures = Number(scrapeStats.compareBatchFailures) || 0;
  const compareBatches = Number(scrapeStats.compareBatches) || 0;
  const detailFailed = Number(scrapeStats.detailFailed) || 0;
  const detailCandidates = Number(scrapeStats.detailCandidates) || 0;
  const detailSuccess = Number(scrapeStats.detailSuccess) || 0;
  const detailRetryRounds = Number(scrapeStats.detailRetryRounds) || 0;

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
  return parts.join('；');
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
