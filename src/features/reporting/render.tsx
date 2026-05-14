import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text
} from "@react-email/components";
import { render } from "@react-email/render";
import React from "react";
import type { FinanceReport } from "@/features/reporting/schema";

type ReportEmailProps = {
  report: FinanceReport;
};

const colors = {
  ink: "#1d1d1f",
  muted: "#62666d",
  line: "#ded8cf",
  accent: "#a63232",
  paper: "#f7f4ee",
  surface: "#ffffff"
};

export function ReportEmail({ report }: ReportEmailProps) {
  return (
    <Html lang="zh-CN">
      <Head />
      <Preview>{report.subject}</Preview>
      <Body style={{ margin: 0, backgroundColor: colors.paper, color: colors.ink }}>
        <Container style={{ maxWidth: 720, margin: "0 auto", padding: "28px 18px", fontFamily: "PingFang SC, Microsoft YaHei, Segoe UI, sans-serif" }}>
          <Section style={{ backgroundColor: colors.surface, border: `1px solid ${colors.line}`, padding: 28 }}>
            <Text style={{ margin: "0 0 8px", color: colors.accent, fontSize: 13, fontWeight: 700 }}>每日财经简报</Text>
            <Heading as="h1" style={{ margin: 0, fontSize: 28, lineHeight: 1.25 }}>
              {report.title}
            </Heading>
            <Hr style={{ borderColor: colors.line, margin: "22px 0" }} />
            {report.executiveBrief.map((item) => (
              <Text key={item} style={{ fontSize: 15, lineHeight: 1.7, margin: "8px 0" }}>
                {item}
              </Text>
            ))}
          </Section>

          {report.sections.map((section) => (
            <Section key={section.name} style={{ backgroundColor: colors.surface, border: `1px solid ${colors.line}`, borderTop: 0, padding: 28 }}>
              <Heading as="h2" style={{ margin: "0 0 12px", fontSize: 20 }}>
                {section.name}
              </Heading>
              <Text style={{ margin: "0 0 14px", color: colors.muted, fontSize: 14, lineHeight: 1.7 }}>{section.summary}</Text>
              {section.facts.map((fact) => (
                <Text key={fact} style={{ margin: "8px 0", fontSize: 14, lineHeight: 1.65 }}>
                  • {fact}
                </Text>
              ))}
              <Text style={{ margin: "14px 0", fontSize: 14, lineHeight: 1.7 }}>
                <strong>解读：</strong>
                {section.interpretation}
              </Text>
              <Text style={{ margin: "14px 0 6px", color: colors.muted, fontSize: 13 }}>来源</Text>
              {section.sourceLinks.map((source) => (
                <Text key={source.url} style={{ margin: "4px 0", fontSize: 13, lineHeight: 1.5 }}>
                  <Link href={source.url} style={{ color: colors.accent }}>
                    {source.source} - {source.title}
                  </Link>
                </Text>
              ))}
            </Section>
          ))}

          <Section style={{ backgroundColor: colors.surface, border: `1px solid ${colors.line}`, borderTop: 0, padding: 28 }}>
            <Heading as="h2" style={{ margin: "0 0 12px", fontSize: 20 }}>
              市场含义
            </Heading>
            {report.marketImplications.map((item) => (
              <Text key={item} style={{ margin: "8px 0", fontSize: 14, lineHeight: 1.65 }}>
                • {item}
              </Text>
            ))}
            <Heading as="h2" style={{ margin: "22px 0 12px", fontSize: 20 }}>
              风险与不确定性
            </Heading>
            {report.risksAndUncertainties.map((item) => (
              <Text key={item} style={{ margin: "8px 0", fontSize: 14, lineHeight: 1.65 }}>
                • {item}
              </Text>
            ))}
            <Hr style={{ borderColor: colors.line, margin: "22px 0" }} />
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 1.6 }}>{report.disclaimer}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderReportEmail(report: FinanceReport) {
  const html = await render(<ReportEmail report={report} />);
  const plaintext = renderPlaintextReport(report);
  return { html, plaintext, subject: report.subject };
}

export function renderPlaintextReport(report: FinanceReport) {
  const lines = [report.title, "", ...report.executiveBrief, ""];
  for (const section of report.sections) {
    lines.push(section.name, section.summary, "事实:");
    lines.push(...section.facts.map((fact) => `- ${fact}`));
    lines.push(`解读: ${section.interpretation}`);
    lines.push("来源:");
    lines.push(...section.sourceLinks.map((source) => `- ${source.source} ${source.title}: ${source.url}`), "");
  }
  lines.push("市场含义:", ...report.marketImplications.map((item) => `- ${item}`), "");
  lines.push("风险与不确定性:", ...report.risksAndUncertainties.map((item) => `- ${item}`), "");
  lines.push(report.disclaimer);
  return lines.join("\n");
}
