import Link from "next/link";
import { db } from "@/lib/db";
import { changelog, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { History } from "lucide-react";

/**
 * Panel colapsado de "Historial reciente" para el resumen del proyecto.
 * Reemplaza la pestaña dedicada de Changelog (que saturaba la nav): muestra
 * los últimos 5 eventos y enlaza al historial completo. Server component
 * autónomo — hace su propia query.
 */
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "recién";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export async function RecentActivityPanel({ projectId }: { projectId: string }) {
  const rows = await db
    .select({
      id: changelog.id,
      description: changelog.description,
      createdAt: changelog.createdAt,
      userName: users.name,
    })
    .from(changelog)
    .leftJoin(users, eq(changelog.userId, users.id))
    .where(eq(changelog.projectId, projectId))
    .orderBy(desc(changelog.createdAt))
    .limit(5);

  if (rows.length === 0) return null;

  return (
    <details className="mt-12 border-t border-rule pt-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink">
        <History className="h-3.5 w-3.5" strokeWidth={1.75} />
        Historial reciente
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          {rows.length}
        </span>
      </summary>
      <ul className="mt-3 space-y-2">
        {rows.map((e) => (
          <li key={e.id} className="flex items-baseline gap-2 text-[13px]">
            <span className="text-ink-soft">{e.description ?? "Actividad"}</span>
            <span className="text-ink-faint">·</span>
            <span className="whitespace-nowrap text-ink-faint">
              {e.userName ?? "Alguien"}, {e.createdAt ? timeAgo(e.createdAt.toISOString()) : ""}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href={`/projects/${projectId}/changelog`}
        className="mt-3 inline-block font-mono text-[12px] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink"
      >
        Ver todo el historial →
      </Link>
    </details>
  );
}
