"use server";

import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "./guards";

/** Desconecta el calendario del usuario actual (borra tokens). */
export async function disconnectCalendar() {
  const user = await requireUser();
  await db
    .delete(calendarConnections)
    .where(eq(calendarConnections.userId, user.id));
  revalidatePath("/settings");
  revalidatePath("/calendar");
}
