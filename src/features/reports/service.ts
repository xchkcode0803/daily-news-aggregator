import { createOpenAIClient } from "@/lib/openai";
import { createResendClient } from "@/lib/resend";
import { logger } from "@/lib/logger";
import {
  dedupeArticles,
  defaultNewsSources,
  fetchSource,
  isInsideLookback,
  scoreArticle,
  selectBalancedArticles,
  toArticleCandidate,
  type ArticleCandidate,
  type FetchSourceResult,
  type NewsSourceConfig
} from "@/features/news";
import { sendReportEmail, type EmailClient } from "@/features/email";
import { generateFinanceReport, renderReportEmail } from "@/features/reporting";
import { DrizzleReportStore, type ReportStore } from "@/features/reports/store";

export type DailyReportResult = {
  runId: string;
  status: string;
  fetchedCount: number;
  selectedCount: number;
  emailStatus: "sent" | "failed" | "skipped";
};

type OpenAIClient = Parameters<typeof generateFinanceReport>[0]["client"];

export type DailyReportOptions = {
  store?: ReportStore;
  openAIClient?: OpenAIClient;
  emailClient?: EmailClient;
  sources?: NewsSourceConfig[];
  fetchImpl?: typeof fetch;
  now?: Date;
  dryRun?: boolean;
  model: string;
  timezone: string;
  lookbackHours: number;
  emailFrom: string;
  emailTo: string[];
};

export async function runDailyReport(options: DailyReportOptions): Promise<DailyReportResult> {
  const now = options.now ?? new Date();
  const store = options.store ?? new DrizzleReportStore();
  const sources = (options.sources ?? defaultNewsSources).filter((source) => source.enabled);
  const reportDate = getBusinessDate(now, options.timezone);
  const run = await store.getOrCreateRun(reportDate, `daily-report:${reportDate}`);

  const sentDelivery = await store.getSentDelivery(run.id);
  if (run.status === "sent" && sentDelivery) {
    return {
      runId: run.id,
      status: "sent",
      fetchedCount: run.fetchedCount,
      selectedCount: run.selectedCount,
      emailStatus: "skipped"
    };
  }

  try {
    await store.ensureSources(sources);
    const fetchResults = await Promise.all(sources.map((source) => fetchSource(source, options.fetchImpl)));
    await store.saveFetchLogs(run.id, fetchResults);

    const candidates = buildCandidates(fetchResults, sources, options.lookbackHours, now);
    const selected = selectBalancedArticles(dedupeArticles(candidates), 24);

    if (selected.length === 0) {
      await store.markRun({
        runId: run.id,
        status: "failed",
        fetchedCount: fetchedCount(fetchResults),
        selectedCount: 0,
        errorSummary: "No relevant public finance articles found"
      });
      return {
        runId: run.id,
        status: "failed",
        fetchedCount: fetchedCount(fetchResults),
        selectedCount: 0,
        emailStatus: "skipped"
      };
    }

    const storedArticles = await store.upsertArticles(selected);
    await store.saveReportItems(run.id, storedArticles);

    const openAIClient = options.openAIClient ?? createOpenAIClient();
    const { report, tokenMetadata } = await generateFinanceReport({
      client: openAIClient,
      model: options.model,
      articles: selected,
      reportDate
    });
    const rendered = await renderReportEmail(report);

    await store.saveReport({
      runId: run.id,
      report,
      html: rendered.html,
      plaintext: rendered.plaintext,
      subject: rendered.subject,
      modelName: options.model,
      tokenMetadata
    });

    if (options.dryRun) {
      await store.saveEmailDelivery({
        runId: run.id,
        recipients: options.emailTo,
        status: "skipped"
      });
      await store.markRun({
        runId: run.id,
        status: "dry_run",
        fetchedCount: fetchedCount(fetchResults),
        selectedCount: selected.length,
        errorSummary: sourceFailureSummary(fetchResults)
      });
      return {
        runId: run.id,
        status: "dry_run",
        fetchedCount: fetchedCount(fetchResults),
        selectedCount: selected.length,
        emailStatus: "skipped"
      };
    }

    const emailResult = await sendReportEmail({
      client: options.emailClient ?? createResendClient(),
      from: options.emailFrom,
      to: options.emailTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.plaintext
    });

    await store.saveEmailDelivery({
      runId: run.id,
      providerMessageId: emailResult.providerMessageId,
      recipients: options.emailTo,
      status: emailResult.status,
      errorMessage: emailResult.errorMessage
    });

    const finalStatus = emailResult.status === "sent" && !sourceFailureSummary(fetchResults) ? "sent" : "partial";
    await store.markRun({
      runId: run.id,
      status: finalStatus,
      fetchedCount: fetchedCount(fetchResults),
      selectedCount: selected.length,
      errorSummary: emailResult.errorMessage ?? sourceFailureSummary(fetchResults)
    });

    return {
      runId: run.id,
      status: finalStatus,
      fetchedCount: fetchedCount(fetchResults),
      selectedCount: selected.length,
      emailStatus: emailResult.status === "sent" ? "sent" : "failed"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown daily report failure";
    logger.error("daily report failed", { runId: run.id, message });
    await store.markRun({
      runId: run.id,
      status: "failed",
      errorSummary: message
    });
    return {
      runId: run.id,
      status: "failed",
      fetchedCount: 0,
      selectedCount: 0,
      emailStatus: "failed"
    };
  }
}

export function buildCandidates(
  fetchResults: FetchSourceResult[],
  sources: NewsSourceConfig[],
  lookbackHours: number,
  now = new Date()
): ArticleCandidate[] {
  const sourceByKey = new Map(sources.map((source) => [source.key, source]));
  return fetchResults.flatMap((result) => {
    const source = sourceByKey.get(result.source.key);
    if (!source) {
      return [];
    }

    return result.items
      .map((item) => toArticleCandidate(item, source))
      .filter((article): article is ArticleCandidate => Boolean(article))
      .filter((article) => isInsideLookback(article.publishedAt, lookbackHours, now))
      .map((article) => ({
        ...article,
        relevanceScore: scoreArticle(article, source.priority, now)
      }));
  });
}

export function getBusinessDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function fetchedCount(results: FetchSourceResult[]) {
  return results.reduce((total, result) => total + result.items.length, 0);
}

function sourceFailureSummary(results: FetchSourceResult[]) {
  const failures = results.filter((result) => result.status === "failed");
  if (failures.length === 0) {
    return null;
  }
  return failures.map((failure) => `${failure.source.key}: ${failure.errorMessage ?? "failed"}`).join("; ");
}
