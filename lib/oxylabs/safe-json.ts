/**
 * Quote JSON integers that exceed Number.MAX_SAFE_INTEGER so JSON.parse
 * keeps Oxylabs schedule and job ids exact. 16+ digit integers are always
 * outside the safe range. Digits inside JSON strings (article HTML) are left
 * alone, and already-quoted ids are left alone.
 */
export function quoteUnsafeIntegers(raw: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index] ?? "";

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === ":" || char === "[" || char === ",") {
      const match = raw
        .slice(index + 1)
        .match(/^(\s*)(\d{16,})(?=\s*[,}\]])/);
      const whitespace = match?.[1];
      const digits = match?.[2];
      if (whitespace !== undefined && digits) {
        result += `${char}${whitespace}"${digits}"`;
        index += whitespace.length + digits.length;
        continue;
      }
    }

    result += char;
  }

  return result;
}

export function parseOxylabsJson(raw: string): unknown {
  return JSON.parse(quoteUnsafeIntegers(raw)) as unknown;
}

/** Read an Oxylabs id that is either a digit string or a safe integer. */
export function oxylabsIdToString(value: unknown): string {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return value;
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  throw new Error("Oxylabs id is missing or was parsed unsafely");
}
