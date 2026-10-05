/**
 * Unset, empty, or "on" keeps the scheduled pipeline running.
 * Only "off" disables Oxylabs schedules and the Vercel cron pipeline.
 */
export function isScheduledPipelineEnabled(
  raw: string | undefined = process.env.SCHEDULED_PIPELINE_ENABLED,
): boolean {
  const value = raw?.trim().toLowerCase();
  if (value === undefined || value === "") {
    return true;
  }
  return value !== "off";
}
