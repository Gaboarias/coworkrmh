"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Lista que se actualiza antes de que el servidor conteste.
 *
 * El repo tiene Server Actions y Server Components, así que el camino corto
 * —`await action(); router.refresh()`— cuesta una ida y vuelta completa antes
 * de que se mueva un píxel. En una tabla de ERP, donde se marcan diez filas
 * seguidas, eso se siente como si la app estuviera pensando en cada clic.
 *
 * `TaskBoard` ya resolvía esto a mano: estado local, snapshot, parche, y
 * restaurar en el catch. Funciona, pero estaba en un solo archivo y las otras
 * catorce vistas que llaman `router.refresh()` se quedaron con la espera. Este
 * hook es esa receta con nombre.
 *
 * Lo que aporta más allá de `useState`:
 *
 * 1. **Se resincroniza con el servidor.** El componente recibe la lista por
 *    props en cada render de servidor; el hook la adopta cuando cambia de
 *    verdad, comparando una firma y no la identidad del array (que cambia en
 *    cada render y reventaría el estado local en cada tecla).
 * 2. **Revierte de verdad.** El snapshot se toma del estado vigente en el
 *    momento del parche, no del render en que se creó el callback: dos parches
 *    seguidos sobre la misma fila revertían al valor equivocado.
 * 3. **No revierte sobre un componente desmontado.** Si la fila se fue de la
 *    pantalla mientras la acción viajaba, restaurar tira un warning de React y
 *    no arregla nada.
 *
 * El error NUNCA se traga: si la acción falla, la lista vuelve a lo que estaba
 * y sale un toast. Una UI optimista que se queda mostrando el estado optimista
 * después de un fallo es peor que no tenerla — miente.
 */

interface Options {
  /** Mensaje del toast si la acción falla. */
  errorMessage?: string;
  /**
   * Revalidar desde el servidor al terminar bien. Default true.
   * Se puede apagar cuando la acción devuelve todo lo que hacía falta y el
   * refresh sólo agregaría un parpadeo.
   */
  refresh?: boolean;
}

export function useOptimisticList<T extends { id: string }>(
  server: T[],
  signature: (item: T) => string
) {
  const [items, setItems] = useState(server);
  const router = useRouter();

  // Ref al estado vigente: el snapshot para revertir tiene que salir de acá y
  // no de `items`, que en el closure de `apply` es el del render en que se
  // creó. Con dos parches seguidos sobre la misma fila, el segundo revertía al
  // valor previo al primero.
  const current = useRef(items);
  current.current = items;

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Firma y no identidad: `server` es un array nuevo en cada render del padre,
  // así que compararlo por referencia pisaría el estado optimista al instante.
  const sig = server.map(signature).join("|");
  useEffect(() => {
    setItems(server);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  /**
   * Aplica `patch` a la fila `id`, lanza `action`, y revierte si falla.
   * Devuelve true si la acción terminó bien.
   */
  async function apply(
    id: string,
    patch: Partial<T>,
    action: () => Promise<unknown>,
    { errorMessage = "No se pudo guardar el cambio", refresh = true }: Options = {}
  ): Promise<boolean> {
    const before = current.current;
    if (!before.some((x) => x.id === id)) return false;

    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));

    try {
      await action();
      if (refresh) router.refresh();
      return true;
    } catch {
      if (mounted.current) {
        setItems(before);
        toast.error(errorMessage);
      }
      return false;
    }
  }

  /** Saca la fila de la vista antes de confirmar, y la devuelve si falla. */
  async function remove(
    id: string,
    action: () => Promise<unknown>,
    { errorMessage = "No se pudo eliminar", refresh = true }: Options = {}
  ): Promise<boolean> {
    const before = current.current;
    if (!before.some((x) => x.id === id)) return false;

    setItems((arr) => arr.filter((x) => x.id !== id));

    try {
      await action();
      if (refresh) router.refresh();
      return true;
    } catch {
      if (mounted.current) {
        setItems(before);
        toast.error(errorMessage);
      }
      return false;
    }
  }

  return { items, setItems, apply, remove };
}
