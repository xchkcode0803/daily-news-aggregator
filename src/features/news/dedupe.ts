import type { ArticleCandidate } from "@/features/news/types";

export function dedupeArticles(items: ArticleCandidate[]) {
  const byUrl = new Map<string, ArticleCandidate>();
  const titleSeen = new Set<string>();

  for (const item of items) {
    const existing = byUrl.get(item.canonicalUrl);
    if (existing && existing.relevanceScore >= item.relevanceScore) {
      continue;
    }
    byUrl.set(item.canonicalUrl, item);
  }

  return [...byUrl.values()].filter((item) => {
    if (titleSeen.has(item.normalizedTitleHash)) {
      return false;
    }
    titleSeen.add(item.normalizedTitleHash);
    return true;
  });
}
