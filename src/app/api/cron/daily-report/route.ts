import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { runDailyReport } from "@/features/reports";

export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getEnv();
  const result = await runDailyReport({
    model: env.OPENAI_MODEL,
    timezone: env.REPORT_TIMEZONE,
    lookbackHours: env.NEWS_LOOKBACK_HOURS,
    emailFrom: env.REPORT_FROM,
    emailTo: splitRecipients(env.REPORT_TO)
  });

  return NextResponse.json(result);
}

function splitRecipients(value: string) {
  return value
    .split(",")
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}
