import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPaletteProvider } from "./CommandPaletteProvider";
import { SidebarStateProvider } from "./SidebarStateContext";

/**
 * AppShell de Edition 04.
 *
 * Wrappers (orden importa):
 * - SidebarStateProvider: estado collapsed lifteado para que Topbar
 *   y Sidebar lo compartan + shortcut ⌘B global.
 * - CommandPaletteProvider: ⌘K palette.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarStateProvider>
      <CommandPaletteProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </CommandPaletteProvider>
    </SidebarStateProvider>
  );
}
