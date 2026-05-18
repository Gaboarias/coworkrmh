"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, clientAccounts, payments } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user;
}

export async function createClientRecord(formData: {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  status?: "active" | "inactive" | "prospect";
  bucketId?: string;
}) {
  const user = await requireUser();
  const [client] = await db
    .insert(clients)
    .values({ ...formData, bucketId: formData.bucketId ?? null, createdBy: user.id })
    .returning();
  if (formData.bucketId) revalidatePath(`/operations/${formData.bucketId}/clients`);
  revalidatePath("/crm");
  return client;
}

export async function listClientsForBucket(bucketId: string) {
  await requireUser();
  return db
    .select()
    .from(clients)
    .where(eq(clients.bucketId, bucketId))
    .orderBy(asc(clients.companyName));
}

export async function listPaymentsForBucket(bucketId: string) {
  await requireUser();
  return db
    .select({
      id: payments.id,
      clientId: payments.clientId,
      companyName: clients.companyName,
      description: payments.description,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      dueDate: payments.dueDate,
      paidAt: payments.paidAt,
    })
    .from(payments)
    .innerJoin(clients, eq(payments.clientId, clients.id))
    .where(eq(clients.bucketId, bucketId))
    .orderBy(asc(payments.dueDate));
}

export async function updateClientRecord(
  clientId: string,
  updates: {
    companyName?: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
    status?: "active" | "inactive" | "prospect";
  }
) {
  await db.update(clients).set({ ...updates, updatedAt: new Date() }).where(eq(clients.id, clientId));
  revalidatePath("/crm");
  revalidatePath(`/crm/${clientId}`);
}

export async function createPayment(formData: {
  clientId: string;
  projectId?: string;
  description: string;
  amount: number;
  currency?: string;
  dueDate?: string;
  status?: "pending" | "paid" | "overdue" | "cancelled";
}) {
  const user = await requireUser();
  const [payment] = await db
    .insert(payments)
    .values({
      clientId: formData.clientId,
      projectId: formData.projectId ?? null,
      description: formData.description,
      amount: String(formData.amount),
      currency: formData.currency ?? "USD",
      dueDate: formData.dueDate ?? null,
      status: formData.status ?? "pending",
      createdBy: user.id,
    })
    .returning();
  revalidatePath(`/crm/${formData.clientId}/payments`);
  return payment;
}

export async function updatePaymentStatus(
  paymentId: string,
  clientId: string,
  status: "pending" | "paid" | "overdue" | "cancelled"
) {
  await db
    .update(payments)
    .set({
      status,
      paidAt: status === "paid" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId));
  revalidatePath(`/crm/${clientId}/payments`);
  revalidatePath("/dashboard");
}

export async function addClientAccount(formData: {
  clientId: string;
  bankName?: string;
  accountNumber: string;
  accountType?: string;
  currency?: string;
  isPrimary?: boolean;
}) {
  const [account] = await db.insert(clientAccounts).values(formData).returning();
  revalidatePath(`/crm/${formData.clientId}/accounts`);
  return account;
}
