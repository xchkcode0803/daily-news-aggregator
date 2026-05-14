import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { runDailyReport } from "@/features/reports";
import { isValidBearerToken } from "@/features/reports/auth";
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
