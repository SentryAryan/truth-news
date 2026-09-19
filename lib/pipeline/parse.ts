import type { CheerioAPI } from "cheerio";
import * as cheerio from "cheerio";

const MAX_CANDIDATES = 30;
const MIN_PARAGRAPH_CHARS = 30;
const MIN_BODY_CHARS_ALT = 900;

const NON_ARTICLE_PATH_RE =
  /\/(sections?|categor(y|ies)|topics?|tags?|authors?|search|shows?|programs?|podcasts?|live|games?|sports?|video|newsletter|subscribe|about|help|support|shop|product|review)(\/|$)/i;

export type ParsedArticle = {
  originalUrl: string;
  canonicalUrl: string | null;
  title: string;
  imageUrl: string;
  publishedAt: string;
  rawText: string;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

function normalizeHost(host: string): string {
  return host.replace(/^www\./i, "").toLowerCase();
}

function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function pathSegments(pathname: string): string[] {
  return stripTrailingSlash(pathname)
    .split("/")
    .filter(Boolean);
}

function matchesDomain(host: string, domain: string): boolean {
  const h = normalizeHost(host);
  const d = normalizeHost(domain);
  return h === d || h.endsWith(`.${d}`);
}

/**
 * Per-domain article URL check. Prefer reject when uncertain.
 */
export function isArticleUrl(urlString: string, domain: string): boolean {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  if (!matchesDomain(url.hostname, domain)) {
    return false;
  }

  const path = stripTrailingSlash(url.pathname);
  const segments = pathSegments(url.pathname);

  if (segments.length === 0) {
    return false;
  }

  if (NON_ARTICLE_PATH_RE.test(path)) {
    return false;
  }

  const host = normalizeHost(url.hostname);

  if (host === "reuters.com" || host.endsWith(".reuters.com")) {
    // /world/slug-idABCDEF1234/ or dated paths
    if (
      /\/[^/]+\/[^/]+-[0-9A-Za-z]{10,}(?:\/|$)/.test(path) ||
      /\/[^/]+\/[^/]+\/[^/]+-\d{4}-\d{2}-\d{2}(?:\/|$)/.test(path)
    ) {
      return segments.length >= 2;
    }
    return false;
  }

  if (host === "bbc.com" || host.endsWith(".bbc.com") || host === "bbc.co.uk") {
    if (/\/news\/articles\/[a-z0-9]+(?:\/|$)/i.test(path)) {
      return true;
    }
    if (/\/news\/[a-z0-9-]+-\d{7,}(?:\/|$)/i.test(path)) {
      return true;
    }
    return false;
  }

  if (
    host === "theguardian.com" ||
    host.endsWith(".theguardian.com")
  ) {
    if (segments.length < 4) {
      return false;
    }
    const last = segments[segments.length - 1] ?? "";
    // Dated story: /world/2025/jan/15/story-title or long slug last segment
    const hasDate =
      segments.some((s) => /^\d{4}$/.test(s)) ||
      /\d{4}/.test(path);
    return last.length >= 12 && hasDate;
  }

  if (host === "foxnews.com" || host.endsWith(".foxnews.com")) {
    if (/\/shows?\//i.test(path) || /\/sports?\//i.test(path)) {
      return false;
    }
    return /\/[^/]+\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+(?:\/|$)/i.test(path);
  }

  if (host === "npr.org" || host.endsWith(".npr.org")) {
    return /\/\d{4}\/\d{2}\/\d{2}\/\d+\//.test(path + "/");
  }

  // Generic fallback: depth ≥ 3, a digit-bearing segment, not non-article
  if (segments.length < 3) {
    return false;
  }
  const hasDigitSegment = segments.some((s) => /\d/.test(s));
  return hasDigitSegment;
}

function resolveHref(
  href: string,
  baseUrl: string,
): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    resolved.hash = "";
    return resolved.toString();
  } catch {
    return null;
  }
}

/**
 * Extract candidate article links from homepage HTML.
 * Also returns how many same-host links were rejected as non-article.
 */
export function extractCandidateLinks(
  html: string,
  sourceListingUrl: string,
  domain: string,
): { candidates: string[]; rejectedNonArticle: number } {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const out: string[] = [];
  let rejectedNonArticle = 0;

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) {
      return;
    }
    const absolute = resolveHref(href, sourceListingUrl);
    if (!absolute) {
      return;
    }
    let hostOk = false;
    try {
      hostOk = matchesDomain(new URL(absolute).hostname, domain);
    } catch {
      return;
    }
    if (!hostOk) {
      return;
    }
    if (!isArticleUrl(absolute, domain)) {
      rejectedNonArticle += 1;
      return;
    }
    if (out.length >= MAX_CANDIDATES) {
      return;
    }
    const normalized = absolute.replace(/\/$/, "");
    if (seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    out.push(normalized);
  });

  return { candidates: out, rejectedNonArticle };
}

