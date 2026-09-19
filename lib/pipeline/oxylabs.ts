import "server-only";

const OXYLABS_ENDPOINT = "https://realtime.oxylabs.io/v1/queries";

type OxylabsRealtimeResponse = {
  results?: Array<{ content?: unknown }>;
};

/**
 * Fetch page HTML via Oxylabs Web Scraper API (universal source).
 * Does not enable JS rendering by default (generic parser strategy).
 */
export async function scrapeUrl(url: string): Promise<string> {
  const username = process.env.OXY_WSA_USERNAME;
  const password = process.env.OXY_WSA_PASSWORD;
  if (!username || !password) {
    throw new Error("Missing OXY_WSA_USERNAME or OXY_WSA_PASSWORD");
  }

  const credentials = Buffer.from(`${username}:${password}`).toString("base64");
  const res = await fetch(OXYLABS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({ source: "universal", url }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`Oxylabs ${res.status} for ${url}`);
  }

  const json = (await res.json()) as OxylabsRealtimeResponse;
  const content = json?.results?.[0]?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error(`Oxylabs returned empty content for ${url}`);
  }

  return content;
}
