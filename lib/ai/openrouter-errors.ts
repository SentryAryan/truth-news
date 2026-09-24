/**
 * Detect OpenRouter / AI SDK rate-limit failures so the pipeline can abort early.
 */
export function isOpenRouterRateLimitError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lower = message.toLowerCase();

  if (
    lower.includes("rate limit") ||
    lower.includes("free-models-per-day") ||
    lower.includes("429")
  ) {
    return true;
  }

  if (error && typeof error === "object") {
    const record = error as {
      statusCode?: unknown;
      status?: unknown;
      code?: unknown;
      cause?: unknown;
    };
    if (record.statusCode === 429 || record.status === 429) {
      return true;
    }
    if (typeof record.code === "string" && record.code.toLowerCase().includes("rate")) {
      return true;
    }
    if (record.cause) {
      return isOpenRouterRateLimitError(record.cause);
    }
  }

  return false;
}

export class OpenRouterRateLimitError extends Error {
  readonly name = "OpenRouterRateLimitError";

  constructor(message = "OpenRouter rate limit exceeded") {
    super(message);
  }
}
