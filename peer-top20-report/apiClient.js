import fs from 'node:fs';

const DEFAULT_API_BASE = 'https://ma.maoniux.com/api/v1/report';

export function loadJsonFile(path) {
  return JSON.parse(fs.readFileSync(path, 'utf-8'));
}

export async function fetchReportById(reportId, apiBase = DEFAULT_API_BASE) {
  const response = await fetch(`${apiBase}/${reportId}`);
  if (!response.ok) {
    throw new Error(`拉取报告失败: HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (typeof payload.content === 'string') {
    return JSON.parse(payload.content);
  }
  if (typeof payload.content === 'object' && payload.content) {
    return payload.content;
  }
  throw new Error('报告详情中缺少 content 字段');
}
