CREATE TYPE "public"."project_visibility" AS ENUM('workspace', 'members');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "visibility" "project_visibility" DEFAULT 'workspace' NOT NULL;