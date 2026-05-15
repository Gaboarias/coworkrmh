import { db } from "@/lib/db";
import { projects, projectMembers, users, buckets } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProjectSettingsForm } from "@/components/projects/ProjectSettingsForm";

interface PageProps {
  params: { projectId: string };
}

export default async function ProjectSettingsPage({ params }: PageProps) {
  // Fetch project
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);

  if (!project) notFound();

  // Fetch project members with user info
  const memberRows = await db
    .select({
      userId: projectMembers.userId,
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(projectMembers)
    .leftJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, params.projectId));

  const memberProfiles = memberRows
    .filter((m) => m.id != null)
    .map((m) => ({
      id: m.id!,
      full_name: m.name ?? null,
      email: m.email ?? "",
      avatar_url: m.avatarUrl ?? null,
    }));

  // Fetch all users
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
    full_name: u.name ?? null,
    email: u.email ?? "",
    avatar_url: u.avatarUrl ?? null,
  }));

  // Fetch buckets
  const bucketRows = await db
    .select({ id: buckets.id, name: buckets.name })
    .from(buckets)
    .orderBy(asc(buckets.position));

  // Shape project to match ProjectSettingsForm interface (snake_case)
  const shapedProject = {
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    bucket_id: project.bucketId ?? null,
    color: project.color ?? null,
    status: project.status as "active" | "archived" | "completed",
  };

  const tabs = [
    { href: `/projects/${project.id}`, label: "Tareas" },
    { href: `/projects/${project.id}/documents`, label: "Documentos" },
    { href: `/projects/${project.id}/notes`, label: "Notas" },
    { href: `/projects/${project.id}/changelog`, label: "Historial" },
    { href: `/projects/${project.id}/settings`, label: "Config.", active: true },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-text-muted hover:text-text"
        >
          ← {project.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-text">Configuración</h1>
      </div>

      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-2 text-sm font-medium transition border-b-2 ${
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mx-auto max-w-xl">
        <ProjectSettingsForm
          project={shapedProject}
          members={memberProfiles}
          allUsers={allUsers}
          buckets={bucketRows}
        />
      </div>
    </div>
  );
}
