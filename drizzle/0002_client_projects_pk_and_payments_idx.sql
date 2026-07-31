-- 0002 — PK compuesta en client_projects + índices.
--
-- IDEMPOTENTE A PROPÓSITO. El generador de drizzle emitió además
-- calendar_connections, task_assignees, workspaces.tier y dos enums: existen
-- en producción pero nunca pasaron por una migración de este directorio (se
-- aplicaron con db:push / la ruta temporal de migración que menciona
-- LESSONS.md). Correr el SQL crudo reventaría con "already exists", así que
-- cada statement va guardado. Ejecutable sin riesgo esté como esté la base.

-- ─── Enums ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "public"."calendar_provider" AS ENUM('google', 'microsoft');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."workspace_tier" AS ENUM('basic', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- ─── Tablas ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "calendar_provider" NOT NULL,
	"account_email" text,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "task_assignees" (
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_assignees_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);--> statement-breakpoint

ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "tier" "workspace_tier" DEFAULT 'premium' NOT NULL;--> statement-breakpoint

-- ─── client_projects: dedupe y PK ─────────────────────────────────────────
-- La tabla nunca tuvo PK ni unique, así que el .onConflictDoNothing() de
-- linkClientToProject no tenía contra qué conflictuar y podían quedar filas
-- repetidas. Se limpian antes de crear la PK, si no el ALTER falla.
DELETE FROM "client_projects" a
USING "client_projects" b
WHERE a.ctid < b.ctid
  AND a."client_id" = b."client_id"
  AND a."project_id" = b."project_id";--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "client_projects"
    ADD CONSTRAINT "client_projects_client_id_project_id_pk"
    PRIMARY KEY("client_id","project_id");
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL;
END $$;--> statement-breakpoint

-- ─── Foreign keys ─────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_tasks_id_fk"
    FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- ─── Índices ──────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_conn_user_provider_idx" ON "calendar_connections" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_assignees_user_idx" ON "task_assignees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_projects_project_idx" ON "client_projects" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_client_created_idx" ON "payments" USING btree ("client_id","created_at");
