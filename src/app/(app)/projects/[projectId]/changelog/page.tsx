import { db } from "@/lib/db";
import { projects, changelog, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ChangelogFeed } from "@/components/changelog/ChangelogFeed";
import { cn } from "@/lib/utils/cn";

interface PageProps {
  params: { projectId: string };
}

export default async function ProjectChangelogPage({ params }: PageProps) {
  // Fetch project
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);

  if (!project) notFound();

  // Fetch changelog with user info
  const entryRows = await db
    .select({
      id: changelog.id,
      action: changelog.action,
      entityType: changelog.entityType,
      description: changelog.description,
      createdAt: changelog.createdAt,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(changelog)
    .leftJoin(users, eq(changelog.userId, users.id))
    .where(eq(changelog.projectId, params.projectId))
    .orderBy(desc(changelog.createdAt))
    .limit(100);

  const entries = entryRows.map((e) => ({
    id: e.id,
    action: e.action,
    entityType: e.entityType ?? "",
    description: e.description ?? "",
    createdAt: e.createdAt ? e.createdAt.toISOString() : "",
    user: {
      name: e.userName ?? null,
      avatarUrl: e.userAvatarUrl ?? null,
    },
  }));

  const tabs = [
    { href: `/projects/${project.id}`, label: "Tareas" },
    { href: `/projects/${project.id}/documents`, label: "Documentos" },
    { href: `/projects/${project.id}/notes`, label: "Notas" },
    { href: `/projects/${project.id}/changelog`, label: "Historial", active: true },
    { href: `/projects/${project.id}/settings`, label: "Config." },
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
        Historial de cambios
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

      <ChangelogFeed entries={entries} />
    </div>
  );
}
