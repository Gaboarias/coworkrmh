"use server";

import { db } from "@/lib/db";
import {
  tasks,
  projects,
  erpSales,
  erpExpenses,
  erpQuotes,
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

  // Active projects
  const [{ activeProjects }] = await db
    .select({ activeProjects: sql<number>`count(*)::int` })
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, ws.id),
        sql`${projects.status} NOT IN ('archived', 'descartado')`
      )
    );

  // Active + completed tasks (this workspace's projects)
  const [{ activeTasks }] = await db
    .select({ activeTasks: sql<number>`count(*)::int` })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(projects.workspaceId, ws.id),
        sql`${tasks.status} != 'done'`
      )
    );

  const [{ completedLast30 }] = await db
    .select({ completedLast30: sql<number>`count(*)::int` })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(projects.workspaceId, ws.id),
        sql`${tasks.status} = 'done'`,
        gte(tasks.completedAt, THIRTY_DAYS_AGO())
      )
    );

  // Tasks by status
  const tasksByStatusRows = await db
    .select({
      status: tasks.status,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(projects.workspaceId, ws.id))
    .groupBy(tasks.status);

  // Pending quotes (sent or draft)
  const [{ pendingQuotes }] = await db
    .select({ pendingQuotes: sql<number>`count(*)::int` })
    .from(erpQuotes)
    .where(
      and(
        eq(erpQuotes.workspaceId, ws.id),
        sql`${erpQuotes.status} IN ('draft','sent')`
      )
    );

  // Sales last 30 days. erpSales.{qty, unitPrice} son numeric(12,2) y guardan
  // valores reales (no centavos escalados). Antes este SUM tenía /10000 — bug
  // que mostraba ventas 10.000× más chicas. Lo mismo con gastos /100.
  const [salesAgg] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${erpSales.qty}::numeric * ${erpSales.unitPrice}::numeric), 0)::text`,
    })
    .from(erpSales)
    .where(
      and(
        eq(erpSales.workspaceId, ws.id),
        gte(erpSales.saleDate, THIRTY_DAYS_AGO_DATE_STR())
      )
    );
  const salesLast30 = Number(salesAgg?.total ?? 0);

  // Expenses last 30 days
  const [expAgg] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${erpExpenses.amount}::numeric), 0)::text`,
    })
    .from(erpExpenses)
    .where(
      and(
        eq(erpExpenses.workspaceId, ws.id),
        gte(erpExpenses.createdAt, THIRTY_DAYS_AGO())
      )
    );
  const expensesLast30 = Number(expAgg?.total ?? 0);

  // Sales by category (current month)
  const salesByCategoryRows = await db
    .select({
      category: erpSales.category,
      total: sql<string>`COALESCE(SUM(${erpSales.qty}::numeric * ${erpSales.unitPrice}::numeric), 0)::text`,
    })
    .from(erpSales)
    .where(
      and(
        eq(erpSales.workspaceId, ws.id),
        gte(erpSales.saleDate, THIRTY_DAYS_AGO_DATE_STR())
      )
    )
    .groupBy(erpSales.category)
    .orderBy(desc(sql`SUM(${erpSales.qty}::numeric * ${erpSales.unitPrice}::numeric)`));

  // Top contributors: assignees con más done tasks en 30 días. 1 query con
  // INNER JOIN users (antes hacíamos 2: group-by + resolución de nombres).
  const { users } = await import("@/lib/db/schema");
  const topContributorsRows = await db
    .select({
      userId: tasks.assigneeId,
      name: users.name,
      completedTasks: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .innerJoin(users, eq(users.id, tasks.assigneeId))
    .where(
      and(
        eq(projects.workspaceId, ws.id),
        sql`${tasks.status} = 'done'`,
        gte(tasks.completedAt, THIRTY_DAYS_AGO())
      )
    )
    .groupBy(tasks.assigneeId, users.name)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

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

