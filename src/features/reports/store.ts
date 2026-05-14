import { and, desc, eq, sql } from "drizzle-orm";
import { articles, emailDeliveries, newsSources, reportItems, reportRuns, reports, sourceFetchLogs } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import type { ArticleCandidate, FetchSourceResult, NewsSourceConfig } from "@/features/news";
import type { FinanceReport } from "@/features/reporting";

export type ReportRunRecord = {
  id: string;
  reportDate: string;
  status: string;
  fetchedCount: number;
  selectedCount: number;
};

export type StoredArticleRecord = ArticleCandidate & {
  id: string;
};

export type StoredReportPreview = {
  run: {
    id: string;
    reportDate: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    fetchedCount: number;
    selectedCount: number;
    errorSummary: string | null;
  };
  report: {
    subject: string;
    html: string;
    plaintext: string;
    structuredJson: FinanceReport;
    modelName: string;
    createdAt: Date;
  };
};

export type ReportStore = {
  ensureSources(sources: NewsSourceConfig[]): Promise<void>;
  getOrCreateRun(reportDate: string, idempotencyKey: string): Promise<ReportRunRecord>;
  markRun(params: {
    runId: string;
    status: string;
    fetchedCount?: number;
    selectedCount?: number;
    errorSummary?: string | null;
  }): Promise<void>;
  saveFetchLogs(runId: string, results: FetchSourceResult[]): Promise<void>;
  upsertArticles(articles: ArticleCandidate[]): Promise<StoredArticleRecord[]>;
  saveReportItems(runId: string, articles: StoredArticleRecord[]): Promise<void>;
  saveReport(params: {
    runId: string;
    report: FinanceReport;
    html: string;
    plaintext: string;
    subject: string;
    modelName: string;
    tokenMetadata: Record<string, unknown> | null;
  }): Promise<void>;
  saveEmailDelivery(params: {
    runId: string;
    providerMessageId?: string;
    recipients: string[];
    status: string;
    errorMessage?: string;
  }): Promise<void>;
  getSentDelivery(runId: string): Promise<{ providerMessageId: string | null } | null>;
  getReportPreview(runId: string): Promise<StoredReportPreview | null>;
};

export class DrizzleReportStore implements ReportStore {
  private readonly db = getDb();

  async ensureSources(sources: NewsSourceConfig[]) {
    if (sources.length === 0) {
      return;
    }
    await this.db
      .insert(newsSources)
      .values(
        sources.map((source) => ({
          key: source.key,
          name: source.name,
          adapterType: source.adapterType,
          url: source.url,
          region: source.region,
          enabled: source.enabled,
          priority: source.priority,
          timeoutMs: source.timeoutMs,
          updatedAt: new Date()
        }))
      )
      .onConflictDoUpdate({
        target: newsSources.key,
        set: {
          name: sql`excluded.name`,
          adapterType: sql`excluded.adapter_type`,
          url: sql`excluded.url`,
          region: sql`excluded.region`,
          enabled: sql`excluded.enabled`,
          priority: sql`excluded.priority`,
          timeoutMs: sql`excluded.timeout_ms`,
          updatedAt: new Date()
        }
      });
  }

  async getOrCreateRun(reportDate: string, idempotencyKey: string) {
    const inserted = await this.db
      .insert(reportRuns)
      .values({ reportDate, idempotencyKey, status: "running" })
      .onConflictDoNothing()
      .returning({
        id: reportRuns.id,
        reportDate: reportRuns.reportDate,
        status: reportRuns.status,
        fetchedCount: reportRuns.fetchedCount,
        selectedCount: reportRuns.selectedCount
      });

    if (inserted[0]) {
      return inserted[0];
    }

    const [existing] = await this.db
      .select({
        id: reportRuns.id,
        reportDate: reportRuns.reportDate,
        status: reportRuns.status,
        fetchedCount: reportRuns.fetchedCount,
        selectedCount: reportRuns.selectedCount
      })
      .from(reportRuns)
      .where(eq(reportRuns.reportDate, reportDate))
      .limit(1);

    if (!existing) {
      throw new Error("Failed to create or load report run");
    }
    return existing;
  }

  async markRun(params: {
    runId: string;
    status: string;
    fetchedCount?: number;
    selectedCount?: number;
    errorSummary?: string | null;
  }) {
    await this.db
      .update(reportRuns)
      .set({
        status: params.status,
        fetchedCount: params.fetchedCount,
        selectedCount: params.selectedCount,
        errorSummary: params.errorSummary,
        completedAt: ["sent", "partial", "failed", "dry_run"].includes(params.status) ? new Date() : undefined
      })
      .where(eq(reportRuns.id, params.runId));
  }

  async saveFetchLogs(runId: string, results: FetchSourceResult[]) {
    if (results.length === 0) {
      return;
    }
    await this.db.insert(sourceFetchLogs).values(
      results.map((result) => ({
        sourceKey: result.source.key,
        reportRunId: runId,
        status: result.status,
        itemCount: result.items.length,
        durationMs: result.durationMs,
        httpStatus: result.httpStatus,
        errorMessage: result.errorMessage
      }))
    );
  }

