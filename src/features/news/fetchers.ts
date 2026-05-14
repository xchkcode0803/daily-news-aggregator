import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { logger } from "@/lib/logger";
import { parseNewsDate } from "@/features/news/normalize";
import type { FetchSourceResult, NewsItem, NewsSourceConfig } from "@/features/news/types";

const parser = new Parser();

const blockedTitleFragments = ["登录", "注册", "更多", "广告", "视频", "图片", "English"];

function cleanText(value: string | undefined | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function isLikelyNewsTitle(title: string) {
  const cleaned = cleanText(title);
  return cleaned.length >= 6 && cleaned.length <= 180 && !blockedTitleFragments.some((fragment) => cleaned.includes(fragment));
}

export async function fetchSource(source: NewsSourceConfig, fetchImpl: typeof fetch = fetch): Promise<FetchSourceResult> {
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(source.url, {
      signal: AbortSignal.timeout(source.timeoutMs),
      headers: {
        "user-agent": "daily-chinese-finance-news/0.1 public-news-aggregator"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const body = await response.text();

    const items = source.adapterType === "rss" ? await parseRss(body, source) : parseHtmlList(body, source);
    return {
      source,
      status: "ok",
      items,
      durationMs: Date.now() - startedAt,
      httpStatus: response.status
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown source fetch error";
    logger.warn("source fetch failed", { sourceKey: source.key, message });
    return {
      source,
      status: "failed",
      items: [],
      durationMs: Date.now() - startedAt,
      errorMessage: message
    };
  }
}

export async function parseRss(xml: string, source: NewsSourceConfig): Promise<NewsItem[]> {
  let feed: Awaited<ReturnType<typeof parser.parseString>>;
  try {
    feed = await parser.parseString(xml);
  } catch (error) {
    logger.warn("rss parse failed", { sourceKey: source.key, url: source.url, error });
    return [];
  }

  return feed.items
    .map((item) => ({
      title: cleanText(item.title),
      url: cleanText(item.link ?? item.guid),
      sourceKey: source.key,
      sourceName: source.name,
      region: source.region,
      publishedAt: parseNewsDate(item.isoDate ?? item.pubDate),
      excerpt: cleanText(item.contentSnippet ?? item.content ?? item.summary) || null
    }))
    .filter((item) => isLikelyNewsTitle(item.title) && Boolean(item.url));
}

export function parseHtmlList(html: string, source: NewsSourceConfig, now = new Date()): NewsItem[] {
  const $ = cheerio.load(html);
  const items: NewsItem[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const title = cleanText(anchor.attr("title") || anchor.text());
    if (!isLikelyNewsTitle(title)) {
      return;
    }

    const href = anchor.attr("href");
    if (!href || href.startsWith("javascript:") || href.startsWith("#")) {
      return;
    }

    let url: string;
    try {
      url = new URL(href, source.url).toString();
    } catch (error) {
      logger.warn("skipping malformed source URL", { sourceKey: source.key, href, baseUrl: source.url, error });
      return;
    }
    if (seen.has(url)) {
      return;
    }

    const nearbyText = cleanText(anchor.parent().text());
    const dateMatch = nearbyText.match(/(\d{4}[年./-]\d{1,2}[月./-]\d{1,2}日?(?:\s+\d{1,2}:\d{2})?|\d{1,2}[月./-]\d{1,2}日?)/);
    seen.add(url);
    items.push({
      title,
      url,
      sourceKey: source.key,
      sourceName: source.name,
      region: source.region,
      publishedAt: parseNewsDate(dateMatch?.[1], now),
      excerpt: null
    });
  });

  return items.slice(0, 40);
}
