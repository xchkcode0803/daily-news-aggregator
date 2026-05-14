export default function Home() {
  return (
    <main style={{ margin: "12vh auto", maxWidth: 720, padding: 24 }}>
      <p style={{ color: "#62656a", fontSize: 14, letterSpacing: 0, margin: 0 }}>
        Daily Chinese Finance News
      </p>
      <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: "12px 0" }}>每日财经简报系统</h1>
      <p style={{ color: "#62656a", fontSize: 18, lineHeight: 1.7 }}>
        Cron, ingestion, report generation, email delivery, and protected report previews are exposed through server routes and scripts.
      </p>
    </main>
  );
}
