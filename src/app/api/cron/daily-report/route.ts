import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { runDailyReport } from "@/features/reports";
import { isValidBearerToken } from "@/features/reports/auth";
import { checkDailyReportRateLimit } from "@/features/reports/rate-limit";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!isValidBearerToken(authorization, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const env = getEnv();
    const rateLimit = await checkDailyReportRateLimit({
      timeZone: env.REPORT_TIMEZONE
    });

    if (rateLimit.status === "blocked") {
      return NextResponse.json(
        {
          error: "Daily cron request limit exceeded",
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset
        },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit)
        }
      );
    }

    if (rateLimit.status === "unavailable") {
      // Intentional fail-closed policy: the cron route may trigger expensive LLM/email work,
      // so missing Upstash enforcement blocks the run instead of allowing an unbounded retry loop.
      return NextResponse.json({ error: "Rate limiter unavailable" }, { status: 503 });
    }

    const result = await runDailyReport({
      model: env.OPENAI_MODEL,
      timezone: env.REPORT_TIMEZONE,
      lookbackHours: env.NEWS_LOOKBACK_HOURS,
      emailFrom: env.REPORT_FROM,
      emailTo: splitRecipients(env.REPORT_TO)
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("daily report route failed", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function splitRecipients(value: string | undefined) {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

function rateLimitHeaders(rateLimit: {
  limit: number;
  remaining: number;
  reset: number;
}) {
  return {
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(rateLimit.reset)
  };
}
