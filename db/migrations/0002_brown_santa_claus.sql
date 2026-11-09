ALTER TABLE "posts" DROP CONSTRAINT "posts_body_length";--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_body_length" CHECK (char_length(btrim("posts"."body")) between 1 and 1000);