import { describe, expect, it } from "vitest";
import { financeReportSchema, reportSectionNames } from "@/features/reporting";

const validReport = {
  title: "每日财经简报 - 2026-05-14",
  subject: "每日财经简报 - 2026-05-14",
  executiveBrief: ["要点一", "要点二"],
  sections: reportSectionNames.map((name) => ({
    name,
    summary: `${name}摘要`,
    facts: [`${name}事实`],
    interpretation: `${name}解读`,
    sourceLinks: [{ title: `${name}来源`, url: "https://example.com/source", source: "Source" }]
  })),
  marketImplications: ["市场含义"],
  sourceNotes: ["仅使用公开来源"],
  risksAndUncertainties: ["存在数据修订风险"],
  disclaimer: "本报告仅供信息参考，不构成投资建议。"
};

describe("finance report schema", () => {
  it("accepts the required Chinese report contract", () => {
    expect(financeReportSchema.parse(validReport).sections).toHaveLength(5);
  });

  it("rejects reports missing required sections", () => {
    const invalid = { ...validReport, sections: validReport.sections.slice(0, 4) };
    expect(() => financeReportSchema.parse(invalid)).toThrow();
  });
});
