"use client";

import { Breadcrumbs } from "./Breadcrumbs";
import { AvatarDropdown } from "./AvatarDropdown";
import { SearchTrigger } from "./SearchTrigger";
import { NotificationsBell } from "./NotificationsBell";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Topbar (Edition 04).
 *
 * - Sin bg-surface — usa el mismo bg que el resto (sólo se distingue por
 *   border-bottom hairline).
 * - Order: [breadcrumbs] ... [search] [theme] [bell] [avatar].
 * - Altura 56px (era 56px también, mantener).
 */
export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-rule px-6">
      <Breadcrumbs />
      <div className="flex items-center gap-2">
        <SearchTrigger />
        <ThemeToggle />
        <NotificationsBell />
        <AvatarDropdown />
      </div>
    </header>
  );
}
