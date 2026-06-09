"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clientReports } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { requireProjectAccess } from "@/lib/workspace";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientReportRow {
  id: string;
  projectId: string;
  clientId: string | null;
  title: string;
  description: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  reportDate: string | null;
  isPublished: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function toRow(r: typeof clientReports.$inferSelect): ClientReportRow {
  return {
    id: r.id,
    projectId: r.projectId,
    clientId: r.clientId ?? null,
    title: r.title,
    description: r.description ?? null,
    fileUrl: r.fileUrl ?? null,
    mimeType: r.mimeType ?? null,
    sizeBytes: r.sizeBytes ?? null,
    reportDate: r.reportDate ?? null,
    isPublished: r.isPublished,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Crea un nuevo reporte para el proyecto. */
export async function createClientReport(input: {
  projectId: string;
  clientId?: string | null;
  title: string;
  description?: string;
  fileUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  reportDate?: string;
}): Promise<ClientReportRow> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  await requireProjectAccess(input.projectId);

  const [row] = await db
    .insert(clientReports)
    .values({
      projectId: input.projectId,
      clientId: input.clientId ?? null,
      title: input.title,
      description: input.description ?? null,
      fileUrl: input.fileUrl ?? null,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
      reportDate: input.reportDate ?? null,
      isPublished: false,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath(`/projects/${input.projectId}/reports`);
  return toRow(row);
}

/** Lista los reportes de un proyecto. */
export async function listClientReports(
  projectId: string
): Promise<ClientReportRow[]> {
  await requireProjectAccess(projectId);

  const rows = await db
    .select()
    .from(clientReports)
    .where(eq(clientReports.projectId, projectId))
    .orderBy(desc(clientReports.createdAt));

  return rows.map(toRow);
}

/** Publica un reporte (visible en el portal del cliente). */
export async function publishReport(
  reportId: string,
  projectId: string
): Promise<void> {
  await requireProjectAccess(projectId);

  await db
    .update(clientReports)
    .set({ isPublished: true, updatedAt: new Date() })
    .where(
      and(
        eq(clientReports.id, reportId),
        eq(clientReports.projectId, projectId)
      )
    );

  revalidatePath(`/projects/${projectId}/reports`);
}

/** Despublica un reporte (deja de verse en el portal). */
export async function unpublishReport(
  reportId: string,
  projectId: string
): Promise<void> {
  await requireProjectAccess(projectId);

  await db
    .update(clientReports)
    .set({ isPublished: false, updatedAt: new Date() })
    .where(
      and(
        eq(clientReports.id, reportId),
        eq(clientReports.projectId, projectId)
      )
    );

  revalidatePath(`/projects/${projectId}/reports`);
}

/** Elimina un reporte. Solo admin/manager puede eliminar. */
export async function deleteClientReport(
  reportId: string,
  projectId: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  const role = session.user.role as string;
  if (role !== "admin" && role !== "manager") {
    throw new Error("Solo admin o manager puede eliminar reportes");
  }
  await requireProjectAccess(projectId);

  await db
    .delete(clientReports)
    .where(
      and(
        eq(clientReports.id, reportId),
        eq(clientReports.projectId, projectId)
      )
    );

  revalidatePath(`/projects/${projectId}/reports`);
}

/**
 * Reportes publicados para un cliente específico.
 * Usado en el portal (sin NextAuth — el token de la URL es el gate).
 */
export async function listPublishedReportsForClient(
  clientId: string
): Promise<ClientReportRow[]> {
  const rows = await db
    .select()
    .from(clientReports)
    .where(
      and(
        eq(clientReports.clientId, clientId),
        eq(clientReports.isPublished, true)
      )
    )
    .orderBy(desc(clientReports.reportDate), desc(clientReports.createdAt));

  return rows.map(toRow);
}
