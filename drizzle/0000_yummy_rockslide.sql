CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_url" text NOT NULL,
	"title" text NOT NULL,
	"source_key" text NOT NULL,
	"source_name" text NOT NULL,
	"region" text NOT NULL,
	"published_at" timestamp with time zone,
	"excerpt" text,
	"content_hash" text NOT NULL,
	"normalized_title_hash" text NOT NULL,
	"relevance_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_run_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_message_id" text,
	"recipients" text NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"adapter_type" text NOT NULL,
	"url" text NOT NULL,
	"region" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"timeout_ms" integer DEFAULT 10000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_sources_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "report_items" (
	"report_run_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"section" text NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "report_items_report_run_id_article_id_pk" PRIMARY KEY("report_run_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "report_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_date" date NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"fetched_count" integer DEFAULT 0 NOT NULL,
	"selected_count" integer DEFAULT 0 NOT NULL,
	"error_summary" text,
	"idempotency_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_run_id" uuid NOT NULL,
	"structured_json" jsonb NOT NULL,
	"html" text NOT NULL,
	"plaintext" text NOT NULL,
	"subject" text NOT NULL,
	"model_name" text NOT NULL,
	"token_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_report_run_id_unique" UNIQUE("report_run_id")
);
--> statement-breakpoint
CREATE TABLE "source_fetch_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"report_run_id" uuid,
	"status" text NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"http_status" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_report_run_id_report_runs_id_fk" FOREIGN KEY ("report_run_id") REFERENCES "public"."report_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_items" ADD CONSTRAINT "report_items_report_run_id_report_runs_id_fk" FOREIGN KEY ("report_run_id") REFERENCES "public"."report_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_items" ADD CONSTRAINT "report_items_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_report_run_id_report_runs_id_fk" FOREIGN KEY ("report_run_id") REFERENCES "public"."report_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_fetch_logs" ADD CONSTRAINT "source_fetch_logs_report_run_id_report_runs_id_fk" FOREIGN KEY ("report_run_id") REFERENCES "public"."report_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_canonical_url_idx" ON "articles" USING btree ("canonical_url");--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_report_run_idx" ON "email_deliveries" USING btree ("report_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_runs_report_date_idx" ON "report_runs" USING btree ("report_date");