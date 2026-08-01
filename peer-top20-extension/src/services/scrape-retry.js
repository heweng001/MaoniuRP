/** Compare / 类目解析等抓取步骤的通用重试 */

export const SCRAPE_MAX_RETRIES = 1;
export const SCRAPE_RETRY_DELAY_MS = 600;

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWithRetries(task, { maxRetries = SCRAPE_MAX_RETRIES, delayMs = SCRAPE_RETRY_DELAY_MS } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const value = await task(attempt);
      return { ok: true, value, attempts: attempt + 1 };
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await sleep(delayMs * (attempt + 1));
      }
    }
  }
  return { ok: false, error: lastError, attempts: maxRetries + 1 };
}
