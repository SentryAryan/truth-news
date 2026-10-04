import { describe, expect, it } from "vitest";

import { pickNewestUnprocessedDoneRun } from "@/lib/oxylabs/pick-run";

describe("pickNewestUnprocessedDoneRun", () => {
  const runs = [
    {
      runId: "105302280",
      jobs: [{ id: "7505291047442843649", resultStatus: "done" }],
    },
    {
      runId: "105302283",
      jobs: [{ id: "7505291294688676865", resultStatus: "pending" }],
    },
    {
      runId: "105302290",
      jobs: [{ id: "7505292000000000001", resultStatus: "done" }],
    },
  ];

  it("picks the newest done run that is not already stored", () => {
    expect(pickNewestUnprocessedDoneRun(runs, new Set())).toEqual({
      runId: "105302290",
      jobId: "7505292000000000001",
    });
  });

  it("skips a stored newest run and pending jobs", () => {
    expect(
      pickNewestUnprocessedDoneRun(runs, new Set(["105302290"])),
    ).toEqual({
      runId: "105302280",
      jobId: "7505291047442843649",
    });
  });

  it("returns null when every done run is already stored", () => {
    expect(
      pickNewestUnprocessedDoneRun(
        runs,
        new Set(["105302280", "105302290"]),
      ),
    ).toBeNull();
  });
});
