"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function deleteDocument(
  documentId: string,
  blobUrl: string,
  projectId: string
) {
  await del(blobUrl);
  await db.delete(documents).where(eq(documents.id, documentId));
  revalidatePath(`/projects/${projectId}/documents`);
}
