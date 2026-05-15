import { db } from "@/lib/db";
import { projects, changelog, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChangelogFeed } from "@/components/changelog/ChangelogFeed";

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

  // Shape to match ChangelogFeed interface (snake_case)
  const shapedEntries = entryRows.map((e) => ({
    id: e.id,
    action: e.action,
    entity_type: e.entityType ?? "",
    description: e.description ?? "",
    created_at: e.createdAt ? String(e.createdAt) : "",
    user: {
      full_name: e.userName ?? null,
      avatar_url: e.userAvatarUrl ?? null,
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
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-text-muted hover:text-text"
        >
          ← {project.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-text">Historial de cambios</h1>
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

      <ChangelogFeed entries={shapedEntries} />
    </div>
  );
}
