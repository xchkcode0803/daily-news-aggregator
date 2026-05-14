import { describe, expect, it } from "vitest";
import {
  canonicalizeUrl,
  dedupeArticles,
  isInsideLookback,
  parseHtmlList,
  parseNewsDate,
  parseRss,
  scoreArticle,
  toArticleCandidate
} from "@/features/news";
import type { NewsSourceConfig } from "@/features/news";

const source: NewsSourceConfig = {
  key: "test",
  name: "Test Source",
  adapterType: "html",
  url: "https://example.com/news/",
  region: "china",
  enabled: true,
  priority: 8,
  timeoutMs: 1000
};

describe("news normalization and parsing", () => {
  it("canonicalizes URLs by dropping fragments, tracking params, and duplicate slashes", () => {
    expect(canonicalizeUrl("/a//b/?utm_source=x&id=1#top", "https://example.com/root/")).toBe("https://example.com/a/b?id=1");
  });

  it("parses Chinese and ISO dates", () => {
    expect(parseNewsDate("2026年05月14日 07:30")?.getFullYear()).toBe(2026);
    expect(parseNewsDate("2026-05-14T01:00:00Z")?.toISOString()).toBe("2026-05-14T01:00:00.000Z");
  });

  it("extracts public HTML list links and dates", () => {
    const html = '<ul><li><span>2026-05-14</span><a href="/item?id=1">央行发布最新货币政策执行报告</a></li></ul>';
    const items = parseHtmlList(html, source);

    expect(items).toHaveLength(1);
    expect(items[0]?.title).toContain("央行");
    expect(items[0]?.url).toBe("https://example.com/item?id=1");
  });

  it("parses RSS items", async () => {
    const rss = `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title><item><title>Federal Reserve holds interest rates</title><link>https://fed.example/item</link><pubDate>Thu, 14 May 2026 00:00:00 GMT</pubDate><description>Market policy update</description></item></channel></rss>`;
    const items = await parseRss(rss, { ...source, adapterType: "rss", region: "north-america" });

    expect(items[0]?.sourceName).toBe("Test Source");
    expect(items[0]?.publishedAt?.toISOString()).toBe("2026-05-14T00:00:00.000Z");
  });

  it("dedupes by canonical URL and normalized title hash", () => {
    const base = toArticleCandidate(
      {
        title: "央行发布最新货币政策执行报告",
        url: "https://example.com/a?utm_source=x",
        sourceKey: source.key,
        sourceName: source.name,
        region: source.region,
        publishedAt: new Date(),
        excerpt: null
      },
      source
    );
    const duplicate = toArticleCandidate(
      {
        title: "央行发布最新货币政策执行报告",
        url: "https://example.com/b",
        sourceKey: source.key,
        sourceName: source.name,
        region: source.region,
        publishedAt: new Date(),
        excerpt: null
      },
      source
    );

    expect(base).not.toBeNull();
    expect(duplicate).not.toBeNull();
    if (!base || !duplicate) {
      throw new Error("Expected article candidates in dedupe test");
    }
    expect(dedupeArticles([base, duplicate])).toHaveLength(1);
  });

  it("filters lookback windows and scores finance relevance", () => {
    const now = new Date("2026-05-14T08:00:00Z");
    expect(isInsideLookback(new Date("2026-05-13T08:01:00Z"), 24, now)).toBe(true);
    expect(isInsideLookback(new Date("2026-05-12T08:00:00Z"), 24, now)).toBe(false);

    const article = toArticleCandidate(
      {
        title: "美联储通胀和就业数据影响债券市场",
        url: "https://example.com/fed",
        sourceKey: source.key,
        sourceName: source.name,
        region: "north-america",
        publishedAt: now,
        excerpt: "Federal Reserve inflation market update"
      },
      source
    );
    expect(article).not.toBeNull();
    if (!article) {
      throw new Error("Expected article candidate in scoring test");
    }
    expect(scoreArticle(article, 9, now)).toBeGreaterThan(60);
  });
});
