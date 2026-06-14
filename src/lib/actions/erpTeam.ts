"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { erpTeam, workspaces } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { ER, requireWs, requireWsCan } from "./erp.helpers";

export interface TeamMemberRow {
  id: string;
  name: string;
  role: string | null;
  responsibilities: string | null;
  compensation: string | null;
  status: string;
}

export const getTeam = async (): Promise<{
  members: TeamMemberRow[];
  agreements: string;
}> => {
  const { ws } = await requireWs();
  const [members, [wsRow]] = await Promise.all([
    db
      .select()
      .from(erpTeam)
      .where(eq(erpTeam.workspaceId, ws.id))
      .orderBy(asc(erpTeam.sortOrder), asc(erpTeam.name))
      .limit(500),
    db
      .select({ a: workspaces.teamAgreements })
      .from(workspaces)
      .where(eq(workspaces.id, ws.id))
      .limit(1),
  ]);
  return {
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      responsibilities: m.responsibilities,
      compensation: m.compensation,
      status: m.status,
    })),
    agreements: wsRow?.a ?? "",
  };
};

export const createTeamMember = async (input: {
  name: string;
  role?: string;
  responsibilities?: string;
  compensation?: string;
  status?: string;
}) => {
  if (!input.name.trim()) throw new Error("El nombre es obligatorio");
  const { ws } = await requireWsCan("team.manage");
  await db.insert(erpTeam).values({
    workspaceId: ws.id,
    name: input.name.trim(),
    role: input.role?.trim() || null,
    responsibilities: input.responsibilities?.trim() || null,
    compensation: input.compensation?.trim() || null,
    status: input.status ?? "active",
  });
  revalidatePath(`${ER}/equipo`);
};

export const updateTeamMember = async (
  id: string,
  input: {
    name: string;
    role?: string;
    responsibilities?: string;
    compensation?: string;
    status?: string;
  }
) => {
  const { ws } = await requireWsCan("team.manage");
  await db
    .update(erpTeam)
    .set({
      name: input.name.trim(),
      role: input.role?.trim() || null,
      responsibilities: input.responsibilities?.trim() || null,
      compensation: input.compensation?.trim() || null,
      status: input.status ?? "active",
    })
    .where(and(eq(erpTeam.id, id), eq(erpTeam.workspaceId, ws.id)));
  revalidatePath(`${ER}/equipo`);
};

export const deleteTeamMember = async (id: string) => {
  const { ws } = await requireWsCan("team.manage");
  await db
    .delete(erpTeam)
    .where(and(eq(erpTeam.id, id), eq(erpTeam.workspaceId, ws.id)));
  revalidatePath(`${ER}/equipo`);
};

export const setAgreements = async (text: string) => {
  const { ws } = await requireWsCan("team.manage");
  await db
    .update(workspaces)
    .set({ teamAgreements: text, updatedAt: new Date() })
    .where(eq(workspaces.id, ws.id));
  revalidatePath(`${ER}/equipo`);
};
