# Daily Chinese Finance News

A daily Chinese finance news aggregator for finance professionals.

The app fetches public North American and China finance news, deduplicates and ranks the articles, generates a structured Chinese report with the OpenAI Responses API, stores run history in Neon Postgres, and sends the report by email with Resend.

> This project is for informational reporting workflows only. Generated reports are not investment advice.

## What It Does

Every day at **07:30 Asia/Shanghai**, the app:

1. Runs a Vercel Cron job.
2. Fetches allowlisted public finance news sources.
3. Parses RSS feeds and public HTML list pages.
4. Normalizes URLs, dates, source names, excerpts, and article hashes.
5. Filters to the configured lookback window.
6. Deduplicates articles by canonical URL and normalized title.
7. Scores articles by freshness, source priority, and finance relevance.
8. Selects a balanced set across China, North America, and cross-border themes.
9. Generates a Chinese structured report with GPT-5.5 through the OpenAI Responses API.
10. Renders HTML and plaintext email.
11. Sends the report through Resend.
12. Stores articles, report runs, selected report items, rendered reports, source logs, and email delivery state in Neon Postgres.

## Tech Stack

- **Framework:** Next.js App Router
- **Language:** TypeScript
- **Hosting:** Vercel
- **Cron:** Vercel Cron
- **Database:** Neon Postgres
- **ORM:** Drizzle
- **LLM:** OpenAI Responses API with Structured Outputs
- **Default model:** `gpt-5.5`
- **Email:** Resend
- **Email rendering:** React Email
- **Tests:** Vitest

## Repository Layout

```text
src/
  app/
    api/cron/daily-report/   # Vercel cron endpoint
    reports/[runId]/         # Protected report preview
  features/
    news/                    # Sources, parsing, normalization, scoring, selection
    reporting/               # OpenAI schema, prompt, report rendering
    email/                   # Resend delivery service
    reports/                 # Daily pipeline orchestration and persistence
  lib/
    db/                      # Drizzle schema and Neon client
    env.ts                   # Environment validation
    openai.ts                # OpenAI client
    resend.ts                # Resend client
scripts/
  report-dry-run.ts          # Dry-run command
drizzle/
  *.sql                      # Database migrations
```

## Requirements

- Node.js 20+
- npm
- A Neon Postgres database
- An Upstash Redis database
- An OpenAI API key
- A Resend API key and verified sender/domain
- A Vercel project for cron deployment

## Quick Start

Install dependencies:

```bash
npm install
```

Create a local env file:

```bash
cp .env.example .env.local
```

Fill in the required values in `.env.local`.

Run the development server:

```bash
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

## Environment Variables

```text
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
DATABASE_URL=
RESEND_API_KEY=
REPORT_FROM=
REPORT_TO=
CRON_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
REPORT_TIMEZONE=Asia/Shanghai
NEWS_LOOKBACK_HOURS=36
REPORT_VIEW_TOKEN=
```

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | API key used by the OpenAI Responses API. |
| `OPENAI_MODEL` | Model used for report generation. Defaults to `gpt-5.5`. |
| `DATABASE_URL` | Neon Postgres connection string. |
| `RESEND_API_KEY` | API key used to send email through Resend. |
| `REPORT_FROM` | Sender address, for example `Finance Desk <reports@example.com>`. |
| `REPORT_TO` | Comma-separated recipient list. |
| `CRON_SECRET` | Bearer token required by the cron endpoint. |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL used by the cron rate limiter. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token used by the cron rate limiter. |
| `REPORT_TIMEZONE` | Business-date timezone. Defaults to `Asia/Shanghai`. |
| `NEWS_LOOKBACK_HOURS` | Article lookback window. Defaults to `36`. |
| `REPORT_VIEW_TOKEN` | Token required to view stored report previews. |

Never commit real `.env` files or API keys. `.gitignore` excludes `.env`, `.env*.local`, `.next`, `node_modules`, build output, and coverage output.

## Database Setup

Generate a migration after changing the Drizzle schema:

```bash
npm run db:generate
```

Apply migrations to Neon:

```bash
DATABASE_URL="postgres://..." npm run db:migrate
```

The initial migration creates:

- `news_sources`
- `articles`
- `report_runs`
- `report_items`
- `reports`
- `email_deliveries`
- `source_fetch_logs`

## Running A Dry Run

Dry run executes the full pipeline except email delivery:

```bash
npm run report:dry-run
```

It still fetches sources, generates the report, renders HTML/plaintext, and writes database rows. Email delivery is stored as `skipped`.

Use this before enabling the daily cron in production.

## Daily Cron

`vercel.json` configures the cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-report",
      "schedule": "30 23 * * *"
    }
  ]
}
```

