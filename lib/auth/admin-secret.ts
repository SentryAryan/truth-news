import { timingSafeEqual } from "node:crypto";
import "server-only";

/**
 * Validates the shared admin secret from the `x-biasly-admin-secret` header.
 * Never put the secret in the URL query string.
 */
export function isValidAdminSecret(headerValue: string | null): boolean {
  const expected = process.env.BIASLY_ADMIN_SECRET;
  if (!expected || expected.length === 0) {
    return false;
  }
  if (!headerValue || headerValue.length === 0) {
    return false;
  }
  const a = Buffer.from(headerValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
