import { assertReportHasRows, processSameIndustryData } from './dataProcessor.js';
import { generateHtmlReport } from './reportHtml.js';

export function sanitizeKeywordLabel(text) {
  return String(text || 'report')
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim()
    .slice(0, 120);
}

export function buildKeywordLabel(reports) {
  if (!reports?.length) {
    return 'report';
  }
  if (reports.length === 1) {
    return sanitizeKeywordLabel(reports[0].keyword);
  }
  return sanitizeKeywordLabel(reports.map((report) => report.keyword).join('、'));
}

export function buildReportTitle(keywordLabel) {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `${keywordLabel}-top同行询盘榜-${dateStr}`;
}

export function buildReportPayload(rawData, { selectedCategory } = {}) {
  const reports = processSameIndustryData(rawData);
  assertReportHasRows(reports);

  const keywordLabel = buildKeywordLabel(reports);
  const title = buildReportTitle(keywordLabel);

  return {
    keywordLabel,
    title,
    reports,
    html: generateHtmlReport(reports, { title, selectedCategory }),
    categories: reports.flatMap((report) =>
      report.categories.map((category) => ({
        keyword: report.keyword,
        category: category.category,
      })),
    ),
  };
}

export async function createReportFromRawData(rawData, options = {}) {
  return buildReportPayload(rawData, options);
}

export async function createReportFromInput(input, options = {}) {
  if (!input.rawData) {
    throw new Error('缺少插件返回数据，请通过 Chrome 插件抓取后再生成报告');
  }
  return createReportFromRawData(input.rawData, options);
}
