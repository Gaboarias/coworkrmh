/**
 * Validación de uploads compartida por los endpoints de subida
 * (/api/documents/upload, /api/reports/upload). Centraliza el allowlist de
 * MIME, el límite de tamaño y el mapeo de errores para que no se
 * desincronicen entre rutas.
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Cap práctico del body de las Vercel Functions (~4.5 MB). Dejamos 4 MB.
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED_PREFIXES = ["image/", "video/", "audio/"];

/**
 * Tipos que caen dentro de un prefijo permitido pero se bloquean igual.
 *
 * El MIME lo manda el cliente (`file.type` del FormData) y se reusa como
 * `contentType` del blob, así que declarar "image/svg+xml" alcanza para que
 * Vercel Blob sirva el archivo como SVG. Un SVG puede traer <script>, y los
 * blobs son `access: "public"` → XSS almacenado en el dominio de blobs.
 * No hay caso de uso para subir SVG en la app, así que se deniega.
 */
const DENIED_EXACT = new Set<string>([
  "image/svg+xml",
  "image/svg",
]);
const ALLOWED_EXACT = new Set<string>([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
]);

/** True si el MIME está permitido (prefijo imagen/video/audio o tipo exacto). */
export function isMimeAllowed(m: string): boolean {
  if (!m) return false;
  // Normaliza: "image/svg+xml; charset=utf-8" → "image/svg+xml".
  const type = m.split(";")[0].trim().toLowerCase();
  if (DENIED_EXACT.has(type)) return false;
  if (ALLOWED_PREFIXES.some((p) => type.startsWith(p))) return true;
  return ALLOWED_EXACT.has(type);
}

/**
 * Respuesta de error única para los endpoints de upload.
 *
 * El detalle va al log del servidor; al cliente sólo le llega un mensaje
 * seguro. Antes se devolvía `e.message` crudo, con lo que un error de DB o de
 * Blob se filtraba al navegador. Además mapea los throws de
 * `requireProjectAccess` al status correcto — antes todo salía 400, incluidos
 * los fallos de autorización.
 */
export function uploadErrorResponse(
  scope: string,
  err: unknown
): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`[${scope}] fail`, err);

  if (message === "No autenticado") {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (message.includes("no encontrado")) {
    return NextResponse.json({ error: "Recurso no encontrado" }, { status: 404 });
  }
  if (message.includes("No tenés acceso") || message.includes("No autorizado")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return NextResponse.json(
    { error: "Error al subir el archivo" },
    { status: 400 }
  );
}
