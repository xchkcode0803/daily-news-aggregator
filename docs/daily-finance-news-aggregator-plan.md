# Daily Chinese Finance News Aggregator Plan

## Goal Command

```text
/goal Build the daily Chinese finance news aggregator from docs/daily-finance-news-aggregator-plan.md: scaffold a TypeScript Next.js App Router app hosted on Vercel, run a daily 07:30 Asia/Shanghai cron, pull public North American and China finance news, store run/article history in Neon Postgres, generate a Chinese finance-professional report with GPT-5.5 Responses API structured outputs, send it via Resend email, add a protected report preview, dry-run command, and tests.
```

## Summary

- Build a greenfield TypeScript Next.js App Router app using `npm`, since the workspace is empty and local tooling has Node 20/npm available.
- Run one daily Vercel Cron at `30 23 * * *` UTC, which maps to `07:30 Asia/Shanghai`.
- Secure the cron route with `CRON_SECRET` using the `Authorization: Bearer <secret>` header.
- Use public-only sources: RSS where available plus allowlisted public/official list pages.
- Store article and run history in Neon Postgres.
- Generate a Chinese finance-professional report with GPT-5.5 through the OpenAI Responses API.
- Use Structured Outputs so the model returns validated report JSON before rendering the email.
- Deliver the report through Resend.

## Key Architecture

### App Scaffold

- Use Next.js App Router with TypeScript.
- Keep route files thin and put business behavior in feature modules.
- Use this shape:

```text
src/
  app/
    api/
      cron/
        daily-report/
          route.ts
    reports/
      [runId]/
        page.tsx
  features/
    news/
    reporting/
    email/
    reports/
  lib/
    db/
    env.ts
    logger.ts
    openai.ts
    resend.ts
```

### Environment Variables

```text
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
DATABASE_URL=
RESEND_API_KEY=
REPORT_FROM=
REPORT_TO=
CRON_SECRET=
REPORT_TIMEZONE=Asia/Shanghai
NEWS_LOOKBACK_HOURS=36
REPORT_VIEW_TOKEN=
```

### Public Interfaces

- `GET /api/cron/daily-report`
  - Cron-only route.
  - Requires `Authorization: Bearer ${CRON_SECRET}`.
  - Returns `{ runId, status, fetchedCount, selectedCount, emailStatus }`.
- `GET /reports/[runId]?token=...`
  - Protected read-only HTML preview for stored reports.
- `npm run report:dry-run`
  - Fetch, dedupe, and generate the report without sending email.

## Source Strategy

### Enabled RSS Sources

- China National Bureau of Statistics latest releases and data interpretation RSS.
- Federal Reserve RSS feeds.
- SEC RSS feeds.
- BLS RSS feeds.
- Economic Observer finance RSS.

### Enabled HTML/List-Page Adapters

- PBOC public pages.
- CSRC public pages.
- Shanghai Stock Exchange public pages.
- Securities Times public pages.
- Shanghai Securities News public pages.
- Yicai public pages.

### Source Rules

- No RSSHub in v1.
- No paywall bypass.
- No scraping behind login walls.
- Store title, URL, source, timestamp, excerpt/description, and hashes.
- Do not republish full articles.
- Each source must have timeout, health logging, and graceful partial failure handling.

## Data Model

Use Neon Postgres with Drizzle.

Tables:

- `news_sources`
  - Source metadata, adapter type, URL, region, enabled flag, and fetch settings.
- `articles`
  - Canonical URL, title, source, region, published timestamp, excerpt, content hash, normalized title hash, relevance score, and timestamps.
- `report_runs`
  - Shanghai business date, status, started/completed timestamps, counts, error summary, and idempotency key.
- `report_items`
  - Join table between report runs and selected articles, including section assignment and rank.
- `reports`
  - Rendered structured JSON, HTML, plaintext, subject, model name, token/cost metadata when available, and timestamps.
- `email_deliveries`
  - Report run ID, provider, provider message ID, recipient list, status, error message, and timestamps.
- `source_fetch_logs`
  - Source ID, run ID, status, item count, duration, HTTP status, and error message.

Unique constraints:

