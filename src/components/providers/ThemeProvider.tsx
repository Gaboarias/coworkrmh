"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

/**
 * ThemeProvider de Consola.
 *
 * - **Oscuro por default.** Consola es una dirección dark-first: el marino es
 *   la decisión, y el claro es su traducción a papel. Con el default en claro,
 *   quien entra por primera vez nunca veía la dirección real.
 * - El usuario puede pasar a claro, y su elección manda desde entonces.
 * - `enableSystem={false}` a propósito: la app tiene una opinión sobre cómo se
 *   ve, y el sistema operativo no es un mejor juez que el equipo.
 * - Storage key `pistachio-theme`.
 *
 * OJO: el default está escrito DOS veces —acá y en el script inline de
 * `layout.tsx`, que corre antes de la hidratación para evitar el flash. Si se
 * separan, la página parpadea de un tema al otro en cada carga. Hay un test de
 * conformidad que los compara.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="pistachio-theme"
    >
      {children}
    </NextThemeProvider>
  );
}
