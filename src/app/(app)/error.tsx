"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/Button";
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
        <Button onClick={reset}>Reintentar</Button>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
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
