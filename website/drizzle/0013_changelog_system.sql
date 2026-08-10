-- The changelog_release / changelog_change tables have existed in
-- schema.ts since the changelog feature was added, but no migration was
-- ever generated for them — every other feature added in that session
-- (news system, etc) got a migration file, this one was missed. That's
-- why POST /api/admin/changelog 500s in production: the table (or at
-- minimum cover_image_is_external) doesn't exist in the live database.
--
-- IF NOT EXISTS / DO $$ guards throughout so this is safe to run even if
-- some piece of this was partially created by hand at some point.

DO $$ BEGIN
	CREATE TYPE "public"."changelog_category" AS ENUM('NEW', 'IMPROVED', 'FIXED', 'REMOVED');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "changelog_release" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" varchar(50) NOT NULL,
	"title" varchar(160),
	"summary" varchar(280),
	"cover_image" text,
	"cover_image_is_external" boolean DEFAULT false NOT NULL,
	"released_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "changelog_release_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "changelog_change" (
	"id" serial PRIMARY KEY NOT NULL,
	"release_id" integer NOT NULL,
	"category" "changelog_category" NOT NULL,
	"text" varchar(280) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "changelog_release" ADD CONSTRAINT "changelog_release_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "changelog_release" ADD CONSTRAINT "changelog_release_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "changelog_change" ADD CONSTRAINT "changelog_change_release_id_changelog_release_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."changelog_release"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "changelog_release_released_at_idx" ON "changelog_release" USING btree ("released_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "changelog_change_release_id_idx" ON "changelog_change" USING btree ("release_id");
