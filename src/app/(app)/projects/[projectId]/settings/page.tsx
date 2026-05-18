import { db } from "@/lib/db";
import { projects, projectMembers, users, buckets } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProjectSettingsForm } from "@/components/projects/ProjectSettingsForm";
import { cn } from "@/lib/utils/cn";

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

  const tabs = [
    { href: `/projects/${project.id}`, label: "Tareas" },
    { href: `/projects/${project.id}/documents`, label: "Documentos" },
    { href: `/projects/${project.id}/notes`, label: "Notas" },
    { href: `/projects/${project.id}/changelog`, label: "Historial" },
    {
      href: `/projects/${project.id}/settings`,
      label: "Config.",
      active: true,
    },
  ];

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <Link
        href={`/projects/${project.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        {project.name}
      </Link>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-text">
        Configuración
      </h1>

      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mx-auto max-w-xl">
        <ProjectSettingsForm
          project={{
            id: project.id,
            name: project.name,
            description: project.description ?? null,
            bucketId: project.bucketId ?? null,
            color: project.color ?? null,
            status: project.status,
          }}
          members={members}
          allUsers={allUsers}
          buckets={bucketRows}
        />
      </div>
    </div>
  );
}
