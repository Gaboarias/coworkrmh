/**
 * Formato de fechas/horas unificado.
 *
 * Costa Rica = UTC-6 sin DST. Los timestamps en DB son UTC; los date-only
 * (saleDate, etc.) son YYYY-MM-DD sin TZ. Si no forzamos `timeZone` en el
 * formateo, cada usuario ve hora del navegador — un usuario en Buenos Aires
 * (UTC-3) vería las fechas 3 horas adelantadas, lo que en sales registradas
 * cerca de medianoche CR puede desplazar el día calendario completo.
 *
 * Por eso fijamos `America/Costa_Rica` en todos los renders de fechas
 * históricas / business. Para "hace cuánto" relativo dejamos hora del cliente
 * (es la lectura natural del usuario).
 */

const CR_TZ = "America/Costa_Rica";
const CR_LOCALE = "es-CR";

// Cache de formateadores Intl — la construcción de cada instancia parsea
// locale + TZ data y es costosa. Reusar instancias en vez de crearlas en
// cada llamada a formatDateCR / todayYmdCR.
const _fmtCache = new Map<string, Intl.DateTimeFormat>();
function _fmt(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(opts)}`;
  let f = _fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, opts);
    _fmtCache.set(key, f);
  }
  return f;
}

// Formateadores de uso frecuente pre-calentados al importar el módulo.
const _dateFmt   = _fmt(CR_LOCALE, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: CR_TZ });
const _todayFmt  = _fmt("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: CR_TZ });

/**
 * Date YYYY-MM-DD (saleDate, dueDate) — render fecha calendario en CR.
 *
 * Default = DD/MM/YYYY (formato único de la app, sin excepción).
 *
 * IMPORTANTE: si la entrada es "2026-06-01" (string sin TZ), `new Date()` la
 * parsea como medianoche UTC. En CR son las 18:00 del día anterior. Para que
 * "2026-06-01" siga mostrándose como 01/06/2026 en pantalla, anclamos los
 * date-only a mediodía UTC antes de reproyectar a CR (UTC-6).
 */
export function formatDateCR(
  value: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }
): string {
  if (value == null || value === "") return "";
  const d =
    typeof value === "string"
      ? // Date-only string → anclar a mediodía UTC para evitar shift a día previo en TZ negativas.
        value.length === 10
        ? new Date(value + "T12:00:00Z")
        : new Date(value)
      : value;
  if (Number.isNaN(d.getTime())) return "";
  // Usar el formatter default pre-calentado cuando se llama con defaults,
  // o buscar en cache para opciones custom.
  const isDefault =
    opts.day === "2-digit" && opts.month === "2-digit" && opts.year === "numeric" &&
    !opts.hour && !opts.minute;
  return (isDefault ? _dateFmt : _fmt(CR_LOCALE, { ...opts, timeZone: CR_TZ })).format(d);
}

/** Fecha + hora corta en CR: DD/MM/YYYY HH:mm. */
export function formatDateTimeCR(value: string | Date | null | undefined): string {
  return formatDateCR(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Solo hora HH:mm en CR. */
export function formatTimeCR(value: string | Date | null | undefined): string {
  return formatDateCR(value, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * Devuelve la fecha calendario "YYYY-MM-DD" del día corriente EN COSTA RICA.
 *
 * Por qué existe: `new Date()` en el server de Vercel (UTC) NO es el mismo
 * día calendario que en CR. A las 6pm CR del lunes ya son las 00:00 UTC del
 * martes — y `format(new Date(), "EEEE")` server-side decía "martes". Bug
 * crítico observado en /dashboard y en `isOverdue`.
 *
 * Esta función reproyecta el `Date` instantáneo a CR vía Intl y devuelve
 * solo la parte de fecha. Útil para comparar contra dueDates (también
 * YYYY-MM-DD) por orden lexicográfico (ISO date format).
 */
export function todayYmdCR(): string {
  // en-CA produce "YYYY-MM-DD" — el único locale estándar que lo formatea así.
  // Usa el formatter pre-calentado (_todayFmt) — nunca crea uno nuevo.
  return _todayFmt.format(new Date());
}

/**
 * ¿Es la fecha (YYYY-MM-DD) anterior al día calendario actual en CR?
 *
 * Usar para isOverdue de tareas/pagos. La comparación lexicográfica de
 * ISO date strings funciona porque ambos lados son "YYYY-MM-DD".
 */
export function isPastDateCR(ymd: string | null | undefined): boolean {
  if (!ymd) return false;
  // Si la entrada es un timestamp, normalizar a YYYY-MM-DD en CR primero.
  const onlyDate = ymd.length === 10 ? ymd : formatDateCR(ymd, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).split("/").reverse().join("-");
  return onlyDate < todayYmdCR();
}
