import { createHash } from "node:crypto";
import type { ArticleCandidate, NewsItem, NewsSourceConfig } from "@/features/news/types";

const trackingParams = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "spm",
  "from",
  "source"
]);

export function canonicalizeUrl(url: string, baseUrl?: string) {
  let parsed: URL;
  try {
    parsed = new URL(url, baseUrl);
  } catch {
    return null;
  }

  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()]) {
    if (trackingParams.has(key.toLowerCase())) {
      parsed.searchParams.delete(key);
    }
  }
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.toString();
}

export function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[【】\[\]（）()《》"'“”‘’.,，。:：;；!！?？|-]/g, "")
    .trim();
}

export function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function parseNewsDate(value: string | undefined | null, now = new Date()): Date | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const hasExplicitTimeZone = /(?:z|gmt|utc|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  if (hasExplicitTimeZone) {
    const direct = new Date(trimmed);
    return Number.isNaN(direct.getTime()) ? null : direct;
  }

  const chineseMatch = trimmed.match(/(?:(\d{4})[年./-])?(\d{1,2})[月./-](\d{1,2})日?(?:\s+(\d{1,2}):(\d{2}))?/);
  if (chineseMatch) {
    const year = Number(chineseMatch[1] ?? now.getUTCFullYear());
    const month = Number(chineseMatch[2]) - 1;
    const day = Number(chineseMatch[3]);
    const hour = Number(chineseMatch[4] ?? 0);
    const minute = Number(chineseMatch[5] ?? 0);
    return new Date(Date.UTC(year, month, day, hour, minute));
  }

  const isoLikeDate = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed);
  const direct = new Date(isoLikeDate ? `${trimmed.replace(" ", "T")}Z` : trimmed);
  return Number.isNaN(direct.getTime()) ? null : direct;
}

export function toArticleCandidate(item: NewsItem, source: NewsSourceConfig): ArticleCandidate | null {
  if (!item.title.trim() || !item.url.trim()) {
    return null;
  }

  const canonicalUrl = canonicalizeUrl(item.url, source.url);
  if (!canonicalUrl) {
    return null;
  }
  const normalizedTitle = normalizeTitle(item.title);
  if (!normalizedTitle) {
    return null;
  }

  const contentHash = hashText(`${item.title}\n${item.excerpt ?? ""}\n${canonicalUrl}`);
  return {
    ...item,
    url: canonicalUrl,
    canonicalUrl,
    contentHash,
    normalizedTitleHash: hashText(normalizedTitle),
    relevanceScore: 0
  };
}

export function isInsideLookback(publishedAt: Date | null, lookbackHours: number, now = new Date()) {
  if (!publishedAt) {
    return false;
  }
  const minTime = now.getTime() - lookbackHours * 60 * 60 * 1000;
  return publishedAt.getTime() >= minTime && publishedAt.getTime() <= now.getTime() + 60 * 60 * 1000;
}
