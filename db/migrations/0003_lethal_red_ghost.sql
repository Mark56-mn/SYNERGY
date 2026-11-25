CREATE TABLE "follows" (
	"follower_identity_id" uuid NOT NULL,
	"following_identity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_identity_id_following_identity_id_pk" PRIMARY KEY("follower_identity_id","following_identity_id"),
	CONSTRAINT "follows_no_self" CHECK ("follows"."follower_identity_id" <> "follows"."following_identity_id")
);
--> statement-breakpoint
CREATE INDEX "follows_following_created_idx" ON "follows" USING btree ("following_identity_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "follows_follower_created_idx" ON "follows" USING btree ("follower_identity_id","created_at" DESC NULLS LAST);