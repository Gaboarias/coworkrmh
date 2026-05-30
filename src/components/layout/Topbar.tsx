"use client";

import { Breadcrumbs } from "./Breadcrumbs";
import { AvatarDropdown } from "./AvatarDropdown";
import { SearchTrigger } from "./SearchTrigger";
import { NotificationsBell } from "./NotificationsBell";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarToggle } from "./SidebarToggle";

/**
 * Topbar (Edition 04).
 *
 * Layout:
 *   [SidebarToggle ⌘B] | [Breadcrumbs]   [Search] [ThemeToggle] [Bell] [Avatar]
 *
 * SidebarToggle vive a la izquierda con su shortcut ⌘B visible —
 * forma estándar (Linear, Notion, Slack) y discoverable.
 */
export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-rule px-4">
      <div className="flex items-center gap-3">
        <SidebarToggle />
        <span className="h-5 w-px bg-rule" aria-hidden />
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-2">
        <SearchTrigger />
        <ThemeToggle />
        <NotificationsBell />
        <AvatarDropdown />
      </div>
    </header>
  );
}
