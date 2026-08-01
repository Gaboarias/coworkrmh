/**
 * Validación de UUID para params de ruta.
 *
 * Las columnas `id` son `uuid` en Postgres. Si un segmento de URL no es un
 * UUID válido, la comparación revienta con "invalid input syntax for type
 * uuid" y Next muestra un "Application error: a server-side exception has
 * occurred" con HTTP 200, en vez de un 404 limpio. Filtrar antes de consultar
 * convierte ese crash en el notFound() que corresponde.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: string | null | undefined): boolean =>
  typeof v === "string" && UUID_RE.test(v);
