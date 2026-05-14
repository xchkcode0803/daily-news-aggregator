export type NewsRegion = "china" | "north-america" | "cross-border";
export type NewsAdapterType = "rss" | "html";

export type NewsSourceConfig = {
  key: string;
  name: string;
  adapterType: NewsAdapterType;
  url: string;
  region: NewsRegion;
  enabled: boolean;
  priority: number;
  timeoutMs: number;
};

export type NewsItem = {
  title: string;
  url: string;
  sourceKey: string;
  sourceName: string;
  region: NewsRegion;
  publishedAt: Date | null;
  excerpt: string | null;
};

export type ArticleCandidate = NewsItem & {
  canonicalUrl: string;
  contentHash: string;
  normalizedTitleHash: string;
  relevanceScore: number;
};

export type FetchSourceResult = {
  source: NewsSourceConfig;
  status: "ok" | "failed";
  items: NewsItem[];
  durationMs: number;
  httpStatus?: number;
  errorMessage?: string;
};
