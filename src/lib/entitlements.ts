/**
 * Entitlements — separación de tiers basic/premium (modelo híbrido).
 *
 * Mapa estático `feature → tier mínimo`. NO es un motor de billing: es un mapa
 * + un helper. El cobro (cuando exista) será aparte (Lemon Squeezy). Hoy todos
 * los entornos de RMH son `premium`, así que nada se oculta — pero la
 * separación queda lista para cuando se venda a otros negocios.
 *
 * Cómo usar:
 *  - Server: `const { ws } = await getActiveWorkspace(); hasFeature(ws?.tier, "blaster")`
 *  - Guard de página: si !hasFeature(...) → redirect/upsell.
 *  - Sidebar: filtra items por `feature`.
 */

export type Tier = "basic" | "premium";

/** Llaves de feature gateables. Mantener en sync con el sidebar y los guards. */
export type Feature =
  // Basics (commodity, gancho)
  | "projects"
  | "tasks"
  | "calendar"
  | "content" // docs + notas
  | "clients" // lista/CRM básico
  | "notifications"
  // Premium (lo que se paga)
  | "operations" // ERP: catálogo, cotizador, ventas, gastos, equipo
  | "clientPortal"
  | "reportBuilder"
  | "blaster" // email masivo
  | "analytics" // /reports
  | "multiWorkspace"
  | "mobile";

/** Tier mínimo requerido por feature. */
const FEATURE_TIER: Record<Feature, Tier> = {
  projects: "basic",
  tasks: "basic",
  calendar: "basic",
  content: "basic",
  clients: "basic",
  notifications: "basic",

  operations: "premium",
  clientPortal: "premium",
  reportBuilder: "premium",
  blaster: "premium",
  analytics: "premium",
  multiWorkspace: "premium",
  mobile: "premium",
};

const TIER_RANK: Record<Tier, number> = { basic: 0, premium: 1 };

/**
 * ¿El tier dado habilita la feature? `premium` habilita todo. Si `tier` es
 * undefined/null (sin entorno), se asume `basic` (lo más restrictivo seguro).
 */
export function hasFeature(
  tier: Tier | null | undefined,
  feature: Feature
): boolean {
  const t = tier ?? "basic";
  return TIER_RANK[t] >= TIER_RANK[FEATURE_TIER[feature]];
}

/** Lista de features premium (para UI de upsell / comparativa de planes). */
export function premiumFeatures(): Feature[] {
  return (Object.keys(FEATURE_TIER) as Feature[]).filter(
    (f) => FEATURE_TIER[f] === "premium"
  );
}
