import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tasks, projects, payments, clients, buckets } from "@/lib/db/schema";
import { eq, and, ne, asc, desc, inArray } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { CheckSquare, FolderKanban, AlertCircle } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const role = session.user.role as string;
  const isManager = role === "admin" || role === "manager";

  // Fetch my pending tasks with project info
  const myTaskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(tasks.assigneeId, userId), ne(tasks.status, "done")))
    .orderBy(asc(tasks.dueDate))
    .limit(5);

  // Fetch active projects with bucket
  const recentProjectRows = await db
    .select({ project: projects, bucket: buckets })
    .from(projects)
    .leftJoin(buckets, eq(projects.bucketId, buckets.id))
    .where(ne(projects.status, "archived"))
    .orderBy(desc(projects.createdAt))
    .limit(5);

  // Fetch upcoming payments (admin/manager only)
  const upcomingPaymentRows = isManager
    ? await db
        .select({ payment: payments, client: clients })
        .from(payments)
        .leftJoin(clients, eq(payments.clientId, clients.id))
        .where(inArray(payments.status, ["pending", "overdue"]))
        .orderBy(asc(payments.dueDate))
        .limit(10)
    : [];

  const today = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });
  const firstName = session.user.name?.split(" ")[0] ?? "equipo";

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Hola, ${firstName} 👋`}
        description={today}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* My Tasks */}
        <div className="col-span-1 rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-text">Mis tareas</h3>
            </div>
            <Link
              href="/my-tasks"
              className="text-xs text-primary hover:text-primary-hover"
            >
              Ver todas
            </Link>
          </div>

          {!myTaskRows.length ? (
            <p className="py-4 text-center text-sm text-text-muted">
              No tienes tareas pendientes
            </p>
          ) : (
            <ul className="space-y-2">
              {myTaskRows.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/projects/${task.projectId}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-surface-el"
                  >
                    <span
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        task.priority === "urgent"
                          ? "bg-danger"
                          : task.priority === "high"
                            ? "bg-warning"
                            : task.priority === "medium"
                              ? "bg-info"
                              : "bg-text-tertiary"
                      }`}
                    />
                    <span className="flex-1 truncate text-sm text-text">
                      {task.title}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-text-tertiary">
                        {format(new Date(task.dueDate), "dd/MM")}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Projects */}
        <div className="col-span-1 rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-text">
                Proyectos activos
              </h3>
            </div>
            <Link
              href="/projects"
              className="text-xs text-primary hover:text-primary-hover"
            >
              Ver todos
            </Link>
          </div>

          {!recentProjectRows.length ? (
            <p className="py-4 text-center text-sm text-text-muted">
              Sin proyectos activos
            </p>
          ) : (
            <ul className="space-y-2">
              {recentProjectRows.map(({ project }) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-surface-el"
                  >
                    <span
                      className="h-3 w-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: project.color ?? "#6B5FE4" }}
                    />
                    <span className="flex-1 truncate text-sm text-text">
                      {project.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Payments (admin/manager only) */}
        {isManager && (
          <div className="col-span-1 rounded-xl border border-border bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold text-text">
                  Pagos próximos
                </h3>
              </div>
              <Link
                href="/crm"
                className="text-xs text-primary hover:text-primary-hover"
              >
                Ver CRM
              </Link>
            </div>

            {!upcomingPaymentRows.length ? (
              <p className="py-4 text-center text-sm text-text-muted">
                Sin pagos pendientes
              </p>
            ) : (
              <ul className="space-y-2">
                {upcomingPaymentRows.map(({ payment, client }) => {
                  const isOverdue =
                    payment.status === "overdue" ||
                    (payment.dueDate &&
                      new Date(payment.dueDate) < new Date());
                  return (
                    <li key={payment.id}>
                      <Link
                        href={`/crm/${payment.clientId}/payments`}
                        className="flex items-center justify-between rounded-lg p-2 transition hover:bg-surface-el"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-text">
                            {payment.description}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {client?.companyName}
                          </p>
                        </div>
                        <div className="ml-3 text-right">
                          <p
                            className={`text-sm font-medium ${isOverdue ? "text-danger" : "text-text"}`}
                          >
                            {payment.currency}{" "}
                            {Number(payment.amount).toLocaleString()}
                          </p>
                          {payment.dueDate && (
                            <p
                              className={`text-xs ${isOverdue ? "text-danger" : "text-text-tertiary"}`}
                            >
                              {format(new Date(payment.dueDate), "dd/MM")}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