- `articles.canonical_url`
- `report_runs.report_date`
- `email_deliveries.report_run_id`

## Pipeline Behavior

1. Verify the cron secret.
2. Create or reuse the idempotent `report_runs` row for the Shanghai business date.
3. Fetch all enabled sources concurrently with per-source timeout.
4. Parse RSS feeds and HTML list pages through source-specific adapters.
5. Normalize URLs and dates.
6. Dedupe articles by canonical URL and normalized title hash.
7. Filter to the last `NEWS_LOOKBACK_HOURS`, defaulting to 36 hours.
8. Score finance relevance using source priority, freshness, region balance, keywords, and duplicate prominence.
9. Select a balanced article set across China, North America, and cross-border themes.
10. Call GPT-5.5 through the Responses API with a structured output schema.
11. Validate model output against the report schema.
12. Render React Email HTML and plaintext.
13. Send email through Resend.
14. Store the rendered report and email delivery metadata.
15. Mark the run as `sent`, `partial`, or `failed`.

## Report Output Contract

The GPT-5.5 structured response should produce Chinese JSON with:

- `title`
- `subject`
- `executiveBrief`
- `sections`
  - `今日最重要`
  - `北美市场与宏观`
  - `中国市场与政策`
  - `跨境影响`
  - `未来关注`
- `marketImplications`
- `sourceNotes`
- `risksAndUncertainties`

Report requirements:

- Write in Chinese.
- Optimize for a finance professional, not a general reader.
- Separate facts from interpretation.
- Include source links for every cited item.
- Keep the tone concise, analytical, and decision-useful.
- Include a short disclaimer that the report is informational, not investment advice.

## Vercel Behavior

- Add `vercel.json` cron:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/daily-report",
      "schedule": "30 23 * * *"
    }
  ]
}
```

- Export `maxDuration = 60` from the cron route to stay Hobby-plan safe.
- Keep the endpoint idempotent because cron delivery can be manually retried and should not resend duplicates.
- Store failed runs because Vercel does not retry failed cron invocations automatically.

## Email Delivery

- Use Resend with React Email templates.
- Render both HTML and plaintext.
- Use a concise Chinese subject, for example:

```text
每日财经简报 - YYYY-MM-DD
```

- Include source links in the email.
- Store the Resend message ID in `email_deliveries`.
- In dry-run mode, write the report to the database but do not send email.

## Testing Plan

### Unit Tests

- RSS parsing.
- HTML-list extraction fixtures.
- URL canonicalization.
- Date parsing.
- Dedupe by URL/title hash.
- Lookback filtering.
- Relevance scoring.
- Report schema validation.

### Service Tests

- Successful full run.
- Existing sent run does not resend.
- Partial source failure still generates a report if enough articles exist.
- Empty-source result fails gracefully.
- OpenAI schema validation failure marks the run failed.
- Resend failure stores report but marks delivery failed.

### Route Tests

- Missing `CRON_SECRET` returns unauthorized.
- Invalid `CRON_SECRET` returns unauthorized.
- Valid cron request starts or reuses a run.
- Report preview requires a valid token.

### Validation Commands

```text
npm run typecheck
npm run lint
npm test
npm run report:dry-run
```

## Implementation Defaults

- Package manager: `npm`.
- Framework: Next.js App Router.
- Language: TypeScript.
- Database: Neon Postgres.
- ORM/query layer: Drizzle.
- Email: Resend.
- Email rendering: React Email.
- Model: `gpt-5.5`.
- OpenAI API: Responses API.
- Output format: Structured Outputs with a Zod schema.
- Report language: Chinese.
- Schedule: `07:30 Asia/Shanghai`.
- Cron schedule expression: `30 23 * * *`.
- Lookback window: 36 hours.
- First version source policy: public RSS plus allowlisted public official/list pages.

## Assumptions

- The report is informational and is not investment advice.
- Media-source terms still need review before commercial production use.
- Commercial production should avoid storing or redistributing full article text unless a source explicitly permits it.
- If a public source blocks server-side fetching, mark it unhealthy and continue with other sources.
- If fewer than the minimum article count is available, send a short degraded report only if at least one high-confidence source item exists; otherwise mark the run failed and do not email.
