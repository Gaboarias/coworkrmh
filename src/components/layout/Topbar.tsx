"use client";

import { Breadcrumbs } from "./Breadcrumbs";
import { AvatarDropdown } from "./AvatarDropdown";

/**
 * Topbar (Sunset Aurora · N1).
 *
 * Antes: page-title + 4 botones placeholder (Search, Notifs, BaseToggle,
 * ThemeToggle) + avatar plano.
 *
 * Ahora: breadcrumbs (que reemplazan el page-title duplicado) + avatar
 * dropdown con Configuración + Logout. El resto (search, notifs) llega
 * en N3/N4.
 */
export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-6">
      <Breadcrumbs />
      <AvatarDropdown />
    </header>
  );
}
