/**
 * Cron: scan tasks con dueDate próxima (<48h) y dispara notifications
 * tipo `task_due_soon` al assignee, evitando duplicados en últimas 24h.
 *
 * Schedule: ver vercel.json — diario a las 12:00 UTC (9:00 AM Argentina).
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}` (Vercel lo agrega
 * automáticamente para cron jobs internos; en local pasar el secret).
 *
 * Idempotencia: query previa cuenta cuántas notifications tipo
 * task_due_soon existen para ese (userId, taskId) en últimas 24h.
 * Si > 0, skip — evita re-notificar si el cron corre dos veces el
 * mismo día (manual + automático) o si una tarea sigue vencida.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { tasks, projects, notifications } from "@/lib/db/schema";
import { and, eq, gte, isNotNull, lte, ne, sql } from "drizzle-orm";
import { createNotification } from "@/lib/actions/notifications";

/** Comparación de strings en tiempo constante para evitar timing attacks. */
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export const dynamic = "force-dynamic";

const ALERT_WINDOW_HOURS = 48; // tareas que vencen en próximas 48h
const DEDUP_WINDOW_HOURS = 24; // ventana de dedup por user+task

export async function GET(request: Request) {
  // Vercel agrega este header automáticamente en cron invocations.
  // En manual testing pasarlo via curl con el CRON_SECRET.
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado en env" },
      { status: 500 }
    );
  }
  if (!authHeader || !safeEqual(authHeader, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + ALERT_WINDOW_HOURS * 3600 * 1000);
  const dedupCutoff = new Date(
    now.getTime() - DEDUP_WINDOW_HOURS * 3600 * 1000
  );

  // Query: tareas asignadas con dueDate dentro de la ventana, no done.
  const dueTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      assigneeId: tasks.assigneeId,
      projectId: tasks.projectId,
      projectName: projects.name,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        isNotNull(tasks.assigneeId),
        isNotNull(tasks.dueDate),
        gte(tasks.dueDate, now.toISOString().slice(0, 10)),
        lte(tasks.dueDate, windowEnd.toISOString().slice(0, 10)),
        ne(tasks.status, "done")
      )
    );

  const results: Array<{
    taskId: string;
    title: string;
    assigneeId: string;
    notified: boolean;
    reason?: string;
  }> = [];

  for (const task of dueTasks) {
    if (!task.assigneeId) continue;

    // Dedup: verificar si ya hay una notification para este (user, taskId)
    // en últimas DEDUP_WINDOW_HOURS.
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, task.assigneeId),
          eq(notifications.type, "task_due_soon"),
          gte(notifications.createdAt, dedupCutoff),
          sql`(${notifications.payload}->'refs'->>'taskId') = ${task.id}`
        )
      );

    if (count > 0) {
      results.push({
        taskId: task.id,
        title: task.title,
        assigneeId: task.assigneeId,
        notified: false,
        reason: "already-notified-24h",
      });
      continue;
    }

    await createNotification({
      userId: task.assigneeId,
      type: "task_due_soon",
      payload: {
        title: "Tarea próxima a vencer",
        body: `${task.title} — ${task.projectName ?? "proyecto"} · vence ${task.dueDate}`,
        refs: { taskId: task.id, projectId: task.projectId ?? "" },
      },
      href: task.projectId ? `/projects/${task.projectId}` : "/my-tasks",
    });

    results.push({
      taskId: task.id,
      title: task.title,
      assigneeId: task.assigneeId,
      notified: true,
    });
  }

  return NextResponse.json({
    ok: true,
    scannedAt: now.toISOString(),
    windowEndsAt: windowEnd.toISOString(),
    tasksFound: dueTasks.length,
    notified: results.filter((r) => r.notified).length,
    skipped: results.filter((r) => !r.notified).length,
    results,
  });
}
