import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const projectId = formData.get("projectId") as string;
  const taskId = (formData.get("taskId") as string) || null;

  if (!file || !projectId) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo excede el límite de 50MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop();
  const filename = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(filename, file, {
    access: "public",
    contentType: file.type,
  });

  const [doc] = await db
    .insert(documents)
    .values({
      projectId,
      taskId,
      name: file.name,
      blobUrl: blob.url,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedBy: session.user.id,
    })
    .returning();

  return NextResponse.json({ document: doc });
}
