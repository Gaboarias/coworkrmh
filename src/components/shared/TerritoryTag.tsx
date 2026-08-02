"use client";

import { usePathname } from "next/navigation";
import { territoryOf } from "@/lib/constants/navigation";

/**
 * El territorio, en la línea de ubicación del encabezado.
 *
 * Los cuatro territorios existían sólo en el sidebar. Apenas alguien entraba a
 * una pantalla, la separación dejaba de existir: el eyebrow decía
 * "/ operations / ventas" y nada indicaba que eso fuera Negocio. Peor con el
 * sidebar colapsado, donde ni los rótulos se ven.
 *
 * Va PEGADO al eyebrow y no en una línea propia a propósito: el territorio es
 * ubicación, igual que la ruta. Partirlo en dos renglones lo convertiría en
 * decoración con su propio espacio, que es justo lo que no queremos de algo
 * que aparece en las 30 pantallas.
 *
 * Se resuelve del pathname en vez de pedírselo a cada página: son 32 llamadas
 * a PageHeader y un parámetro que hay que acordarse de pasar es un parámetro
 * que en algún momento alguien no pasa.
 */
export function TerritoryTag() {
  const pathname = usePathname();
  const territory = territoryOf(pathname);

  // /login, /portal, /share, /invite y los 404 no son de ningún territorio.
  // Callar es correcto: inventarles uno sería mentir sobre dónde está parada
  // la persona.
  if (!territory) return null;

  return (
    <>
      {/* El territorio en tinta plena contra el resto de la línea en gris:
          el contraste dentro del renglón es lo que hace la separación, sin
          gastar un color ni una fila. */}
      <span className="text-ink" title={territory.tagline}>
        {territory.label}
      </span>
      <span aria-hidden className="mx-2 text-ink-faint">
        ·
      </span>
    </>
  );
}