function parsePublishedAt($: CheerioAPI): string | null {
  const meta =
    $('meta[property="article:published_time"]').attr("content") ??
    $('meta[name="article:published_time"]').attr("content") ??
    $('meta[name="pubdate"]').attr("content") ??
    $('meta[name="publish-date"]').attr("content");
  if (meta) {
    const d = new Date(meta);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  const timeAttr = $("time[datetime]").first().attr("datetime");
  if (timeAttr) {
    const d = new Date(timeAttr);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i += 1) {
    const raw = $(scripts[i]).html();
    if (!raw) {
      continue;
    }
    try {
      const data: unknown = JSON.parse(raw);
      const date = findDatePublished(data);
      if (date) {
        const d = new Date(date);
        if (!Number.isNaN(d.getTime())) {
          return d.toISOString();
        }
      }
    } catch {
      // ignore invalid JSON-LD
    }
  }

  return null;
}

function findDatePublished(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findDatePublished(item);
      if (found) {
        return found;
      }
    }
    return null;
  }
  const record = data as Record<string, unknown>;
  if (typeof record.datePublished === "string") {
    return record.datePublished;
  }
  if (record["@graph"]) {
    return findDatePublished(record["@graph"]);
  }
  return null;
}

export function splitIntoParagraphs(text: string): string[] {
  let parts = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 1) {
    const sentences = parts[0]
      .split(/(?<=\.)\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += 3) {
      chunks.push(sentences.slice(i, i + 3).join(" "));
    }
    parts = chunks;
  }

  return parts.filter((p) => p.length >= MIN_PARAGRAPH_CHARS);
}

export function cleanBodyText(html: string): string {
  const $ = cheerio.load(html);
  $(
    'script, style, nav, footer, header, aside, [class*="ad"], [class*="newsletter"], [class*="subscribe"], [class*="related"], [class*="most-viewed"], [class*="social"]',
  ).remove();

  const containers = [
    "article",
    '[role="main"]',
    ".article-body",
    ".story-body",
    ".entry-content",
    "main",
    "body",
  ];

  let scopeSelector = "body";
  for (const sel of containers) {
    if ($(sel).first().length > 0) {
      scopeSelector = sel;
      break;
    }
  }

  const paragraphs: string[] = [];
  $(scopeSelector)
    .first()
    .find("p")
    .each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length > 0) {
        paragraphs.push(text);
      }
    });

  return paragraphs.join("\n\n");
}

/**
 * Parse article detail HTML into structured fields.
 */
export function parseArticlePage(
  html: string,
  pageUrl: string,
): ParsedArticle | null {
  try {
    const $ = cheerio.load(html);
    const title =
      $("h1").first().text().replace(/\s+/g, " ").trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      "";

    const imageUrl =
      $('meta[property="og:image"]').attr("content")?.trim() ||
      $("article img").first().attr("src") ||
      $("main img").first().attr("src") ||
      "";

    let resolvedImage = imageUrl;
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      try {
        resolvedImage = new URL(imageUrl, pageUrl).toString();
      } catch {
        resolvedImage = "";
      }
    }

    const publishedAt = parsePublishedAt($);
    const canonical =
      $('link[rel="canonical"]').attr("href")?.trim() || null;
    let canonicalUrl = canonical;
    if (canonical && !/^https?:\/\//i.test(canonical)) {
      try {
        canonicalUrl = new URL(canonical, pageUrl).toString();
      } catch {
        canonicalUrl = null;
      }
    }

    const rawText = cleanBodyText(html);

    if (!title) {
      return null;
    }

    return {
      originalUrl: pageUrl,
      canonicalUrl,
      title,
      imageUrl: resolvedImage,
      publishedAt: publishedAt ?? "",
      rawText,
    };
  } catch {
    return null;
  }
}

const GENERIC_TITLE_RE =
  /^(home|news|world|politics|sports?|live|video|shows?|podcasts?|sections?|latest|breaking news)$/i;

/**
 * AGENTS §13 article content gate.
 */
export function validateParsedArticle(
  parsed: ParsedArticle,
  pageUrl: string,
): ValidationResult {
  if (!parsed.publishedAt) {
    return { valid: false, reason: "missing_published_at" };
  }
  if (!parsed.imageUrl) {
    return { valid: false, reason: "missing_image_url" };
  }
  if (!parsed.title || GENERIC_TITLE_RE.test(parsed.title.trim())) {
    return { valid: false, reason: "generic_title" };
  }

  let articleCheckUrl = pageUrl;
  try {
    const host = new URL(pageUrl).hostname;
    if (parsed.canonicalUrl) {
      articleCheckUrl = parsed.canonicalUrl;
      if (!isArticleUrl(parsed.canonicalUrl, host)) {
        return { valid: false, reason: "canonical_not_article" };
      }
    } else if (!isArticleUrl(pageUrl, host)) {
      return { valid: false, reason: "url_not_article" };
    }
  } catch {
    return { valid: false, reason: "invalid_url" };
  }

  void articleCheckUrl;

  const paragraphs = splitIntoParagraphs(parsed.rawText);
  const charCount = parsed.rawText.replace(/\s+/g, " ").trim().length;

  const bodyOk =
    paragraphs.length >= 3 ||
    (charCount >= MIN_BODY_CHARS_ALT &&
      Boolean(parsed.title) &&
      Boolean(parsed.imageUrl) &&
      Boolean(parsed.publishedAt));

  if (!bodyOk) {
    return { valid: false, reason: "body_quality" };
  }

  return { valid: true };
}

/**
 * Hostname suitable for `isArticleUrl` / extract from a listing URL.
 */
export function domainFromListingUrl(listingUrl: string): string {
  try {
    return normalizeHost(new URL(listingUrl).hostname);
  } catch {
    return listingUrl;
  }
}
