import { assertReportHasRows, processSameIndustryData } from './dataProcessor.js';
import { exportExcelToBuffer } from './reportExcel.js';
import { generateHtmlReport } from './reportHtml.js';

export function buildReportTitle(keywordLabel) {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `${keywordLabel}-询盘top20店铺明细表-${dateStr}`;
}

export function buildReportPayload(rawData, { selectedCategory } = {}) {
  const reports = processSameIndustryData(rawData);
  assertReportHasRows(reports);

  const keywordLabel = reports.length === 1 ? reports[0].keyword : 'multi-keywords';
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
  const payload = buildReportPayload(rawData, options);
  const excelBuffer = await exportExcelToBuffer(payload.reports, options);
  return { ...payload, excelBuffer };
}

export async function createReportFromInput(input, options = {}) {
  if (!input.rawData) {
    throw new Error('缺少插件返回数据，请通过 Chrome 插件抓取后再生成报告');
  }
  return createReportFromRawData(input.rawData, options);
}
