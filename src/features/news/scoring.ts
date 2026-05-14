import type { ArticleCandidate, NewsRegion } from "@/features/news/types";

const financeKeywords = [
  "央行",
  "利率",
  "通胀",
  "cpi",
  "ppi",
  "就业",
  "美联储",
  "证券",
  "债券",
  "股票",
  "外汇",
  "人民币",
  "美元",
  "财政",
  "货币",
  "监管",
  "上市",
  "并购",
  "房地产",
  "出口",
  "进口",
  "tariff",
  "inflation",
  "fed",
  "sec",
  "market",
  "bank",
  "employment",
  "treasury"
];

export function scoreArticle(article: ArticleCandidate, sourcePriority: number, now = new Date()) {
  const text = `${article.title} ${article.excerpt ?? ""}`.toLowerCase();
  const keywordScore = financeKeywords.reduce((score, keyword) => score + (text.includes(keyword.toLowerCase()) ? 4 : 0), 0);
  const hoursOld = article.publishedAt ? Math.max(0, (now.getTime() - article.publishedAt.getTime()) / 36e5) : 18;
  const freshnessScore = Math.max(0, 24 - Math.round(hoursOld));
  const officialBoost = sourcePriority >= 8 ? 8 : 0;
  return Math.min(100, sourcePriority * 5 + keywordScore + freshnessScore + officialBoost);
}

export function assignSection(article: ArticleCandidate): string {
  const text = `${article.title} ${article.excerpt ?? ""}`.toLowerCase();
  if (text.includes("fed") || text.includes("federal reserve") || text.includes("sec") || text.includes("bls")) {
    return "北美市场与宏观";
  }
  if (text.includes("出口") || text.includes("进口") || text.includes("美元") || text.includes("人民币") || text.includes("tariff")) {
    return "跨境影响";
  }
  if (article.region === "china") {
    return "中国市场与政策";
  }
  return "北美市场与宏观";
}

export function selectBalancedArticles(articles: ArticleCandidate[], maxItems = 24) {
  const sorted = [...articles].sort((a, b) => b.relevanceScore - a.relevanceScore);
  const selected: ArticleCandidate[] = [];
  const regionCounts: Record<NewsRegion, number> = {
    china: 0,
    "north-america": 0,
    "cross-border": 0
  };

  for (const article of sorted) {
    const regionLimit = article.region === "china" || article.region === "north-america" ? Math.ceil(maxItems * 0.6) : maxItems;
    if (regionCounts[article.region] >= regionLimit) {
      continue;
    }
    selected.push(article);
    regionCounts[article.region] += 1;
    if (selected.length >= maxItems) {
      break;
    }
  }

  return selected;
}
