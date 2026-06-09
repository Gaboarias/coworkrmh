/**
 * Layout del portal de clientes.
 *
 * - Sin AppShell, sin sidebar, sin NextAuth requirement.
 * - Siempre light mode — el portal es una superficie pública y de marca,
 *   no hereda el tema del usuario de Pistachio.
 * - Misma tipografía Satoshi via globals.css.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal de cliente — Pistachio",
  description: "Seguimiento de proyectos y reportes.",
  robots: { index: false, follow: false },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Wrapping in a div that resets to light values via inline style so
  // even if the root <html> has .dark applied (Pistachio user's theme),
  // the portal surface stays clean and consistent for external clients.
  return (
    <div
      style={{
        colorScheme: "light",
        background: "#f5f2eb",
        minHeight: "100dvh",
      }}
    >
      {children}
    </div>
  );
}
