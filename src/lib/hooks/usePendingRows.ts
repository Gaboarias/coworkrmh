"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

/**
 * La contracara de `useOptimisticList`: para las vistas donde adivinar el
 * resultado sería mentir.
 *
 * Ventas, Gastos y Clientes muestran sus filas junto a totales que calcula el
 * servidor —ventas totales, ganancia, punto de equilibrio, saldos—. Sacar una
 * fila al instante deja esos totales sin mover, y la pantalla queda afirmando
 * números que no cuadran entre sí. En una vista de plata eso es peor que
 * esperar: la espera se entiende, un total que no cierra se cree.
 *
 * Recalcular los agregados en el cliente tampoco sirve: duplicaría en el
 * navegador aritmética que ya vive en el servidor, que es justo la segunda
 * fuente de verdad que este rediseño viene sacando.
 *
 * Así que acá no se adivina: se hace legible la espera. La fila en vuelo se
 * marca y se desactiva —el clic registró, nadie lo aprieta dos veces— y
 * mientras haya algo en vuelo los totales dejan de afirmar su número.
 *
 * Que la latencia siga existiendo no es el fallo. El fallo sería que no se vea.
 */
export function usePendingRows() {
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const router = useRouter();

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (
      id: string,
      action: () => Promise<unknown>,
      opts: { success?: string; error?: string } = {}
    ): Promise<boolean> => {
      // Sin esta guarda, un doble clic dispara dos borrados: el segundo llega
      // cuando la fila ya no existe y el servidor devuelve un error que el
      // usuario no puede interpretar.
      if (pending.has(id)) return false;

      setPending((s) => new Set(s).add(id));
      try {
        await action();
        if (opts.success) toast.success(opts.success);
        router.refresh();
        return true;
      } catch (err) {
        if (mounted.current) {
          toast.error(opts.error ?? (err as Error).message);
        }
        return false;
      } finally {
        // Se limpia aunque el componente esté desmontado: `setPending` sobre un
        // componente muerto es no-op en React 18, y saltearlo dejaría el id
        // trabado si el árbol se vuelve a montar con el mismo estado.
        setPending((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }
    },
    [pending, router]
  );

  return {
    /** ¿Esta fila tiene una acción en vuelo? */
    isPending: (id: string) => pending.has(id),
    /** ¿Hay algo en vuelo? Los agregados dejan de afirmar mientras sea true. */
    busy: pending.size > 0,
    run,
  };
}

/**
 * Tratamiento visual de una fila en vuelo. Se esparce sobre el elemento:
 *
 *     <div {...pendingRow(isPending(r.id), "flex items-center px-4")}>
 *
 * Toma la clase base para no obligar al caller a componerla por su cuenta —
 * hacerlo afuera termina en un `className` que pisa al del spread, que es
 * silencioso y deja la fila sin marcar.
 *
 * Baja la opacidad y apaga los eventos: comunica "esto ya salió" y evita el
 * segundo clic al mismo tiempo. `aria-busy` lo dice para quien no ve la
 * opacidad.
 */
export const pendingRow = (isPending: boolean, base?: string) => ({
  "aria-busy": isPending || undefined,
  className: cn(base, isPending && "pointer-events-none opacity-50"),
});
