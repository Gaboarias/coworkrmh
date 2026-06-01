"use client";

import { Breadcrumbs } from "./Breadcrumbs";
import { AvatarDropdown } from "./AvatarDropdown";
import { SearchTrigger } from "./SearchTrigger";
import { NotificationsBell } from "./NotificationsBell";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarToggle } from "./SidebarToggle";

/**
 * Topbar (Edition 04 · mobile-responsive).
 *
 * Layout desktop:
 *   [SidebarToggle ⌘B] | [Breadcrumbs]   [Search] [Theme] [Bell] [Avatar]
 *
 * Layout mobile (< sm 640px):
 *   [SidebarToggle]  [Breadcrumbs truncated]   [Search-icon] [Theme] [Bell] [Avatar]
 *
 * Tweaks responsive:
 * - El divisor entre SidebarToggle y Breadcrumbs sólo en `sm:` (ahorra px).
 * - Container del breadcrumb: flex-1 min-w-0 para que el truncate funcione.
 * - SearchTrigger: con prop iconOnly que respecta su propio breakpoint.
 * - ThemeToggle escondido en mobile angosto (`hidden xs:inline-flex`) — opcional.
 *   Por ahora se queda. Si sigue apretado, lo escondemos.
 * - Padding del header: `px-3 sm:px-4` para no perder pixels en pantallas angostas.
 */
export function Topbar() {
  return (
    <header className="flex h-14 items-center gap-2 border-b border-rule px-3 sm:px-4">
      <SidebarToggle />
      <span className="hidden h-5 w-px bg-rule sm:block" aria-hidden />
      <div className="flex min-w-0 flex-1 items-center overflow-hidden">
        <Breadcrumbs />
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
        <SearchTrigger />
        <ThemeToggle />
        <NotificationsBell />
        <AvatarDropdown />
      </div>
    </header>
  );
}
