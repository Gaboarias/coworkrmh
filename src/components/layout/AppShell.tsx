import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPaletteProvider } from "./CommandPaletteProvider";

/**
 * AppShell de Edition 04.
 *
 * Diferencias críticas con la versión Sunset Aurora:
 * - Sin AuroraBackground (eliminado, ahora hay bg sólido en :root).
 * - Sin wrapper bg-background (heredamos del body — los project layouts
 *   pueden setear --project-color para tintar la columna main).
 * - El main usa padding asimétrico (más vertical que horizontal) para
 *   permitir display titles de 56-64px sin sentirse apretados.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
