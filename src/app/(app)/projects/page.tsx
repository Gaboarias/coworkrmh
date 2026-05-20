import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, buckets } from "@/lib/db/schema";
import { eq, ne, and, asc, desc } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import Link from "next/link";
import { Plus, FolderKanban, CalendarDays, Layers } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { getActiveWorkspace } from "@/lib/workspace";
import { Badge } from "@/components/ui/Badge";
import { PROJECT_STATUS_CONFIG } from "@/lib/constants/projectStatus";
import type { ProjectStatus } from "@/lib/types";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
  });
}

function durationDays(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / 86_400_000)) + 1;
}

export default async function ProjectsPage() {
  const session = await auth();
  const role = (session?.user?.role as string) ?? "";
  const isManager = role === "admin" || role === "manager";

  const ws = await getActiveWorkspace();
  if (!ws) {
    return (
      <div className="animate-fade-in p-6 md:p-8">
        <PageHeader title="Proyectos" />
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title="Sin entorno"
          description="No perteneces a ningún entorno todavía. Pedile a un administrador que te asigne uno."
        />
      </div>
    );
  }

  // Fetch all buckets
  const bucketRows = await db
    .select()
    .from(buckets)
    .orderBy(asc(buckets.position));

  // Fetch projects with bucket (scoped al entorno activo)
  const projectRows = await db
    .select({ project: projects, bucket: buckets })
    .from(projects)
    .leftJoin(buckets, eq(projects.bucketId, buckets.id))
    .where(
      and(eq(projects.workspaceId, ws.id), ne(projects.status, "archived"))
    )
    .orderBy(desc(projects.createdAt));

  // Group projects by bucket
  type ProjectRow = (typeof projectRows)[number];
  const projectsByBucket: Record<string, ProjectRow[]> = {
    uncategorized: [],
  };
  bucketRows.forEach((b) => {
    projectsByBucket[b.id] = [];
  });
  projectRows.forEach((row) => {
    const key = row.project.bucketId ?? "uncategorized";
    if (!projectsByBucket[key]) projectsByBucket[key] = [];
    projectsByBucket[key]!.push(row);
  });

  const bucketList = [
    ...bucketRows,
    { id: "uncategorized", name: "Sin categoría", color: "#505065", position: 9999 },
  ];

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <PageHeader
        title="Proyectos"
        description="Gestiona los proyectos de tu equipo"
        actions={
          isManager ? (
            <Link
              href="/projects/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-elev-1 transition-[background-color,box-shadow] duration-200 ease-out hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Nuevo proyecto
            </Link>
          ) : null
        }
      />

      {!projectRows.length ? (
        <EmptyState
          icon={<FolderKanban className="h-12 w-12" />}
          title="Sin proyectos aún"
          description="Crea tu primer proyecto para comenzar a organizar el trabajo"
          action={
            isManager ? (
              <Link
                href="/projects/new"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-elev-1 transition-[background-color,box-shadow] duration-200 ease-out hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />
                Crear proyecto
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {bucketList.map((bucket) => {
            const bucketProjects = projectsByBucket[bucket.id] ?? [];
            if (!bucketProjects.length) return null;

            return (
              <div key={bucket.id}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: bucket.color ?? "#6B5FE4" }}
                  />
                  <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                    {bucket.name}
                  </h3>
                  <span className="rounded-full bg-surface-el px-1.5 py-0.5 text-xs text-text-tertiary">
                    {bucketProjects.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {bucketProjects.map(({ project }) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="group rounded-xl border border-border bg-surface p-4 transition hover:border-primary/50 hover:bg-surface-el"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-sm flex-shrink-0"
                          style={{
                            backgroundColor: project.color ?? "#6B5FE4",
                          }}
                        />
                        <h4 className="flex-1 truncate font-medium text-text group-hover:text-primary">
                          {project.name}
                        </h4>
                      </div>

                      {project.description && (
                        <p className="mb-3 line-clamp-2 text-xs text-text-muted">
                          {project.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        {(() => {
                          const cfg =
                            PROJECT_STATUS_CONFIG[
                              project.status as ProjectStatus
                            ] ?? PROJECT_STATUS_CONFIG.active;
                          return (
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          );
                        })()}
                        {project.startDate && project.endDate ? (
                          <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
                            <CalendarDays className="h-3 w-3" />
                            {durationDays(
                              project.startDate,
                              project.endDate
                            )}{" "}
                            días
                          </span>
                        ) : project.dueDate ? (
                          <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(project.dueDate)}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
