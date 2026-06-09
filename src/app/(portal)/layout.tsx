/**
 * Layout del portal de clientes.
 *
 * Intencionalmente distinto al (app)/layout:
 * - Sin AppShell, sin sidebar, sin NextAuth requirement.
 * - Limpio, de solo lectura, orientado al cliente externo.
 * - Mismos tokens CSS (globals.css) y font Satoshi.
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
  return (
    <div className="min-h-screen bg-background text-text">
      {children}
    </div>
  );
}
