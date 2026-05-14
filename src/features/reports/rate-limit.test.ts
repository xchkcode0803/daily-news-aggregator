import { describe, expect, it, vi } from "vitest";
import { checkDailyReportRateLimit, dailyReportRateLimitIdentifier } from "@/features/reports/rate-limit";

describe("daily report rate limit", () => {
  it("uses the Shanghai business date in the global identifier", () => {
    const identifier = dailyReportRateLimitIdentifier(new Date("2026-05-13T23:30:00.000Z"), "Asia/Shanghai");

    expect(identifier).toBe("daily-report:2026-05-14");
  });

  it("allows requests when Upstash reports success", async () => {
    const client = {
      limit: vi.fn().mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: 1778774400000
      })
    };

    const result = await checkDailyReportRateLimit({
      timeZone: "Asia/Shanghai",
      now: new Date("2026-05-14T00:00:00.000Z"),
      client
    });

    expect(result).toMatchObject({
      status: "allowed",
      identifier: "daily-report:2026-05-14",
      limit: 10,
      remaining: 9
    });
    expect(client.limit).toHaveBeenCalledWith("daily-report:2026-05-14");
  });

  it("blocks requests when Upstash reports the fixed window is exhausted", async () => {
    const client = {
      limit: vi.fn().mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: 1778774400000
      })
    };

    const result = await checkDailyReportRateLimit({
      timeZone: "Asia/Shanghai",
      now: new Date("2026-05-14T00:00:00.000Z"),
      client
    });

    expect(result).toMatchObject({
      status: "blocked",
      limit: 10,
      remaining: 0
    });
  });

  it("fails closed when Upstash cannot be checked", async () => {
    const client = {
      limit: vi.fn().mockRejectedValue(new Error("redis unavailable"))
    };

    const result = await checkDailyReportRateLimit({
      timeZone: "Asia/Shanghai",
      now: new Date("2026-05-14T00:00:00.000Z"),
      client
    });

    expect(result).toMatchObject({
      status: "unavailable",
      identifier: "daily-report:2026-05-14",
      errorMessage: "redis unavailable"
    });
  });
});
