/**
 * Validación de uploads compartida por los endpoints de subida
 * (/api/documents/upload, /api/reports/upload). Centraliza el allowlist de
 * MIME y el límite de tamaño para que no se desincronicen entre rutas.
 */

// Cap práctico del body de las Vercel Functions (~4.5 MB). Dejamos 4 MB.
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED_PREFIXES = ["image/", "video/", "audio/"];
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
  if (ALLOWED_PREFIXES.some((p) => m.startsWith(p))) return true;
  return ALLOWED_EXACT.has(m);
}
