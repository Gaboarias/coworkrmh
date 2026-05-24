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
  return NextResponse.json({
    present: tok.length > 0,
    length: tok.length,
    // Primeros 33 chars = "vercel_blob_rw_" (15) + storeId (~18). El storeId
    // no es secreto. El secreto es la parte después del último "_".
    prefix: tok.slice(0, 33),
    startsCorrect: tok.startsWith("vercel_blob_rw_"),
    // Estructura esperada: "vercel_blob_rw_<storeId>_<secret>"
    parts: tok.split("_").length,
    expectedLength: "~76",
    // Vars relacionadas que Vercel suele setear junto al Blob
    hasUrl: !!process.env.BLOB_URL,
    nodeEnv: process.env.NODE_ENV,
  });
}
