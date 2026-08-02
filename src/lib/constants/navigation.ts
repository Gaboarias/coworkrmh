import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Briefcase,
  BarChart3,
  Shield,
  Building2,
  Mail,
  Settings,
  Bell,
  type LucideIcon,
} from "lucide-react";
import type { Feature } from "@/lib/entitlements";

/**
 * La arquitectura de información de Pistachio: cuatro territorios.
 *
 * Están puestos por MODO MENTAL, no por parecido técnico. La pregunta que
 * responde cada uno es distinta:
 *
 *   TRABAJO      ¿qué tengo que hacer hoy?
 *   NEGOCIO      ¿cómo va el estudio?
 *   CRECIMIENTO  ¿de dónde viene lo que sigue?
 *   SISTEMA      ¿quién puede hacer qué?
 *
 * Sin el fichero, esto vivía dentro de Sidebar.tsx, que es `"use client"`. Un
 * Server Component que importara de ahí no recibiría los datos sino una
 * referencia de cliente — el bug que ya publicó un `[object Object]` en el
 * encabezado de Operaciones. Acá no hay directiva, así que lo lee cualquiera.
 *
 * Y hay un motivo de fondo además del técnico: si la separación sólo existe en
 * el sidebar, deja de existir apenas alguien entra a una pantalla. Que el
 * territorio se pueda resolver desde una ruta es lo que permite mostrarlo
 * también en el encabezado de la página.
 */

export type TerritoryId = "work" | "business" | "growth" | "system";

export interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Activo sólo con coincidencia exacta (para /dashboard, que es prefijo de nada). */
  exact?: boolean;
  adminOnly?: boolean;
  /** El item aparece sólo si el tier del entorno activo habilita la feature. */
  feature?: Feature;
}

export interface Territory {
  id: TerritoryId;
  label: string;
  /** Qué pregunta responde. Se muestra en el encabezado de página. */
  tagline: string;
  items: NavEntry[];
  /**
   * Rutas que pertenecen al territorio pero no son items del sidebar:
   * subpáginas, vistas embebidas, pantallas a las que se llega desde otro lado.
   * Sin esto, `territoryOf` las daría por huérfanas y el encabezado no diría
   * dónde está parada la persona.
   */
  alsoOwns?: string[];
}

export const TERRITORIES: Territory[] = [
  {
    id: "work",
    label: "Trabajo",
    tagline: "qué tengo que hacer hoy",
    items: [
      { href: "/dashboard", label: "Resumen", icon: LayoutDashboard, exact: true },
      { href: "/projects", label: "Proyectos", icon: FolderKanban, feature: "projects" },
      { href: "/my-tasks", label: "Mis tareas", icon: CheckSquare, feature: "tasks" },
    ],
    // El calendario dejó de ser item propio (vive como vista dentro de Mis
    // tareas) pero la ruta sigue existiendo y hay que saber de quién es.
    alsoOwns: ["/calendar", "/notifications"],
  },
  {
    id: "business",
    label: "Negocio",
    tagline: "cómo va el estudio",
    items: [
      { href: "/operations", label: "Operaciones", icon: Briefcase, feature: "operations" },
      { href: "/clients", label: "Clientes", icon: Building2, adminOnly: true, feature: "clients" },
    ],
  },
  {
    id: "growth",
    label: "Crecimiento",
    tagline: "de dónde viene lo que sigue",
    items: [
      { href: "/reports", label: "Reportes", icon: BarChart3, feature: "analytics" },
      { href: "/marketing", label: "Campañas", icon: Mail, adminOnly: true, feature: "blaster" },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    tagline: "quién puede hacer qué",
    items: [
      { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
    ],
    // Configuración vive en el pie del sidebar por costumbre, pero pertenece
    // acá: es administración de la cuenta y del entorno.
    alsoOwns: ["/settings"],
  },
];

/** Ítem del pie. Se separa porque no se lista con los demás. */
export const SETTINGS_ENTRY: NavEntry = {
  href: "/settings",
  label: "Configuración",
  icon: Settings,
  exact: true,
};

/** Sólo para resolver el territorio de /notifications, que no es item de nav. */
export const NOTIFICATIONS_ICON = Bell;

/**
 * A qué territorio pertenece una ruta.
 *
 * Gana el prefijo MÁS LARGO, no el primero que coincida. Sin eso, el orden de
 * declaración decidiría los empates en silencio — y el día que exista
 * `/projects` en un territorio y `/projects/x` en otro, la respuesta
 * dependería de cuál se escribió antes.
 *
 * Devuelve null para las rutas que no son de ningún territorio (/login,
 * /portal, /share, /invite): son superficies fuera de la app.
 */
export function territoryOf(pathname: string): Territory | null {
  let mejor: { t: Territory; largo: number } | null = null;

  for (const t of TERRITORIES) {
    const rutas = [...t.items.map((i) => i.href), ...(t.alsoOwns ?? [])];
    for (const href of rutas) {
      const coincide = pathname === href || pathname.startsWith(`${href}/`);
      if (coincide && (!mejor || href.length > mejor.largo)) {
        mejor = { t, largo: href.length };
      }
    }
  }
  return mejor?.t ?? null;
}
