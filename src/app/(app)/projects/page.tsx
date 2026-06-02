import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, buckets } from "@/lib/db/schema";
import { eq, ne, and, asc, desc } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";
import Link from "next/link";
import { Plus, FolderKanban, Layers } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { getActiveWorkspace } from "@/lib/workspace";
import { PROJECT_STATUS_CONFIG } from "@/lib/constants/projectStatus";
import type { ProjectStatus } from "@/lib/types";
import { formatDateCR } from "@/lib/utils/datetime";

function formatDate(d: string) {
  return formatDateCR(d);
}

function durationDays(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / 86_400_000)) + 1;
}

/**
 * /projects (Edition 04).
 *
 * Estructura:
 *   - PageHeader drop-line "Proyectos," "del estudio"
 *   - Por bucket: HairlineRule + lista de proyectos como hanging-list
 *     con color dots de cada proyecto.
 *   - Sin card grid genérico.
 */
export default async function ProjectsPage() {
  const session = await auth();
  const role = (session?.user?.role as string) ?? "";
  const isManager = role === "admin" || role === "manager";

  const ws = await getActiveWorkspace();
  if (!ws) {
    return (
      <div className="animate-fade-in px-8 py-10 md:px-12">
        <PageHeader eyebrow="/ proyectos" title="Proyectos." />
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title="Sin entorno"
          description="No perteneces a ningún entorno todavía. Pedile a un administrador que te asigne uno."
        />
      </div>
    );
  }

  const bucketRows = await db
    .select()
    .from(buckets)
    .orderBy(asc(buckets.position));

  const projectRows = await db
    .select({ project: projects, bucket: buckets })
    .from(projects)
    .leftJoin(buckets, eq(projects.bucketId, buckets.id))
    .where(
      and(eq(projects.workspaceId, ws.id), ne(projects.status, "archived"))
    )
    .orderBy(desc(projects.createdAt));

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
    {
      id: "uncategorized",
      name: "Sin categoría",
      color: "#8a8378",
      position: 9999,
    },
  ];

  const newProjectButton = (
    <Link
      href="/projects/new"
      className="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 font-mono text-[12px] uppercase tracking-[0.16em] text-bg transition-colors hover:bg-ink-soft"
    >
      <Plus className="h-3 w-3" />
      Nuevo proyecto
    </Link>
  );

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow="/ proyectos"
        title="Proyectos,"
        subtitle="del estudio."
        issueLines={[
          `${projectRows.length} ACTIVOS`,
          `${bucketRows.length} CATEGORÍAS`,
        ]}
        actions={isManager ? newProjectButton : undefined}
      />

      {!projectRows.length ? (
        <EmptyState
          icon={<FolderKanban className="h-12 w-12" />}
          title="Sin proyectos aún"
          description="Crea tu primer proyecto para comenzar a organizar el trabajo"
          action={isManager ? newProjectButton : undefined}
        />
      ) : (
        <div className="space-y-12 mt-2">
          {bucketList.map((bucket) => {
            const bucketProjects = projectsByBucket[bucket.id] ?? [];
            if (!bucketProjects.length) return null;

            return (
              <section key={bucket.id}>
                <HairlineRule
                  label={bucket.name}
                  count={`${bucketProjects.length}`}
                  labelColor={bucket.color ?? "var(--ink-soft)"}
                />

                <ul className="h-list mt-3">
                  {bucketProjects.map(({ project }, i) => {
                    const cfg =
                      PROJECT_STATUS_CONFIG[
                        project.status as ProjectStatus
                      ] ?? PROJECT_STATUS_CONFIG.active;
                    return (
                      <li key={project.id} className="h-list-item">
                        <span className="h-list-item-n">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <Link
                          href={`/projects/${project.id}`}
                          className="flex min-w-0 flex-1 items-baseline gap-3"
                        >
                          <span
                            className="h-2 w-2 flex-shrink-0 self-center rounded-full"
                            style={{
                              backgroundColor: project.color ?? "#161412",
                            }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[16px] font-bold text-ink">
                              {project.name}
                            </span>
                            {project.description && (
                              <span className="block truncate text-[14px] text-ink-soft">
                                {project.description}
                              </span>
                            )}
                          </span>
                        </Link>
                        <div className="flex flex-shrink-0 items-baseline gap-3">
                          <span
                            className="font-mono text-[11px] uppercase tracking-[0.16em]"
                            style={{
                              color:
                                cfg.variant === "danger"
                                  ? "var(--urgent)"
                                  : cfg.variant === "success"
                                    ? "var(--done)"
                                    : "var(--ink-soft)",
                            }}
                          >
                            {cfg.label}
                          </span>
                          {project.startDate && project.endDate ? (
                            <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-ink-faint">
                              {durationDays(
                                project.startDate,
                                project.endDate
                              )}{" "}
                              días
                            </span>
                          ) : project.dueDate ? (
                            <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-ink-faint">
                              {formatDate(project.dueDate)}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
