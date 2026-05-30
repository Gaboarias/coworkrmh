"use client";

import { Breadcrumbs } from "./Breadcrumbs";
import { AvatarDropdown } from "./AvatarDropdown";
import { SearchTrigger } from "./SearchTrigger";

/**
 * Topbar (Sunset Aurora · N1 + N3).
 *
 * Layout:
 *   [Breadcrumbs]   ........   [Search trigger ⌘K] [Avatar dropdown]
 */
export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-6">
      <Breadcrumbs />
      <div className="flex items-center gap-3">
        <SearchTrigger />
        <AvatarDropdown />
      </div>
    </header>
  );
}
