import "server-only";

import type { ReaderCount } from "@/lib/trending/constants";
import { parsePosthogTrendingResponse } from "@/lib/trending/posthog-response";
import { buildTrendingHogQl } from "@/lib/trending/rank";

const POSTHOG_QUERY_ORIGIN = "https://us.posthog.com";

type PosthogConfig = {
  apiKey: string;
  projectId: string;
};

export function readPosthogQueryConfig(): PosthogConfig | null {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  if (!apiKey || !projectId || !/^\d+$/.test(projectId)) {
    return null;
  }
  return { apiKey, projectId };
}

export async function queryPosthogTrending(
  fetchImpl: typeof fetch = fetch,
): Promise<ReaderCount[]> {
  const config = readPosthogQueryConfig();
  if (!config) {
    throw new Error(
      "Missing POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID",
    );
  }

  const response = await fetchImpl(
    `${POSTHOG_QUERY_ORIGIN}/api/projects/${config.projectId}/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: buildTrendingHogQl(),
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`PostHog trending query failed (${response.status})`);
  }

  return parsePosthogTrendingResponse(await response.json());
}
