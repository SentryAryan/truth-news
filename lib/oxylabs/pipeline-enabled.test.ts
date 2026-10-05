import { describe, expect, it } from "vitest";

import { isScheduledPipelineEnabled } from "@/lib/oxylabs/pipeline-enabled";

describe("isScheduledPipelineEnabled", () => {
  it("is on when unset or empty", () => {
    expect(isScheduledPipelineEnabled(undefined)).toBe(true);
    expect(isScheduledPipelineEnabled("")).toBe(true);
    expect(isScheduledPipelineEnabled("   ")).toBe(true);
  });

  it("is on when set to on", () => {
    expect(isScheduledPipelineEnabled("on")).toBe(true);
    expect(isScheduledPipelineEnabled("ON")).toBe(true);
  });

  it("is off only when set to off", () => {
    expect(isScheduledPipelineEnabled("off")).toBe(false);
    expect(isScheduledPipelineEnabled("OFF")).toBe(false);
  });
});
