"use client";

import { Breadcrumbs } from "./Breadcrumbs";
import { AvatarDropdown } from "./AvatarDropdown";
import { SearchTrigger } from "./SearchTrigger";
import { NotificationsBell } from "./NotificationsBell";

/**
 * Topbar (Sunset Aurora · N1 + N3 + N4).
 *
 * Layout:
 *   [Breadcrumbs]  ...  [Search ⌘K] [🔔Bell] [Avatar dropdown]
 */
export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-6">
      <Breadcrumbs />
      <div className="flex items-center gap-3">
        <SearchTrigger />
        <NotificationsBell />
        <AvatarDropdown />
      </div>
    </header>
  );
}
