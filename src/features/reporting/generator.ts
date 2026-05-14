import type OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ArticleCandidate } from "@/features/news";
import { financeReportSchema, type FinanceReport } from "@/features/reporting/schema";
import { buildReportPrompt, reportSystemPrompt } from "@/features/reporting/prompts";

export type ReportGenerationResult = {
  report: FinanceReport;
  tokenMetadata: Record<string, unknown> | null;
};

type ResponsesClient = Pick<OpenAI["responses"], "parse">;

export async function generateFinanceReport(params: {
  client: { responses: ResponsesClient };
  model: string;
  articles: ArticleCandidate[];
  reportDate: string;
}): Promise<ReportGenerationResult> {
  if (params.articles.length === 0) {
    throw new Error("Cannot generate report without selected articles");
  }

  const response = await params.client.responses.parse({
    model: params.model,
    instructions: reportSystemPrompt,
    input: buildReportPrompt(params.articles, params.reportDate),
    max_output_tokens: 5000,
    text: {
      format: zodTextFormat(financeReportSchema, "daily_finance_report")
    }
  });

  const report = response.output_parsed;
  if (!report) {
    throw new Error("OpenAI response did not include parsed structured output");
  }

  return {
    report,
    tokenMetadata: response.usage ? JSON.parse(JSON.stringify(response.usage)) : null
  };
}
