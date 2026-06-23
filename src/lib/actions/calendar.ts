"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** Desconecta el calendario del usuario actual (borra tokens). */
export async function disconnectCalendar() {
  const session = await auth();
  if (!session) throw new Error("No autorizado");
  await db
    .delete(calendarConnections)
    .where(eq(calendarConnections.userId, session.user.id));
  revalidatePath("/settings");
  revalidatePath("/calendar");
}
