import { notFound } from "next/navigation";
import { DrizzleReportStore } from "@/features/reports";
import { isValidReportViewToken } from "@/features/reports/auth";
import "./report-preview.css";

type ReportPreviewPageProps = {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function ReportPreviewPage({ params, searchParams }: ReportPreviewPageProps) {
  const [{ runId }, query] = await Promise.all([params, searchParams]);

  if (!isValidReportViewToken(query.token)) {
    notFound();
  }

  const preview = await new DrizzleReportStore().getReportPreview(runId);
  if (!preview) {
    notFound();
  }

  return (
    <main className="preview-shell">
      <header className="preview-header">
        <div>
          <p>Report Preview</p>
          <h1>{preview.report.subject}</h1>
        </div>
        <dl>
          <div>
            <dt>Run</dt>
            <dd>{preview.run.id}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{preview.run.reportDate}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{preview.run.status}</dd>
          </div>
        </dl>
      </header>
      <section className="preview-frame" dangerouslySetInnerHTML={{ __html: preview.report.html }} />
    </main>
  );
}
