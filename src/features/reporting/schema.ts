import { z } from "zod";

export const reportSectionNames = ["今日最重要", "北美市场与宏观", "中国市场与政策", "跨境影响", "未来关注"] as const;

export const sourceLinkSchema = z
  .object({
    title: z.string().min(1),
    url: z.string().url(),
    source: z.string().min(1)
  })
  .strict();

export const reportSectionSchema = z
  .object({
    name: z.enum(reportSectionNames),
    summary: z.string().min(1),
    facts: z.array(z.string().min(1)).min(1),
    interpretation: z.string().min(1),
    sourceLinks: z.array(sourceLinkSchema).min(1)
  })
  .strict();

export const financeReportSchema = z
  .object({
    title: z.string().min(1),
    subject: z.string().min(1),
    executiveBrief: z.array(z.string().min(1)).min(2).max(6),
    sections: z.array(reportSectionSchema).min(5).max(5),
    marketImplications: z.array(z.string().min(1)).min(1),
    sourceNotes: z.array(z.string().min(1)).min(1),
    risksAndUncertainties: z.array(z.string().min(1)).min(1),
    disclaimer: z.string().min(1)
  })
  .strict()
  .refine((report) => reportSectionNames.every((name) => report.sections.some((section) => section.name === name)), {
    message: "Report must include every required section"
  });

export type FinanceReport = z.infer<typeof financeReportSchema>;
export type ReportSection = z.infer<typeof reportSectionSchema>;
