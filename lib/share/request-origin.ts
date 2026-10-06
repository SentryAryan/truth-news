import { headers } from "next/headers";

function firstHeaderValue(value: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}

/** Public origin of the current request, for absolute share and Open Graph URLs. */
export async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host =
    firstHeaderValue(headerList.get("x-forwarded-host")) ||
    firstHeaderValue(headerList.get("host"));
  if (!host) {
    return "";
  }
  const proto = firstHeaderValue(headerList.get("x-forwarded-proto")) || "https";
  return `${proto}://${host}`;
}
