import { runDailyReport } from "../src/features/reports/index";
import { getEnv } from "../src/lib/env";

const env = getEnv();

const result = await runDailyReport({
  model: env.OPENAI_MODEL,
  timezone: env.REPORT_TIMEZONE,
  lookbackHours: env.NEWS_LOOKBACK_HOURS,
  emailFrom: env.REPORT_FROM,
  emailTo: env.REPORT_TO.split(",").map((recipient) => recipient.trim()).filter(Boolean),
  dryRun: true
});

console.log(JSON.stringify(result, null, 2));
