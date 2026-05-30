import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import { auth } from "@/lib/auth";

// Endpoint TEMPORAL — test server-side de Vercel Blob.
// Sube un archivo de texto de 5 bytes para verificar que el token + store
// están bien configurados, sin pasar por el client upload flow.
// Borrar después del diagnóstico.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const tok = process.env.BLOB_READ_WRITE_TOKEN || "";
  const diag = {
    tokenPresent: tok.length > 0,
    tokenLength: tok.length,
    tokenPrefix: tok.slice(0, 33),
    nodeEnv: process.env.NODE_ENV,
  };

  // Test 1: list() — verifica que el token puede leer el store
  let listResult: { ok: boolean; error?: string; count?: number } = { ok: false };
  try {
    const r = await list({ limit: 5 });
    listResult = { ok: true, count: r.blobs.length };
  } catch (e) {
    listResult = { ok: false, error: (e as Error).message };
  }

  // Test 2: put() — verifica que el token puede escribir
  let putResult: { ok: boolean; error?: string; url?: string } = { ok: false };
  try {
    const blob = await put(
      `_diag/test-${Date.now()}.txt`,
      "hello blob test",
      { access: "public", contentType: "text/plain" }
    );
    putResult = { ok: true, url: blob.url };
  } catch (e) {
    putResult = { ok: false, error: (e as Error).message };
  }

  return NextResponse.json({ diag, listResult, putResult });
}