  async upsertArticles(input: ArticleCandidate[]) {
    if (input.length === 0) {
      return [];
    }

    const rows = await this.db
      .insert(articles)
      .values(
        input.map((article) => ({
          canonicalUrl: article.canonicalUrl,
          title: article.title,
          sourceKey: article.sourceKey,
          sourceName: article.sourceName,
          region: article.region,
          publishedAt: article.publishedAt,
          excerpt: article.excerpt,
          contentHash: article.contentHash,
          normalizedTitleHash: article.normalizedTitleHash,
          relevanceScore: article.relevanceScore,
          updatedAt: new Date()
        }))
      )
      .onConflictDoUpdate({
        target: articles.canonicalUrl,
        set: {
          title: sql`excluded.title`,
          sourceKey: sql`excluded.source_key`,
          sourceName: sql`excluded.source_name`,
          region: sql`excluded.region`,
          publishedAt: sql`excluded.published_at`,
          excerpt: sql`excluded.excerpt`,
          contentHash: sql`excluded.content_hash`,
          normalizedTitleHash: sql`excluded.normalized_title_hash`,
          relevanceScore: sql`excluded.relevance_score`,
          updatedAt: new Date()
        }
      })
      .returning({
        id: articles.id,
        canonicalUrl: articles.canonicalUrl,
        title: articles.title,
        sourceKey: articles.sourceKey,
        sourceName: articles.sourceName,
        region: articles.region,
        publishedAt: articles.publishedAt,
        excerpt: articles.excerpt,
        contentHash: articles.contentHash,
        normalizedTitleHash: articles.normalizedTitleHash,
        relevanceScore: articles.relevanceScore
      });

    return rows.map((row) => ({
      ...row,
      url: row.canonicalUrl,
      region: row.region as StoredArticleRecord["region"]
    }));
  }

  async saveReportItems(runId: string, input: StoredArticleRecord[]) {
    if (input.length === 0) {
      return;
    }
    await this.db
      .insert(reportItems)
      .values(
        input.map((article, index) => ({
          reportRunId: runId,
          articleId: article.id,
          section: inferStoredSection(article),
          rank: index + 1
        }))
      )
      .onConflictDoNothing();
  }

  async saveReport(params: {
    runId: string;
    report: FinanceReport;
    html: string;
    plaintext: string;
    subject: string;
    modelName: string;
    tokenMetadata: Record<string, unknown> | null;
  }) {
    await this.db
      .insert(reports)
      .values({
        reportRunId: params.runId,
        structuredJson: params.report,
        html: params.html,
        plaintext: params.plaintext,
        subject: params.subject,
        modelName: params.modelName,
        tokenMetadata: params.tokenMetadata
      })
      .onConflictDoUpdate({
        target: reports.reportRunId,
        set: {
          structuredJson: params.report,
          html: params.html,
          plaintext: params.plaintext,
          subject: params.subject,
          modelName: params.modelName,
          tokenMetadata: params.tokenMetadata
        }
      });
  }

  async saveEmailDelivery(params: {
    runId: string;
    providerMessageId?: string;
    recipients: string[];
    status: string;
    errorMessage?: string;
  }) {
    await this.db
      .insert(emailDeliveries)
      .values({
        reportRunId: params.runId,
        provider: "resend",
        providerMessageId: params.providerMessageId,
        recipients: params.recipients.join(","),
        status: params.status,
        errorMessage: params.errorMessage
      })
      .onConflictDoUpdate({
        target: emailDeliveries.reportRunId,
        set: {
          providerMessageId: params.providerMessageId,
          recipients: params.recipients.join(","),
          status: params.status,
          errorMessage: params.errorMessage
        }
      });
  }

  async getSentDelivery(runId: string) {
    const [delivery] = await this.db
      .select({ providerMessageId: emailDeliveries.providerMessageId })
      .from(emailDeliveries)
      .where(and(eq(emailDeliveries.reportRunId, runId), eq(emailDeliveries.status, "sent")))
      .orderBy(desc(emailDeliveries.createdAt))
      .limit(1);
    return delivery ?? null;
  }

  async getReportPreview(runId: string) {
    const [row] = await this.db
      .select({
        run: reportRuns,
        report: reports
      })
      .from(reportRuns)
      .innerJoin(reports, eq(reports.reportRunId, reportRuns.id))
      .where(eq(reportRuns.id, runId))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      run: row.run,
      report: {
        ...row.report,
        structuredJson: row.report.structuredJson as FinanceReport
      }
    };
  }
}

function inferStoredSection(article: StoredArticleRecord) {
  const text = `${article.title} ${article.excerpt ?? ""}`.toLowerCase();
  if (article.relevanceScore >= 75) {
    return "今日最重要";
  }
  if (text.includes("关注") || text.includes("预期") || text.includes("outlook")) {
    return "未来关注";
  }
  if (text.includes("出口") || text.includes("进口") || text.includes("美元") || text.includes("人民币")) {
    return "跨境影响";
  }
  return article.region === "china" ? "中国市场与政策" : "北美市场与宏观";
}
