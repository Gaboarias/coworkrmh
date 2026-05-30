import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  tasks,
  projects,
  payments,
  clients,
  buckets,
} from "@/lib/db/schema";
import { eq, and, ne, asc, desc, inArray } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";
import { EmptyState } from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Layers } from "lucide-react";
import { formatMoney } from "@/lib/utils/money";
import { getActiveWorkspace } from "@/lib/workspace";

/**
 * Dashboard (Edition 04).
 *
 * Layout: asimétrico 1.5fr / 1fr.
 *   LEFT — Mis tareas activas (hanging-number list).
 *   RIGHT — Proyectos activos (lista compacta con dots) + (admin) pagos.
 *
 * Gestos signature:
 *   - Drop-line title: "Hola, Gabriel," / "buen sábado."
 *   - Eyebrow "/ dashboard"
 *   - Issue numeration top-right
 *   - HairlineRule sections
 *   - Sin cards. Whitespace abundante.
 */
export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const role = session.user.role as string;
  const isManager = role === "admin" || role === "manager";

  const ws = await getActiveWorkspace();
  if (!ws) {
    return (
      <div className="animate-fade-in px-8 py-10 md:px-12">
        <PageHeader
          eyebrow="/ dashboard"
          title="Sin entorno."
          subtitle="todavía."
        />
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title="Sin entorno"
          description="No perteneces a ningún entorno todavía. Pedile a un administrador que te asigne uno."
        />
      </div>
    );
  }

  const myTaskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.assigneeId, userId),
        ne(tasks.status, "done"),
        eq(projects.workspaceId, ws.id)
      )
    )
    .orderBy(asc(tasks.dueDate))
    .limit(6);

  const recentProjectRows = await db
    .select({ project: projects, bucket: buckets })
    .from(projects)
    .leftJoin(buckets, eq(projects.bucketId, buckets.id))
    .where(
      and(eq(projects.workspaceId, ws.id), ne(projects.status, "archived"))
    )
    .orderBy(desc(projects.createdAt))
    .limit(6);

  const upcomingPaymentRows = isManager
    ? await db
        .select({ payment: payments, client: clients })
        .from(payments)
        .leftJoin(clients, eq(payments.clientId, clients.id))
        .where(inArray(payments.status, ["pending", "overdue"]))
        .orderBy(asc(payments.dueDate))
        .limit(5)
    : [];

  const today = format(new Date(), "EEEE", { locale: es });
  const todayLong = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });
  const firstName = session.user.name?.split(" ")[0] ?? "equipo";

  // Pad para issue numeration
  const dateStamp = format(new Date(), "MMM dd", { locale: es }).toUpperCase();

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow="/ dashboard"
        title={`Hola, ${firstName},`}
        subtitle={`buen ${today}.`}
        issueLines={[
          `Ed. 04 · ${dateStamp}`,
          `${myTaskRows.length} ACTIVAS · ${recentProjectRows.length} PROYECTOS`,
        ]}
      />

      {/* Asymmetric main grid */}
      <div className="mt-2 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
        {/* ── LEFT — Mis tareas ───────────────────────────────────── */}
        <section>
          <HairlineRule
            label="Mis tareas activas"
            count={`${myTaskRows.length}`}
          />
          {myTaskRows.length === 0 ? (
            <p className="mt-4 text-sm italic text-ink-faint">
              No tenés tareas pendientes esta semana.
            </p>
          ) : (
            <ul className="h-list mt-2">
              {myTaskRows.map((task, i) => {
                const isUrgent = task.priority === "urgent";
                const isHigh = task.priority === "high";
                const due = task.dueDate
                  ? format(new Date(task.dueDate), "dd MMM", { locale: es })
                  : null;
                return (
                  <li key={task.id} className="h-list-item">
                    <span className="h-list-item-n">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Link
                      href={`/projects/${task.projectId}`}
                      className="flex min-w-0 flex-1 items-baseline gap-3"
                    >
                      <span
                        className={
                          "min-w-0 flex-1 truncate text-[14px] leading-snug " +
                          (isUrgent || isHigh
                            ? "font-bold text-ink"
                            : "font-medium text-ink")
                        }
                      >
                        {task.title}
                      </span>
                      <span className="flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                        {task.projectName}
                      </span>
                    </Link>
                    {isUrgent ? (
                      <span className="pill pill-urgent">
                        {due ?? "Urgente"}
                      </span>
                    ) : due ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint">
                        {due}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4">
            <Link
              href="/my-tasks"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-ink"
            >
              Ver todas →
            </Link>
          </div>
        </section>

        {/* ── RIGHT — Marginalia: Proyectos + Pagos ──────────────── */}
        <aside className="space-y-10">
          <div>
            <HairlineRule
              label="Proyectos activos"
              count={`${recentProjectRows.length}`}
            />
            {recentProjectRows.length === 0 ? (
              <p className="mt-4 text-sm italic text-ink-faint">
                Sin proyectos activos en este entorno.
              </p>
            ) : (
              <ul className="mt-3 space-y-1">
                {recentProjectRows.map(({ project }) => (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="row-hover -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5"
                    >
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{
                          backgroundColor: project.color ?? "#161412",
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                        {project.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Link
                href="/projects"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-ink"
              >
                Ver todos →
              </Link>
            </div>
          </div>

          {isManager && upcomingPaymentRows.length > 0 && (
            <div>
              <HairlineRule
                label="Pagos próximos"
                count={`${upcomingPaymentRows.length}`}
              />
              <ul className="mt-3 space-y-2">
                {upcomingPaymentRows.map(({ payment, client }) => {
                  const isOverdue =
                    payment.status === "overdue" ||
                    (payment.dueDate &&
                      new Date(payment.dueDate) < new Date());
                  return (
                    <li
                      key={payment.id}
                      className="flex items-baseline justify-between gap-3 py-1"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">
                          {payment.description}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                          {client?.companyName}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 text-right">
                        <span
                          className={
                            "text-[13px] font-bold tabular-nums " +
                            (isOverdue ? "text-urgent" : "text-ink")
                          }
                        >
                          {formatMoney(
                            Number(payment.amount),
                            payment.currency
                          )}
                        </span>
                        {payment.dueDate && (
                          <span
                            className={
                              "font-mono text-[9px] uppercase tracking-[0.06em] " +
                              (isOverdue ? "text-urgent" : "text-ink-faint")
                            }
                          >
                            {format(new Date(payment.dueDate), "dd MMM", {
                              locale: es,
                            })}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Nota tipo marginalia — placeholder, podría ser un input futuro */}
          <div className="border-l-2 border-rule-strong pl-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
              Hoy
            </p>
            <p className="mt-2 text-[13px] italic leading-relaxed text-ink-soft">
              {todayLong}.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
