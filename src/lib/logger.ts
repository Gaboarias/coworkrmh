/**
 * Logger mínimo.
 *
 * `error` y `warn` loguean SIEMPRE, producción incluida — es donde hacen falta.
 * Vercel captura stdout/stderr de las functions en los Runtime Logs, así que
 * un console.error en prod es exactamente lo que se quiere ver cuando algo
 * falla. (Antes esto estaba condicionado a NODE_ENV === "development", con lo
 * cual todos los catch quedaban mudos justo en producción.)
 *
 * `debug` sí queda restringido a desarrollo: es ruido en prod.
 */

const isDev = process.env.NODE_ENV === "development";

/** Normaliza el contexto: un Error se serializa a name/message/stack. */
function normalize(ctx: unknown): unknown {
  if (ctx instanceof Error) {
    return { name: ctx.name, message: ctx.message, stack: ctx.stack };
  }
  return ctx;
}

export const logger = {
  error: (msg: string, ctx?: unknown) => {
    if (ctx === undefined) console.error(msg);
    else console.error(msg, normalize(ctx));
  },
  warn: (msg: string, ctx?: unknown) => {
    if (ctx === undefined) console.warn(msg);
    else console.warn(msg, normalize(ctx));
  },
  debug: (msg: string, ctx?: unknown) => {
    if (!isDev) return;
    if (ctx === undefined) console.debug(msg);
    else console.debug(msg, normalize(ctx));
  },
};
