import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, buckets, tasks } from "@/lib/db/schema";
import { eq, ne, and, asc, desc, sql, inArray } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import Link from "next/link";
import { Plus, FolderKanban, Layers } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { getActiveWorkspace } from "@/lib/workspace";
import { ProjectsExplorer } from "@/components/projects/ProjectsExplorer";
import type { ProjectStatus } from "@/lib/types";

/**
 * /projects (Edition 04 — specimen layout).
 *
 * Server component que fetchea:
 *  - Proyectos del workspace (excluyendo archivados).
 *  - Buckets para nombrar la categoría de cada proyecto.
 *  - Agregados de tareas por proyecto (totales + done) para calcular
 *    % completo y "tareas activas" en cada specimen.
 *
 * UI viene del client component <ProjectsExplorer />:
 *  - Tabs por status (Todos · Activo · En pausa · …) con count.
 *  - Specimens grandes por proyecto: hanging number, mega título,
 *    description, strip de 3 stats grandes.
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

  // Agregados de tareas por proyecto. 1 query con GROUP BY (no N+1).
  const projectIds = projectRows.map((r) => r.project.id);
  const taskAggregates =
    projectIds.length === 0
      ? []
      : await db
          .select({
            projectId: tasks.projectId,
            total: sql<number>`count(*)::int`,
            done: sql<number>`count(*) FILTER (WHERE ${tasks.status} = 'done')::int`,
            active: sql<number>`count(*) FILTER (WHERE ${tasks.status} != 'done')::int`,
          })
          .from(tasks)
          .where(inArray(tasks.projectId, projectIds))
          .groupBy(tasks.projectId);

  const aggMap = new Map<
    string,
    { total: number; done: number; active: number }
  >();
  for (const a of taskAggregates) {
    aggMap.set(a.projectId, {
      total: a.total,
      done: a.done,
      active: a.active,
    });
  }

  const specimens = projectRows.map((row, i) => {
    const agg = aggMap.get(row.project.id) ?? {
      total: 0,
      done: 0,
      active: 0,
    };
    return {
      index: i + 1,
      id: row.project.id,
      name: row.project.name,
      description: row.project.description,
      color: row.project.color,
      status: row.project.status as ProjectStatus,
      bucketName: row.bucket?.name ?? null,
      bucketColor: row.bucket?.color ?? null,
      startDate: row.project.startDate,
      endDate: row.project.endDate,
      dueDate: row.project.dueDate,
      totalTasks: agg.total,
      doneTasks: agg.done,
      activeTasks: agg.active,
    };
  });

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
          `${specimens.length} ACTIVOS`,
          `${bucketRows.length} CATEGORÍAS`,
        ]}
        actions={isManager ? newProjectButton : undefined}
      />

      {!specimens.length ? (
        <EmptyState
          icon={<FolderKanban className="h-12 w-12" />}
          title="Sin proyectos aún"
          description="Crea tu primer proyecto para comenzar a organizar el trabajo"
          action={isManager ? newProjectButton : undefined}
        />
      ) : (
        <ProjectsExplorer specimens={specimens} />
      )}
    </div>
  );
}
