"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clients, clientProjects, payments, projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getAppUrl, sendPortalInviteEmail } from "@/lib/email";
import { createClientSchema } from "@/lib/validation/actions";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  if (session.user.role !== "admin") throw new Error("No autorizado");
  return session.user;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientRow {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  status: "active" | "inactive" | "prospect";
  portalToken: string | null;
  createdAt: string;
}

export interface ClientProject {
  id: string;
  name: string;
  status: string;
}

export interface ClientPayment {
  id: string;
  description: string;
  amount: string;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Lista todos los clientes del workspace activo. Admin/manager only. */
export async function listClients(): Promise<ClientRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  if (
    session.user.role !== "admin" &&
    session.user.role !== "manager"
  ) {
    throw new Error("Permisos insuficientes");
  }

  const rows = await db
    .select({
      id: clients.id,
      companyName: clients.companyName,
      contactName: clients.contactName,
      email: clients.email,
      phone: clients.phone,
      status: clients.status,
      portalToken: clients.portalToken,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .orderBy(desc(clients.createdAt));

  return rows.map((r) => ({
    id: r.id,
    companyName: r.companyName,
    contactName: r.contactName,
    email: r.email,
    phone: r.phone,
    status: r.status,
    portalToken: r.portalToken ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Devuelve los proyectos vinculados a un cliente. */
export async function listClientProjects(
  clientId: string
): Promise<ClientProject[]> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const rows = await db
    .select({ id: projects.id, name: projects.name, status: projects.status })
    .from(clientProjects)
    .innerJoin(projects, eq(projects.id, clientProjects.projectId))
    .where(eq(clientProjects.clientId, clientId));

  return rows.map((r) => ({ id: r.id, name: r.name, status: r.status }));
}

/** Devuelve los pagos del cliente. */
export async function listClientPayments(
  clientId: string
): Promise<ClientPayment[]> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.clientId, clientId))
    .orderBy(desc(payments.createdAt));

  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    amount: r.amount,
    currency: r.currency,
    status: r.status,
    dueDate: r.dueDate ?? null,
    paidAt: r.paidAt?.toISOString() ?? null,
  }));
}

// ─── Portal token ─────────────────────────────────────────────────────────────

/**
 * Genera (o retorna existente) el portal token de un cliente.
 * Solo admin puede generar tokens.
 */
export async function generatePortalToken(
  clientId: string
): Promise<{ token: string; url: string }> {
  await requireAdmin();

  // Si ya tiene token, retornar sin regenerar.
  const [existing] = await db
    .select({ portalToken: clients.portalToken })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!existing) throw new Error("Cliente no encontrado");

  if (existing.portalToken) {
    const url = `${getAppUrl()}/portal/${existing.portalToken}`;
    return { token: existing.portalToken, url };
  }

  // Generar token nuevo (UUID v4 via Postgres gen_random_uuid no disponible
  // desde JS; usamos crypto.randomUUID() del runtime Node 18+).
  const token = crypto.randomUUID();

  await db
    .update(clients)
    .set({ portalToken: token })
    .where(eq(clients.id, clientId));

  revalidatePath("/clients");
  const url = `${getAppUrl()}/portal/${token}`;
  return { token, url };
}

/**
 * Revoca el portal token de un cliente (acceso revocado inmediatamente).
 * Genera uno nuevo vacío — el admin puede generar uno nuevo después.
 */
export async function revokePortalToken(clientId: string): Promise<void> {
  await requireAdmin();
  await db
    .update(clients)
    .set({ portalToken: null })
    .where(eq(clients.id, clientId));
  revalidatePath("/clients");
}

/**
 * Genera token (si no existe) y envía el link por email al cliente.
 * Requiere que el cliente tenga email registrado.
 */
export async function sendPortalInvite(clientId: string): Promise<void> {
  await requireAdmin();

  const { token, url } = await generatePortalToken(clientId);
  void token; // solo necesitamos la URL

  const [client] = await db
    .select({ email: clients.email, companyName: clients.companyName })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client?.email) throw new Error("El cliente no tiene email registrado");

  await sendPortalInviteEmail({
    to: client.email,
    companyName: client.companyName,
    portalUrl: url,
  });
}

// ─── CRUD básico ─────────────────────────────────────────────────────────────

export async function createClient(input: {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
}): Promise<ClientRow> {
  createClientSchema.parse(input);
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const [row] = await db
    .insert(clients)
    .values({
      companyName: input.companyName,
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/clients");
  return {
    id: row.id,
    companyName: row.companyName,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    status: row.status,
    portalToken: row.portalToken ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Vincula un cliente a un proyecto. */
export async function linkClientToProject(
  clientId: string,
  projectId: string
): Promise<void> {
  await requireAdmin();
  await db
    .insert(clientProjects)
    .values({ clientId, projectId })
    .onConflictDoNothing();
  revalidatePath("/clients");
}

/** Desvincula un cliente de un proyecto. */
export async function unlinkClientFromProject(
  clientId: string,
  projectId: string
): Promise<void> {
  await requireAdmin();
  await db
    .delete(clientProjects)
    .where(
      eq(clientProjects.clientId, clientId) &&
      eq(clientProjects.projectId, projectId)
    );
  revalidatePath("/clients");
}

// ─── Portal data (sin auth — solo token como gate) ────────────────────────────

/**
 * Devuelve los datos del portal para un token dado.
 * NO requiere NextAuth — el token es el gate.
 * Retorna null si el token es inválido.
 */
export async function getPortalDataByToken(token: string): Promise<{
  client: { id: string; companyName: string; contactName: string | null };
  projects: ClientProject[];
  payments: ClientPayment[];
} | null> {
  const [client] = await db
    .select({
      id: clients.id,
      companyName: clients.companyName,
      contactName: clients.contactName,
    })
    .from(clients)
    .where(eq(clients.portalToken, token))
    .limit(1);

  if (!client) return null;

  const [projectRows, paymentRows] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name, status: projects.status })
      .from(clientProjects)
      .innerJoin(projects, eq(projects.id, clientProjects.projectId))
      .where(eq(clientProjects.clientId, client.id)),
    db
      .select()
      .from(payments)
      .where(eq(payments.clientId, client.id))
      .orderBy(desc(payments.createdAt)),
  ]);

  return {
    client,
    projects: projectRows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
    })),
    payments: paymentRows.map((r) => ({
      id: r.id,
      description: r.description,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      dueDate: r.dueDate ?? null,
      paidAt: r.paidAt?.toISOString() ?? null,
    })),
  };
}
