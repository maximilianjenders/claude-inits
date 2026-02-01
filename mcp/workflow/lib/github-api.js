const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 */
async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
}

/**
 * Execute operations on multiple items with delays and error collection
 */
async function batchExecute(items, fn, options = {}) {
  const { delayMs = 150 } = options;
  const results = { succeeded: [], failed: [] };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      await withRetry(() => fn(item));
      results.succeeded.push(item);
    } catch (err) {
      results.failed.push({ item, error: err.message });
    }

    // Delay between items (but not after the last one)
    if (i < items.length - 1) {
      await sleep(delayMs);
    }
  }

  results.summary = `${results.succeeded.length}/${items.length} processed successfully`;
  return results;
}

export { sleep, withRetry, batchExecute };
