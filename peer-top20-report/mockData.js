/** 输入解析与校验 */

export function parseKeywordsInput(text) {
  return String(text || '')
    .split(/[\n,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
