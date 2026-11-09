CREATE TABLE "post_likes" (
	"post_id" uuid NOT NULL,
	"identity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_post_id_identity_id_pk" PRIMARY KEY("post_id","identity_id")
);
--> statement-breakpoint
CREATE TABLE "post_topics" (
	"post_id" uuid NOT NULL,
	"topic" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_topics_post_id_topic_pk" PRIMARY KEY("post_id","topic"),
	CONSTRAINT "post_topics_topic_shape" CHECK ("post_topics"."topic" ~ '^[a-z0-9_]{2,40}$')
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"body" varchar(1000) NOT NULL,
	"media_url" text,
	"media_alt" varchar(280),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "posts_body_length" CHECK (char_length("posts"."body") between 1 and 1000),
	CONSTRAINT "posts_media_url_shape" CHECK ("posts"."media_url" is null or ("posts"."media_url" ~ '^https://' and char_length("posts"."media_url") <= 2048)),
	CONSTRAINT "posts_media_alt_length" CHECK ("posts"."media_alt" is null or char_length("posts"."media_alt") <= 280)
);
--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_topics" ADD CONSTRAINT "post_topics_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_likes_identity_idx" ON "post_likes" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "post_topics_topic_idx" ON "post_topics" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "posts_feed_idx" ON "posts" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_identity_created_idx" ON "posts" USING btree ("identity_id","created_at" DESC NULLS LAST);