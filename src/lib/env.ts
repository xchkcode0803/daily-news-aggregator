import { z } from "zod";

export const appEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-5.5"),
  DATABASE_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  REPORT_FROM: z.string().min(1),
  REPORT_TO: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  REPORT_TIMEZONE: z.string().default("Asia/Shanghai"),
  NEWS_LOOKBACK_HOURS: z.coerce.number().int().positive().default(36),
  REPORT_VIEW_TOKEN: z.string().min(1)
});

export type AppEnv = z.infer<typeof appEnvSchema>;

export function getEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return appEnvSchema.parse(env);
}

export function getOptionalEnv(env: NodeJS.ProcessEnv = process.env): Partial<AppEnv> {
  return appEnvSchema.partial().parse(env);
}
