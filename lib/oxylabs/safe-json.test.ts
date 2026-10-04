import { describe, expect, it } from "vitest";

import {
    oxylabsIdToString,
    parseOxylabsJson,
    quoteUnsafeIntegers,
} from "@/lib/oxylabs/safe-json";

const SCHEDULE_ID = "168110763619310929";
const JOB_ID = "7505291047442843649";

describe("quoteUnsafeIntegers", () => {
  it("quotes 16+ digit integers and leaves short integers numeric", () => {
    const raw = `{"schedule_id":${SCHEDULE_ID},"run_id":105302280}`;
    const quoted = quoteUnsafeIntegers(raw);
    expect(quoted).toContain(`"schedule_id":"${SCHEDULE_ID}"`);
    expect(quoted).toContain('"run_id":105302280');
  });

  it("quotes large ids inside arrays", () => {
    const raw = `{"schedules":[${SCHEDULE_ID},195963006349271396]}`;
    const quoted = quoteUnsafeIntegers(raw);
    expect(quoted).toBe(
      '{"schedules":["168110763619310929","195963006349271396"]}',
    );
  });
});

describe("parseOxylabsJson", () => {
  it("does not rewrite long digit sequences inside JSON strings", () => {
    const raw = `{"schedule_id":${SCHEDULE_ID},"content":"track: ${SCHEDULE_ID}, end"}`;
    expect(parseOxylabsJson(raw)).toEqual({
      schedule_id: SCHEDULE_ID,
      content: `track: ${SCHEDULE_ID}, end`,
    });
  });

  it("preserves schedule and job ids that exceed MAX_SAFE_INTEGER", () => {
    const raw = `{"schedule_id":${SCHEDULE_ID},"runs":[{"run_id":105302280,"jobs":[{"id":${JOB_ID},"result_status":"done"}]}]}`;
    const parsed = parseOxylabsJson(raw);

    expect(parsed).toEqual({
      schedule_id: SCHEDULE_ID,
      runs: [
        {
          run_id: 105302280,
          jobs: [{ id: JOB_ID, result_status: "done" }],
        },
      ],
    });
  });
});

describe("oxylabsIdToString", () => {
  it("returns digit strings unchanged", () => {
    expect(oxylabsIdToString(SCHEDULE_ID)).toBe(SCHEDULE_ID);
  });

  it("stringifies safe integers", () => {
    expect(oxylabsIdToString(105302280)).toBe("105302280");
  });

  it("rejects unsafe numbers", () => {
    expect(() => oxylabsIdToString(Number(SCHEDULE_ID))).toThrow(
      /parsed unsafely/,
    );
  });
});
