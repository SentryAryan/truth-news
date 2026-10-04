import { timingSafeEqual } from "node:crypto";

export function isCronRequestAuthorized(input: {
  authorizationHeader: string | null;
  cronSecret: string | undefined;
  nodeEnv: string | undefined;
}): boolean {
  if (input.nodeEnv === "development") {
    return true;
  }

  const expected = input.cronSecret;
  if (!expected || expected.length === 0) {
    return false;
  }

  const header = input.authorizationHeader;
  const prefix = "Bearer ";
  if (!header || !header.startsWith(prefix)) {
    return false;
  }

  const token = header.slice(prefix.length);
  const provided = Buffer.from(token);
  const secret = Buffer.from(expected);
  if (provided.length !== secret.length) {
    return false;
  }

  return timingSafeEqual(provided, secret);
}
