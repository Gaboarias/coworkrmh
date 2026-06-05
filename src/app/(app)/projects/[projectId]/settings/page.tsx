import { db } from "@/lib/db";
import { projects, projectMembers, users, buckets } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProjectSettingsForm } from "@/components/projects/ProjectSettingsForm";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { PageHeader } from "@/components/shared/PageHeader";
import type { ProjectStatus } from "@/lib/types";

interface PageProps {
  params: { projectId: string };
}

export default async function ProjectSettingsPage({ params }: PageProps) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);

  if (!project) notFound();

  const memberRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(projectMembers)
    .leftJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, params.projectId));

  const members = memberRows
    .filter((m) => m.id != null)
    .map((m) => ({
      id: m.id as string,
      name: m.name ?? null,
      email: m.email ?? "",
      avatarUrl: m.avatarUrl ?? null,
    }));

  const allUserRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .orderBy(asc(users.name));

  const allUsers = allUserRows.map((u) => ({
    id: u.id,
    name: u.name ?? null,
    email: u.email ?? "",
    avatarUrl: u.avatarUrl ?? null,
  }));

  const bucketRows = await db
    .select({ id: buckets.id, name: buckets.name })
    .from(buckets)
    .orderBy(asc(buckets.position));

  const parts = project.name.split(/\s+[—-]\s+/);
  const titleText = parts[0] ?? project.name;
  const subtitleText =
    parts.length > 1 ? parts.slice(1).join(" — ") : "configuración.";

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow={`/ proyectos / ${titleText.toLowerCase()} / config`}
        title={`${titleText},`}
        subtitle={subtitleText}
      />

      <ProjectTabs projectId={project.id} />

      <div className="mx-auto max-w-xl">
        <ProjectSettingsForm
          project={{
            id: project.id,
            name: project.name,
            description: project.description ?? null,
            bucketId: project.bucketId ?? null,
            color: project.color ?? null,
            // Cast porque el enum DB tiene 12 valores (incluye 6 legacy del
            // intento abortado de migrar a 'categorías') pero el tipo TS sólo
            // expone los 6 oficiales. Si la DB devuelve uno de los 6 legacy,
            // cae al fallback en PROJECT_STATUS_CONFIG.
            status: project.status as ProjectStatus,
            startDate: project.startDate ?? null,
            endDate: project.endDate ?? null,
          }}
          members={members}
          allUsers={allUsers}
          buckets={bucketRows}
        />
      </div>
    </div>
  );
}
