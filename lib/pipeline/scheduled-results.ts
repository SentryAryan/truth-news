import "server-only";

import { pickNewestUnprocessedDoneRun } from "@/lib/oxylabs/pick-run";
import {
    fetchJobResultHtml,
    getScheduleRuns,
} from "@/lib/oxylabs/scheduler-client";
import { domainFromListingUrl } from "@/lib/pipeline/parse";
import {
    DEFAULT_LIMIT_PER_SOURCE,
    emptyHomepageStats,
    finishScrapeRun,
    mergeHomepageStats,
    processSourceHomepage,
    resolveScrapeStatus,
    type ScrapeResult,
} from "@/lib/pipeline/scrape";
import { createLog } from "@/lib/supabase/queries/logs";
import {
    insertScheduleRun,
    listProcessedRunIds,
    listSchedules,
} from "@/lib/supabase/queries/schedules";
import { getActiveSources } from "@/lib/supabase/queries/sources";
import type { OxylabsSchedule, Source } from "@/lib/supabase/types";

type ScheduledSource = {
  schedule: OxylabsSchedule;
  source: Source;
};

function activeScheduledSources(
  schedules: OxylabsSchedule[],
  sources: Source[],
): ScheduledSource[] {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  return schedules.flatMap((schedule) => {
    const source = sourceById.get(schedule.source_id);
    return source ? [{ schedule, source }] : [];
  });
}

/**
 * Process the newest completed Oxylabs homepage job per active schedule
 * through the shared scrape-to-insert processor (AGENTS §18).
 */
export async function processScheduledResults(): Promise<ScrapeResult> {
  const started = Date.now();
  const schedules = (await listSchedules()).filter((row) => row.is_active);
  const work = activeScheduledSources(schedules, await getActiveSources());

  console.log(
    `[scrape] started — sources: ${work.length}, limitPerSource: ${DEFAULT_LIMIT_PER_SOURCE}`,
  );

  const log = await createLog({
    log_type: "scheduled_pipeline",
    status: "running",
    sources_checked: 0,
    articles_found: 0,
    articles_inserted: 0,
  });

  const processedRunIds = await listProcessedRunIds();
  let stats = emptyHomepageStats();
  const extraErrors: string[] = [];

  for (const { schedule, source } of work) {
    const domain = domainFromListingUrl(source.listing_url);
    console.log(`[scrape] ${domain} — fetching homepage`);

    try {
      const runs = await getScheduleRuns(schedule.oxylabs_schedule_id);
      const picked = pickNewestUnprocessedDoneRun(
        runs,
        processedRunIds.get(schedule.id) ?? new Set<string>(),
      );
      if (!picked) {
        console.log(`[scrape] ${domain} — no new done run`);
        continue;
      }

      const homepageHtml = await fetchJobResultHtml(picked.jobId);
      if (!homepageHtml) {
        const message = `${domain}: scheduled homepage HTML missing`;
        console.error(`[scrape] ${domain} — homepage error: empty result`);
        extraErrors.push(message);
        await insertScheduleRun({
          schedule_id: schedule.id,
          oxylabs_run_id: picked.runId,
          status: "failed",
          articles_inserted: 0,
          summary: { reason: "empty_homepage_html", jobId: picked.jobId },
        });
        continue;
      }

      const sourceStats = await processSourceHomepage({
        source,
        homepageHtml,
        limitPerSource: DEFAULT_LIMIT_PER_SOURCE,
      });
      stats = mergeHomepageStats(stats, sourceStats);
      await insertScheduleRun({
        schedule_id: schedule.id,
        oxylabs_run_id: picked.runId,
        status: resolveScrapeStatus({
          articlesInserted: sourceStats.articlesInserted,
          articlesFailed: sourceStats.articlesFailed,
          errors: sourceStats.errors,
          sourcesLength: 1,
        }),
        articles_inserted: sourceStats.articlesInserted,
        summary: { jobId: picked.jobId, ...sourceStats },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "scheduled homepage failed";
      console.error(`[scrape] ${domain} — homepage error: ${message}`);
      extraErrors.push(`${domain}: ${message}`);
    }
  }

  return finishScrapeRun({
    logId: log.id,
    sourcesChecked: work.length,
    stats,
    extraErrors,
    startedAt: started,
    limitPerSource: DEFAULT_LIMIT_PER_SOURCE,
  });
}
