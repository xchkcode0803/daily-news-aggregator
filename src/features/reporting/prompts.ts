import type { ArticleCandidate } from "@/features/news";

export function buildReportPrompt(articles: ArticleCandidate[], reportDate: string) {
  const sourceLines = articles.map((article, index) => ({
    id: index + 1,
    title: article.title,
    source: article.sourceName,
    region: article.region,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    url: article.canonicalUrl,
    excerpt: article.excerpt,
    relevanceScore: article.relevanceScore
  }));

  return `请基于以下公开财经新闻条目，为金融专业人士生成 ${reportDate} 的中文每日财经简报。

写作要求：
- 只使用给定条目中的事实，不补造数字或事件。
- 明确区分事实与解读，事实写在 facts，观点写在 interpretation。
- 每个被引用的条目必须保留 sourceLinks，包含标题、来源和 URL。
- 语气简洁、分析性强、对决策有用。
- 覆盖这些章节：今日最重要、北美市场与宏观、中国市场与政策、跨境影响、未来关注。
- 包含简短免责声明，说明报告仅供信息参考，不构成投资建议。

公开新闻条目 JSON：
${JSON.stringify(sourceLines, null, 2)}`;
}

export const reportSystemPrompt =
  "你是面向机构投资、宏观研究、企业财务与跨境业务团队的中文财经简报编辑。你必须输出中文，严格遵守结构化 schema，并保留每条事实的来源链接。";
