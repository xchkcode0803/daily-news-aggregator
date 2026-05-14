import { describe, expect, it, vi } from "vitest";
import { runDailyReport, type ReportStore, type StoredArticleRecord, type ReportRunRecord } from "@/features/reports";
import { reportSectionNames, type FinanceReport } from "@/features/reporting";
import type { ArticleCandidate, NewsSourceConfig } from "@/features/news";

const now = new Date("2026-05-14T00:00:00Z");

const sources: NewsSourceConfig[] = [
  {
    key: "good",
    name: "Good Feed",
    adapterType: "rss",
    url: "https://example.com/good.xml",
    region: "china",
    enabled: true,
    priority: 9,
    timeoutMs: 1000
  },
  {
    key: "second",
    name: "Second Feed",
    adapterType: "rss",
    url: "https://example.com/second.xml",
    region: "north-america",
    enabled: true,
    priority: 9,
    timeoutMs: 1000
  }
];

const validReport: FinanceReport = {
  title: "每日财经简报 - 2026-05-14",
  subject: "每日财经简报 - 2026-05-14",
  executiveBrief: ["中国政策信号值得关注。", "北美宏观数据影响利率预期。"],
  sections: reportSectionNames.map((name) => ({
    name,
    summary: `${name}摘要`,
    facts: [`${name}事实`],
    interpretation: `${name}解读`,
    sourceLinks: [{ title: `${name}来源`, url: "https://example.com/source", source: "Source" }]
  })),
  marketImplications: ["利率与汇率敏感资产需要关注。"],
  sourceNotes: ["仅基于公开来源。"],
  risksAndUncertainties: ["宏观数据可能修订。"],
  disclaimer: "本报告仅供信息参考，不构成投资建议。"
};

class MemoryStore implements ReportStore {
  run: ReportRunRecord = {
    id: "run-1",
    reportDate: "2026-05-14",
    status: "running",
    fetchedCount: 0,
    selectedCount: 0
  };
  sentDelivery: { providerMessageId: string | null } | null = null;
  marks: string[] = [];
  reports = 0;
  deliveryStatus: string | undefined;

  async ensureSources() {}
  async getOrCreateRun() {
    return this.run;
  }
  async markRun(params: { status: string; fetchedCount?: number; selectedCount?: number }) {
    this.run = {
      ...this.run,
      status: params.status,
      fetchedCount: params.fetchedCount ?? this.run.fetchedCount,
      selectedCount: params.selectedCount ?? this.run.selectedCount
    };
    this.marks.push(params.status);
  }
  async saveFetchLogs() {}
  async upsertArticles(articles: ArticleCandidate[]) {
    return articles.map((article, index) => ({ ...article, id: `article-${index}` })) as StoredArticleRecord[];
  }
  async saveReportItems() {}
  async saveReport() {
    this.reports += 1;
  }
  async saveEmailDelivery(params: { status: string }) {
    this.deliveryStatus = params.status;
  }
  async getSentDelivery() {
    return this.sentDelivery;
  }
  async getReportPreview() {
    return null;
  }
}

function rssResponse(title = "央行发布货币政策与债券市场监管更新") {
  return new Response(
    `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title><item><title>${title}</title><link>https://example.com/${encodeURIComponent(title)}</link><pubDate>Thu, 14 May 2026 00:00:00 GMT</pubDate><description>通胀 利率 market bank</description></item></channel></rss>`,
    { status: 200 }
  );
}

function makeOptions(overrides = {}) {
  const openAIClient = {
    responses: {
      parse: vi.fn().mockResolvedValue({ output_parsed: validReport, usage: { input_tokens: 10, output_tokens: 20 } })
    }
  };
  const emailClient = {
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: "email-1" } })
    }
  };
  const fetchImpl = vi.fn().mockResolvedValue(rssResponse());
  return {
    store: new MemoryStore(),
    openAIClient,
    emailClient,
    sources: [sources[0]],
    fetchImpl,
    now,
    model: "gpt-5.5",
    timezone: "Asia/Shanghai",
    lookbackHours: 36,
    emailFrom: "Finance <report@example.com>",
    emailTo: ["desk@example.com"],
    ...overrides
  };
}

describe("daily report pipeline", () => {
  it("runs the full pipeline and sends email", async () => {
    const options = makeOptions();
    const result = await runDailyReport(options);

    expect(result.status).toBe("sent");
    expect(result.emailStatus).toBe("sent");
    expect(options.store.reports).toBe(1);
    expect(options.emailClient.emails.send).toHaveBeenCalledOnce();
  });

  it("does not resend an existing sent run", async () => {
    const options = makeOptions();
    options.store.run.status = "sent";
    options.store.sentDelivery = { providerMessageId: "email-old" };

    const result = await runDailyReport(options);

    expect(result.emailStatus).toBe("skipped");
    expect(options.openAIClient.responses.parse).not.toHaveBeenCalled();
    expect(options.emailClient.emails.send).not.toHaveBeenCalled();
  });

  it("dry-run writes the report but skips email delivery", async () => {
    const options = makeOptions({ dryRun: true });

    const result = await runDailyReport(options);

    expect(result.status).toBe("dry_run");
    expect(result.emailStatus).toBe("skipped");
    expect(options.store.reports).toBe(1);
    expect(options.store.deliveryStatus).toBe("skipped");
    expect(options.emailClient.emails.send).not.toHaveBeenCalled();
  });

  it("generates a partial report when one public source fails", async () => {
    const options = makeOptions({
      sources,
      fetchImpl: vi.fn(async (url: string | URL | Request) => {
        if (String(url).includes("second")) {
          throw new Error("timeout");
        }
        return rssResponse("央行发布人民币与利率市场更新");
      })
    });

    const result = await runDailyReport(options);

    expect(result.status).toBe("partial");
    expect(result.selectedCount).toBe(1);
    expect(result.emailStatus).toBe("sent");
  });

  it("fails gracefully when no source returns usable articles", async () => {
    const options = makeOptions({
      fetchImpl: vi.fn().mockResolvedValue(new Response('<?xml version="1.0"?><rss version="2.0"><channel><title>Empty</title></channel></rss>'))
    });

    const result = await runDailyReport(options);

    expect(result.status).toBe("failed");
    expect(options.store.marks).toContain("failed");
    expect(options.emailClient.emails.send).not.toHaveBeenCalled();
  });

  it("marks the run failed when structured output validation fails", async () => {
    const options = makeOptions();
    options.openAIClient.responses.parse.mockRejectedValue(new Error("schema validation failed"));

    const result = await runDailyReport(options);

    expect(result.status).toBe("failed");
    expect(options.store.marks).toContain("failed");
  });

  it("stores the report but marks delivery failed when Resend fails", async () => {
    const options = makeOptions();
    options.emailClient.emails.send.mockResolvedValue({ error: { message: "provider down" } });

    const result = await runDailyReport(options);

    expect(options.store.reports).toBe(1);
    expect(options.store.deliveryStatus).toBe("failed");
    expect(result.status).toBe("partial");
    expect(result.emailStatus).toBe("failed");
  });
});