`30 23 * * *` is 23:30 UTC, which is **07:30 Asia/Shanghai**.

The cron route is:

```text
GET /api/cron/daily-report
```

It requires:

```http
Authorization: Bearer <CRON_SECRET>
```

After authorization, the route also checks an Upstash Redis rate limit using the official `@upstash/ratelimit` SDK. The cron endpoint has a hard global cap of **10 authorized requests per Asia/Shanghai calendar date**. The identifier includes the Shanghai date, so the operational window resets when the app computes a new `YYYY-MM-DD` in `Asia/Shanghai`; weekends and public holidays are not treated specially.

The 10-request buffer exists even though the cron is scheduled once per day so operators can manually retry failed runs, test production wiring, and still stop misconfiguration or runaway loops. If the cap is exceeded, the route returns `429`. If Upstash cannot be reached or is not configured, the route intentionally fails closed with `503` and does not run report generation.

The route returns:

```json
{
  "runId": "...",
  "status": "sent",
  "fetchedCount": 42,
  "selectedCount": 18,
  "emailStatus": "sent"
}
```

## Report Preview

Stored reports can be previewed at:

```text
/reports/<runId>?token=<REPORT_VIEW_TOKEN>
```

The preview is read-only and returns a 404 unless the token matches.

## Source Selection

Sources are defined in `src/features/news/sources.ts`.

The current source set includes:

- National Bureau of Statistics
- Federal Reserve RSS
- SEC RSS
- BLS RSS
- Economic Observer RSS
- PBOC public pages
- CSRC public pages
- Shanghai Stock Exchange public pages
- Securities Times public pages
- Shanghai Securities News public pages
- Yicai public pages

Source rules:

- Public sources only.
- No login-gated pages.
- No paywall bypass.
- Per-source timeout.
- Partial source failures are logged and do not necessarily fail the whole run.

## Article Filtering And Selection

The pipeline sends only selected article metadata to the model.

Selection steps:

1. Drop disabled sources.
2. Drop items without title or URL.
3. Canonicalize URLs and remove common tracking params.
4. Normalize titles and create title hashes.
5. Filter to `NEWS_LOOKBACK_HOURS`.
6. Score by source priority, freshness, finance keywords, and official-source boost.
7. Deduplicate by canonical URL and normalized title hash.
8. Sort by score.
9. Select up to 24 articles with regional balancing.

The model receives title, source, region, publish time, URL, excerpt, and relevance score. It does not receive full article bodies.

## Report Contract

The model must return structured JSON validated by Zod.

Required sections:

- `今日最重要`
- `北美市场与宏观`
- `中国市场与政策`
- `跨境影响`
- `未来关注`

The report must:

- Be written in Chinese.
- Be useful for finance professionals.
- Separate facts from interpretation.
- Include source links for cited items.
- Include an informational-use disclaimer.

## Production Deployment

1. Create a Neon database.
2. Create an Upstash Redis database.
3. Add all environment variables to Vercel, including the Upstash REST URL/token.
4. Run database migrations against Neon.
5. Deploy the app to Vercel.
6. Run one dry run manually.
7. Confirm the report row and email delivery row are written.
8. Confirm `/reports/<runId>?token=...` works.
9. Enable or verify Vercel Cron.

## Development Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run report:dry-run
```

## Commit Readiness

Before opening a pull request:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Also verify:

- No `.env` files are staged.
- `node_modules` and `.next` are not staged.
- Drizzle migrations are included when schema changes.
- Public source changes respect the source rules above.

## Security Notes

- `CRON_SECRET` protects the cron endpoint.
- Upstash rate limiting caps authorized cron requests at 10 per Shanghai calendar date.
- `REPORT_VIEW_TOKEN` protects report previews.
- API keys must live only in environment variables.
- Email recipients are configured through `REPORT_TO`.
- This app stores article metadata and rendered reports; review retention needs before production use.

## License

No license has been selected yet. Add a `LICENSE` file before accepting outside contributions.
