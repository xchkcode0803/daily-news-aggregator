import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const newsSources = pgTable("news_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  adapterType: text("adapter_type").notNull(),
  url: text("url").notNull(),
  region: text("region").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  priority: integer("priority").notNull().default(1),
  timeoutMs: integer("timeout_ms").notNull().default(10000),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title").notNull(),
    sourceKey: text("source_key").notNull(),
    sourceName: text("source_name").notNull(),
    region: text("region").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    excerpt: text("excerpt"),
    contentHash: text("content_hash").notNull(),
    normalizedTitleHash: text("normalized_title_hash").notNull(),
    relevanceScore: integer("relevance_score").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    canonicalUrlIdx: uniqueIndex("articles_canonical_url_idx").on(table.canonicalUrl)
  })
);

export const reportRuns = pgTable(
  "report_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportDate: date("report_date").notNull(),
    status: text("status").notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    fetchedCount: integer("fetched_count").notNull().default(0),
    selectedCount: integer("selected_count").notNull().default(0),
    errorSummary: text("error_summary"),
    idempotencyKey: text("idempotency_key").notNull()
  },
  (table) => ({
    reportDateIdx: uniqueIndex("report_runs_report_date_idx").on(table.reportDate)
  })
);

export const reportItems = pgTable(
  "report_items",
  {
    reportRunId: uuid("report_run_id")
      .notNull()
      .references(() => reportRuns.id),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id),
    section: text("section").notNull(),
    rank: integer("rank").notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.reportRunId, table.articleId] })
  })
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportRunId: uuid("report_run_id")
    .notNull()
    .references(() => reportRuns.id)
    .unique(),
  structuredJson: jsonb("structured_json").notNull(),
  html: text("html").notNull(),
  plaintext: text("plaintext").notNull(),
  subject: text("subject").notNull(),
  modelName: text("model_name").notNull(),
  tokenMetadata: jsonb("token_metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const emailDeliveries = pgTable(
  "email_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportRunId: uuid("report_run_id")
      .notNull()
      .references(() => reportRuns.id),
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id"),
    recipients: text("recipients").notNull(),
    status: text("status").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    reportRunIdx: uniqueIndex("email_deliveries_report_run_idx").on(table.reportRunId)
  })
);

export const sourceFetchLogs = pgTable("source_fetch_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceKey: text("source_key").notNull(),
  reportRunId: uuid("report_run_id").references(() => reportRuns.id),
  status: text("status").notNull(),
  itemCount: integer("item_count").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  httpStatus: integer("http_status"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
