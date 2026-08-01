"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { logger } from "@/lib/logger";

/**
 * Error boundary de la app.
 *
 * Sin esto, cualquier excepción en un Server Component mostraba la pantalla
 * cruda de Next ("Application error: a server-side exception has occurred")
 * con HTTP 200 y cero contexto. Ahora se ve algo usable y con salida, y el
 * digest queda a mano para cruzarlo con los Runtime Logs de Vercel.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[app/error] boundary", error);
  }, [error]);

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow="/ error"
        title="Algo se rompió,"
        subtitle="no fue culpa tuya."
        description="Ocurrió un error inesperado al cargar esta pantalla. Podés reintentar; si sigue pasando, avisá con el código de abajo."
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-rule px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-accent-soft hover:text-ink"
        >
          Ir al resumen
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
          código: {error.digest}
        </p>
      )}
    </div>
  );
}
