import { cookies } from "next/headers";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPaletteProvider } from "./CommandPaletteProvider";
import { SidebarStateProvider } from "./SidebarStateContext";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { getMemberWorkspaces, WS_COOKIE } from "@/lib/workspace";

/**
 * AppShell de Edition 04.
 *
 * Wrappers (orden importa):
 * - SidebarStateProvider: estado collapsed lifteado para que Topbar
 *   y Sidebar lo compartan + shortcut ⌘B global.
 * - CommandPaletteProvider: ⌘K palette.
 *
 * Obtiene los datos de workspace en el servidor y los pasa como prop a
 * Sidebar → EntornoSwitcher, eliminando el useEffect + fetch del cliente
 * (B4 pattern fix).
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const { isAdmin, workspaces } = await getMemberWorkspaces();
  const cookieId = cookies().get(WS_COOKIE)?.value ?? null;
  const activeId =
    workspaces.find((w) => w.id === cookieId)?.id ?? workspaces[0]?.id ?? null;

  return (
    <SidebarStateProvider>
      <CommandPaletteProvider>
        <MotionProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar wsData={{ workspaces, isAdmin, activeId }} />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
        </MotionProvider>
      </CommandPaletteProvider>
    </SidebarStateProvider>
  );
}
