import { describe, expect, it } from "vitest";
import { isValidReportViewToken } from "@/features/reports/auth";

describe("report preview auth", () => {
  it("requires the configured preview token", () => {
    expect(isValidReportViewToken("good", "good")).toBe(true);
    expect(isValidReportViewToken("bad", "good")).toBe(false);
    expect(isValidReportViewToken(undefined, "good")).toBe(false);
    expect(isValidReportViewToken("good", undefined)).toBe(false);
  });
});
