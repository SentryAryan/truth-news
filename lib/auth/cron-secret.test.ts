import { describe, expect, it } from "vitest";

import { isCronRequestAuthorized } from "@/lib/auth/cron-secret";

describe("isCronRequestAuthorized", () => {
  it("allows any request in development", () => {
    expect(
      isCronRequestAuthorized({
        authorizationHeader: null,
        cronSecret: undefined,
        nodeEnv: "development",
      }),
    ).toBe(true);
  });

  it("rejects a missing or wrong bearer token in production", () => {
    expect(
      isCronRequestAuthorized({
        authorizationHeader: null,
        cronSecret: "cron-secret",
        nodeEnv: "production",
      }),
    ).toBe(false);

    expect(
      isCronRequestAuthorized({
        authorizationHeader: "Bearer wrong",
        cronSecret: "cron-secret",
        nodeEnv: "production",
      }),
    ).toBe(false);
  });

  it("accepts the matching bearer token in production", () => {
    expect(
      isCronRequestAuthorized({
        authorizationHeader: "Bearer cron-secret",
        cronSecret: "cron-secret",
        nodeEnv: "production",
      }),
    ).toBe(true);
  });

  it("rejects production when CRON_SECRET is unset", () => {
    expect(
      isCronRequestAuthorized({
        authorizationHeader: "Bearer cron-secret",
        cronSecret: undefined,
        nodeEnv: "production",
      }),
    ).toBe(false);
  });
});
