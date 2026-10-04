export type OxylabsScheduleJob = {
  id: string;
  resultStatus: string;
};

export type OxylabsScheduleRunInfo = {
  runId: string;
  jobs: OxylabsScheduleJob[];
};

function compareRunIdDesc(left: string, right: string): number {
  const leftId = BigInt(left);
  const rightId = BigInt(right);
  if (leftId === rightId) {
    return 0;
  }
  return leftId > rightId ? -1 : 1;
}

/**
 * Newest run that has a done job and has not been stored yet.
 * Pending and faulted jobs are ignored.
 */
export function pickNewestUnprocessedDoneRun(
  runs: readonly OxylabsScheduleRunInfo[],
  processedRunIds: ReadonlySet<string>,
): { runId: string; jobId: string } | null {
  const candidates = runs
    .filter((run) => !processedRunIds.has(run.runId))
    .map((run) => {
      const doneJob = run.jobs.find((job) => job.resultStatus === "done");
      if (!doneJob) {
        return null;
      }
      return { runId: run.runId, jobId: doneJob.id };
    })
    .filter((run): run is { runId: string; jobId: string } => run !== null)
    .sort((left, right) => compareRunIdDesc(left.runId, right.runId));

  return candidates[0] ?? null;
}
