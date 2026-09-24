/**
 * Remaining articles in the current batch left unattempted after a rate-limit abort.
 * @param abortedAtIndex 0-based index of the article that hit the rate limit
 */
export function skippedAfterRateLimitAbort(
  batchLength: number,
  abortedAtIndex: number,
): number {
  if (batchLength <= 0 || abortedAtIndex < 0) {
    return 0;
  }
  return Math.max(0, batchLength - abortedAtIndex - 1);
}
