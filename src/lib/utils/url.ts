/**
 * Helpers de URL. Vive en lib (y no dentro del route handler) para poder
 * testearlo: los archivos route.ts de Next sólo admiten exports de handler.
 */

/**
 * ¿Es `next` una ruta interna segura? Devuelve la ruta, o el fallback si el
 * valor intenta salir del origin.
 *
 * `startsWith("/")` NO alcanza: "//evil.com" también empieza con "/" y
 * `new URL("//evil.com", origin)` resuelve a "https://evil.com/" (URL
 * protocol-relative) — open redirect. Lo mismo con "/\evil.com", que algunos
 * navegadores normalizan a "//". Se resuelve contra el origin y se confirma
 * que no se haya escapado.
 */
export function safeInternalPath(
  next: string | null | undefined,
  base: URL,
  fallback = "/dashboard"
): string {
  if (!next || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  try {
    const resolved = new URL(next, base);
    if (resolved.origin !== base.origin) return fallback;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return fallback;
  }
}
