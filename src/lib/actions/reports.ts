"use server";

import { db } from "@/lib/db";
import {
  tasks,
  projects,
  taskAssignees,
  erpSales,
  erpExpenses,
  erpQuotes,
  users,
} from "@/lib/db/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { getActiveWorkspace } from "@/lib/workspace";

/**
 * Aggregations para la página /reports (Sunset Aurora · N5).
 *
 * Sólo lecturas, sin schema changes. Todo scoped al workspace activo.
 */

export interface WorkspaceReport {
  workspaceId: string;
  workspaceName: string;
  // KPIs principales
  kpis: {
    activeProjects: number;
    activeTasks: number;
    completedTasksLast30Days: number;
    pendingQuotes: number;
    salesLast30Days: number;
    expensesLast30Days: number;
    netLast30Days: number;
  };
  // Series para gráficos
  tasksByStatus: { status: string; count: number }[];
  salesByCategory: { category: string; total: number }[];
  // Top contributors
  topContributors: {
    userId: string;
    name: string | null;
    completedTasks: number;
  }[];
}

const THIRTY_DAYS_AGO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
};
const THIRTY_DAYS_AGO_DATE_STR = () => {
  const d = THIRTY_DAYS_AGO();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD para columnas date
};

export async function getWorkspaceReport(): Promise<WorkspaceReport | null> {
  const ws = await getActiveWorkspace();
  if (!ws) return null;

  // Materializar las fechas una vez — evita que cada query llame THIRTY_DAYS_AGO()
  // y cree Date objetos redundantes.
  const thirtyDaysAgo = THIRTY_DAYS_AGO();
  const thirtyDaysAgoStr = THIRTY_DAYS_AGO_DATE_STR();

  // Todos los queries son independientes entre sí → corren en paralelo.
  const [
    [{ activeProjects }],
    [{ activeTasks }],
    [{ completedLast30 }],
    tasksByStatusRows,
    [{ pendingQuotes }],
    [salesAgg],
    [expAgg],
    salesByCategoryRows,
    topContributorsRows,
  ] = await Promise.all([
    // 1. Proyectos activos
    db
      .select({ activeProjects: sql<number>`count(*)::int` })
      .from(projects)
      .where(and(eq(projects.workspaceId, ws.id), sql`${projects.status} = 'active'`)),

    // 2. Tareas activas (no done)
    db
      .select({ activeTasks: sql<number>`count(*)::int` })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(projects.workspaceId, ws.id), sql`${tasks.status} != 'done'`)),

    // 3. Tareas completadas últimos 30 días
    db
      .select({ completedLast30: sql<number>`count(*)::int` })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          eq(projects.workspaceId, ws.id),
          sql`${tasks.status} = 'done'`,
          gte(tasks.completedAt, thirtyDaysAgo)
        )
      ),

    // 4. Tareas por estado
    db
      .select({ status: tasks.status, count: sql<number>`count(*)::int` })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(projects.workspaceId, ws.id))
      .groupBy(tasks.status),

    // 5. Cotizaciones pendientes
    db
      .select({ pendingQuotes: sql<number>`count(*)::int` })
      .from(erpQuotes)
      .where(
        and(eq(erpQuotes.workspaceId, ws.id), sql`${erpQuotes.status} IN ('draft','sent')`)
      ),

    // 6. Ventas últimos 30 días
    // erpSales.{qty, unitPrice} son numeric(12,2) — valores reales, no centavos.
    db
      .select({
        total: sql<string>`COALESCE(SUM(${erpSales.qty}::numeric * ${erpSales.unitPrice}::numeric), 0)::text`,
      })
      .from(erpSales)
      .where(and(eq(erpSales.workspaceId, ws.id), gte(erpSales.saleDate, thirtyDaysAgoStr))),

    // 7. Gastos últimos 30 días
    db
      .select({
        total: sql<string>`COALESCE(SUM(${erpExpenses.amount}::numeric), 0)::text`,
      })
      .from(erpExpenses)
      .where(and(eq(erpExpenses.workspaceId, ws.id), gte(erpExpenses.createdAt, thirtyDaysAgo))),

    // 8. Ventas por categoría (últimos 30 días)
    db
      .select({
        category: erpSales.category,
        total: sql<string>`COALESCE(SUM(${erpSales.qty}::numeric * ${erpSales.unitPrice}::numeric), 0)::text`,
      })
      .from(erpSales)
      .where(and(eq(erpSales.workspaceId, ws.id), gte(erpSales.saleDate, thirtyDaysAgoStr)))
      .groupBy(erpSales.category)
      .orderBy(desc(sql`SUM(${erpSales.qty}::numeric * ${erpSales.unitPrice}::numeric)`)),

    // 9. Top contributors — cuenta por cada asignado (multi-asignado), no solo
    // el responsable primario. JOIN task_assignees → users.
    db
      .select({
        userId: taskAssignees.userId,
        name: users.name,
        completedTasks: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
      .innerJoin(users, eq(users.id, taskAssignees.userId))
      .where(
        and(
          eq(projects.workspaceId, ws.id),
          sql`${tasks.status} = 'done'`,
          gte(tasks.completedAt, thirtyDaysAgo)
        )
      )
      .groupBy(taskAssignees.userId, users.name)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
  ]);

  const salesLast30 = Number(salesAgg?.total ?? 0);
  const expensesLast30 = Number(expAgg?.total ?? 0);

  return {
    workspaceId: ws.id,
    workspaceName: ws.name,
    kpis: {
      activeProjects: activeProjects ?? 0,
      activeTasks: activeTasks ?? 0,
      completedTasksLast30Days: completedLast30 ?? 0,
      pendingQuotes: pendingQuotes ?? 0,
      salesLast30Days: salesLast30,
      expensesLast30Days: expensesLast30,
      netLast30Days: salesLast30 - expensesLast30,
    },
    tasksByStatus: tasksByStatusRows.map((r) => ({
      status: r.status as string,
      count: r.count,
    })),
    salesByCategory: salesByCategoryRows.map((r) => ({
      category: r.category ?? "Sin categoría",
      total: Number(r.total),
    })),
    topContributors: topContributorsRows.map((r) => ({
      userId: r.userId as string,
      name: r.name ?? "Usuario",
      completedTasks: r.completedTasks,
    })),
  };
}

