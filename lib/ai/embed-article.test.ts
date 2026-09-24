import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const embedMock = vi.fn();
const embeddingFactory = vi.fn((modelId: string) => ({ modelId }));
const getOpenRouterClientMock = vi.fn(() => ({
  embedding: embeddingFactory,
}));
const getEmbeddingModelIdMock = vi.fn(
  () => "nvidia/nemotron-3-embed-1b:free",
);

vi.mock("ai", () => ({
  embed: (...args: unknown[]) => embedMock(...args),
}));

vi.mock("@/lib/ai/openrouter", () => ({
  EMBEDDING_DIMENSIONS: 2048,
  getOpenRouterClient: () => getOpenRouterClientMock(),
  getEmbeddingModelId: () => getEmbeddingModelIdMock(),
}));

function vectorOfLength(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i * 0.001);
}

describe("embedArticle", () => {
  beforeEach(() => {
    embedMock.mockReset();
    embeddingFactory.mockClear();
    getOpenRouterClientMock.mockClear();
    vi.resetModules();
  });

  it("returns embedding vector on success", async () => {
    const embedding = vectorOfLength(2048);
    embedMock.mockResolvedValue({ embedding });
    const { embedArticle } = await import("@/lib/ai/embed-article");
    const result = await embedArticle("Title", "Body text");
    expect(result).toEqual({ ok: true, embedding });
    expect(embeddingFactory).toHaveBeenCalledWith(
      "nvidia/nemotron-3-embed-1b:free",
    );
    expect(embedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        value: "Title\n\nBody text",
        maxRetries: 0,
      }),
    );
  });

  it("returns rateLimited when provider hits rate limit", async () => {
    embedMock.mockRejectedValue(
      new Error("Rate limit exceeded: free-models-per-day"),
    );
    const { embedArticle } = await import("@/lib/ai/embed-article");
    const result = await embedArticle("Title", "Body");
    expect(result).toEqual({
      ok: false,
      rateLimited: true,
      message: "Rate limit exceeded: free-models-per-day",
    });
  });

  it("returns failure when provider throws non-rate-limit error", async () => {
    embedMock.mockRejectedValue(new Error("network down"));
    const { embedArticle } = await import("@/lib/ai/embed-article");
    const result = await embedArticle("Title", "Body");
    expect(result).toEqual({
      ok: false,
      rateLimited: false,
      message: "network down",
    });
  });

  it("returns failure when embedding is empty", async () => {
    embedMock.mockResolvedValue({ embedding: [] });
    const { embedArticle } = await import("@/lib/ai/embed-article");
    const result = await embedArticle("Title", "Body");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rateLimited).toBe(false);
    }
  });

  it("returns failure when embedding length mismatches EMBEDDING_DIMENSIONS", async () => {
    embedMock.mockResolvedValue({ embedding: vectorOfLength(1536) });
    const { embedArticle } = await import("@/lib/ai/embed-article");
    const result = await embedArticle("Title", "Body");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rateLimited).toBe(false);
    }
  });
});
