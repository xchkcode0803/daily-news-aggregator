import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";
import { getBusinessDate } from "@/features/reports/service";

const DAILY_REPORT_LIMIT = 10;
const DAILY_REPORT_WINDOW = "1 d";
const DAILY_REPORT_PREFIX = "daily-finance-news:ratelimit";

type RateLimitClient = {
  limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
};

export type DailyReportRateLimitResult =
  | {
      status: "allowed" | "blocked";
      identifier: string;
      limit: number;
      remaining: number;
      reset: number;
    }
  | {
      status: "unavailable";
      identifier: string;
      errorMessage: string;
    };

let dailyReportRateLimit: RateLimitClient | undefined;

export async function checkDailyReportRateLimit(params: {
  timeZone: string;
  now?: Date;
  client?: RateLimitClient;
}): Promise<DailyReportRateLimitResult> {
  const identifier = dailyReportRateLimitIdentifier(params.now ?? new Date(), params.timeZone);

  try {
    const client = params.client ?? getDailyReportRateLimit();
    const result = await client.limit(identifier);
    return {
      status: result.success ? "allowed" : "blocked",
      identifier,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown rate limit error";
    logger.error("daily report rate limiter unavailable", { identifier, error });
    return {
      status: "unavailable",
      identifier,
      errorMessage
    };
  }
}

export function dailyReportRateLimitIdentifier(date: Date, timeZone: string) {
  // Intentional global key: the daily cron is a single system job, not a per-user endpoint.
  return `daily-report:${getBusinessDate(date, timeZone)}`;
}

function getDailyReportRateLimit() {
  dailyReportRateLimit ??= new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.fixedWindow(DAILY_REPORT_LIMIT, DAILY_REPORT_WINDOW),
    prefix: DAILY_REPORT_PREFIX
  });
  return dailyReportRateLimit;
}
