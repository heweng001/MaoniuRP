/** 搜索/采样阶段并行度（Top20 关键词分页、店铺 profile 分组等） */
export const SEARCH_CONCURRENCY = 1;

export async function mapWithConcurrency(items, limit, mapper, delayMs = 0) {
  if (!items?.length) {
    return [];
  }

  const batchSize = Math.max(1, limit || 1);
  const results = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, batchIndex) => mapper(item, index + batchIndex)),
    );
    results.push(...batchResults);
    if (delayMs > 0 && index + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
