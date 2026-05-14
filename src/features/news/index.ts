export { dedupeArticles } from "@/features/news/dedupe";
export { fetchSource, parseHtmlList, parseRss } from "@/features/news/fetchers";
export { canonicalizeUrl, isInsideLookback, normalizeTitle, parseNewsDate, toArticleCandidate } from "@/features/news/normalize";
export { scoreArticle, selectBalancedArticles, assignSection } from "@/features/news/scoring";
export { defaultNewsSources } from "@/features/news/sources";
export type { ArticleCandidate, FetchSourceResult, NewsItem, NewsRegion, NewsSourceConfig } from "@/features/news/types";
