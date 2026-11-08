CREATE TYPE "public"."profile_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"username" varchar(30) NOT NULL,
	"display_name" varchar(80) NOT NULL,
	"bio" varchar(280),
	"avatar_url" text,
	"visibility" "profile_visibility" DEFAULT 'public' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_username_format" CHECK ("profiles"."username" ~ '^[a-z0-9_]{3,30}$'),
	CONSTRAINT "profiles_display_name_not_blank" CHECK (char_length(btrim("profiles"."display_name")) between 1 and 80),
	CONSTRAINT "profiles_bio_length" CHECK ("profiles"."bio" is null or char_length("profiles"."bio") <= 280),
	CONSTRAINT "profiles_avatar_url_length" CHECK ("profiles"."avatar_url" is null or char_length("profiles"."avatar_url") <= 2048)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_identity_id_key" ON "profiles" USING btree ("identity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "profiles_visibility_idx" ON "profiles" USING btree ("visibility");