import { requireFeature } from "@/lib/workspace";

/**
 * Guard de tier para todo el área de Operaciones (ERP) — feature premium.
 * Chokepoint único: cubre /operations y todas sus sub-rutas. No-op para
 * entornos premium (todos los de RMH hoy).
 */
export default async function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFeature("operations");
  return <>{children}</>;
}
