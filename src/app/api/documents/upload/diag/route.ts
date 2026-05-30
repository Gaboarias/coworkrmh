import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Endpoint TEMPORAL de diagnóstico — solo accesible para usuarios autenticados.
// Devuelve metadata segura del env var BLOB_READ_WRITE_TOKEN para verificar
// que está correctamente configurado. NO revela el secreto entero.
// Borrar después del fix.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const tok = process.env.BLOB_READ_WRITE_TOKEN || "";
  // Enumerar TODOS los env vars BLOB-relacionados para encontrar el nombre real
  const blobVars = Object.entries(process.env)
    .filter(([k, v]) => v && (
      k.includes("BLOB") ||
      k.endsWith("_READ_WRITE_TOKEN") ||
      (typeof v === "string" && v.startsWith("vercel_blob_"))
    ))
    .map(([k, v]) => ({
      name: k,
      length: (v as string).length,
      prefix: (v as string).slice(0, 33),
    }));
  return NextResponse.json({
    standardEnvVar: {
      name: "BLOB_READ_WRITE_TOKEN",
      present: tok.length > 0,
      length: tok.length,
      prefix: tok.slice(0, 33),
    },
    allBlobEnvVars: blobVars,
    nodeEnv: process.env.NODE_ENV,
  });
}
