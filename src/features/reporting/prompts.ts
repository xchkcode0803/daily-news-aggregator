import type { ArticleCandidate } from "@/features/news";

export function buildReportPrompt(articles: ArticleCandidate[], reportDate: string) {
  if (articles.length === 0) {
    throw new Error("Cannot build report prompt without articles");
  }

  const sourceLines = articles.map((article, index) => ({
    id: index + 1,
    title: sanitizePromptText(article.title, 220),
    source: sanitizePromptText(article.sourceName, 80),
    region: sanitizePromptText(article.region, 40),
    publishedAt: article.publishedAt?.toISOString() ?? null,
    url: sanitizePromptText(article.canonicalUrl, 500),
    excerpt: article.excerpt ? sanitizePromptText(article.excerpt, 700) : null,
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

function sanitizePromptText(value: unknown, maxLength: number) {
  const cleaned = (typeof value === "string" ? value : "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ignore previous|disregard instructions|system prompt|developer message/gi, "[removed]");

  return Array.from(cleaned).slice(0, maxLength).join("").trim();
}
