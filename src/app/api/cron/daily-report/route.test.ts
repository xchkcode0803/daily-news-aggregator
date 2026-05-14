import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runDailyReportMock = vi.fn();

vi.mock("@/features/reports", () => ({
  runDailyReport: runDailyReportMock
}));

const originalEnv = process.env;

describe("daily report cron route", () => {
  beforeEach(() => {
    vi.resetModules();
    runDailyReportMock.mockReset();
    process.env = {
      ...originalEnv,
      CRON_SECRET: "secret",
      OPENAI_API_KEY: "openai",
      OPENAI_MODEL: "gpt-5.5",
      DATABASE_URL: "https://example.com/db",
      RESEND_API_KEY: "resend",
      REPORT_FROM: "Finance <report@example.com>",
      REPORT_TO: "desk@example.com",
      REPORT_TIMEZONE: "Asia/Shanghai",
      NEWS_LOOKBACK_HOURS: "36",
      REPORT_VIEW_TOKEN: "view"
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns unauthorized when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/api/cron/daily-report"));

    expect(response.status).toBe(401);
    expect(runDailyReportMock).not.toHaveBeenCalled();
  });

  it("returns unauthorized when the bearer token is invalid", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://example.com/api/cron/daily-report", {
        headers: { authorization: "Bearer wrong" }
      })
    );

    expect(response.status).toBe(401);
    expect(runDailyReportMock).not.toHaveBeenCalled();
  });

  it("starts the report run for a valid cron request", async () => {
    runDailyReportMock.mockResolvedValue({
      runId: "run-1",
      status: "sent",
      fetchedCount: 4,
      selectedCount: 3,
      emailStatus: "sent"
    });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://example.com/api/cron/daily-report", {
        headers: { authorization: "Bearer secret" }
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ runId: "run-1", status: "sent" });
    expect(runDailyReportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.5",
        timezone: "Asia/Shanghai",
        lookbackHours: 36,
        emailTo: ["desk@example.com"]
      })
    );
  });
});
