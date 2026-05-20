import type { UserRole } from "@/lib/types";

type Action =
  | "create:project"
  | "update:project"
  | "delete:project"
  | "manage:members"
  | "create:task"
  | "update:task"
  | "delete:task"
  | "view:crm"
  | "manage:crm"
  | "view:accounts"
  | "manage:team"
  | "view:changelog";

const rolePermissions: Record<UserRole, Action[]> = {
  admin: [
    "create:project",
    "update:project",
    "delete:project",
    "manage:members",
    "create:task",
    "update:task",
    "delete:task",
    "view:crm",
    "manage:crm",
    "view:accounts",
    "manage:team",
    "view:changelog",
  ],
  manager: [
    "create:project",
    "update:project",
    "manage:members",
    "create:task",
    "update:task",
    "delete:task",
    "view:crm",
    "manage:crm",
    "view:changelog",
  ],
  member: ["create:task", "update:task", "view:changelog"],
};

export function can(role: UserRole, action: Action): boolean {
  return rolePermissions[role]?.includes(action) ?? false;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: "Administrador",
    manager: "Manager",
    member: "Miembro",
  };
  return labels[role];
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: "text-danger bg-danger/10",
    manager: "text-warning bg-warning/10",
    member: "text-info bg-info/10",
  };
  return colors[role];
}

// ─── Permisos por perfil (configurables por negocio) ──────────────────────────
// Catálogo canónico de claves. Los perfiles (tabla `profiles`) guardan un
// subconjunto en `permissions`. El super-admin global (users.role==='admin')
// tiene todas por bypass.

export const PERMISSION_GROUPS: {
  group: string;
  keys: { key: string; label: string }[];
}[] = [
  {
    group: "Catálogo",
    keys: [
      { key: "catalog.view", label: "Ver catálogo" },
      { key: "catalog.manage", label: "Gestionar productos/categorías" },
    ],
  },
  {
    group: "Cotizador",
    keys: [
      { key: "quotes.view", label: "Ver cotizaciones" },
      { key: "quotes.manage", label: "Crear/editar cotizaciones" },
    ],
  },
  {
    group: "Ventas",
    keys: [
      { key: "sales.view", label: "Ver ventas" },
      { key: "sales.manage", label: "Registrar/editar ventas" },
    ],
  },
  {
    group: "Gastos",
    keys: [
      { key: "expenses.view", label: "Ver gastos" },
      { key: "expenses.manage", label: "Registrar/editar gastos" },
    ],
  },
  {
    group: "Clientes",
    keys: [
      { key: "clients.view", label: "Ver clientes/cobros" },
      { key: "clients.manage", label: "Gestionar clientes/cobros" },
    ],
  },
  {
    group: "Equipo",
    keys: [
      { key: "team.view", label: "Ver equipo" },
      { key: "team.manage", label: "Gestionar perfiles y miembros" },
    ],
  },
  {
    group: "Proyectos",
    keys: [
      { key: "projects.manage", label: "Gestionar proyectos/tareas" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_GROUPS.flatMap((g) =>
  g.keys.map((k) => k.key)
);

export function hasPermission(
  permissions: string[] | null | undefined,
  key: string
): boolean {
  return Array.isArray(permissions) && permissions.includes(key);
}

// Perfiles semilla por negocio (editables luego por el admin).
export const SEED_PROFILES: {
  name: string;
  description: string;
  permissions: string[];
}[] = [
  {
    name: "Fundador / Admin",
    description: "Administración general, finanzas, estrategia",
    permissions: ALL_PERMISSION_KEYS,
  },
  {
    name: "Diseño + Redes",
    description: "Diseño de productos, contenido y comunidad",
    permissions: [
      "catalog.view",
      "catalog.manage",
      "quotes.view",
      "sales.view",
      "clients.view",
      "team.view",
    ],
  },
  {
    name: "Constructor",
    description: "Fabricación, costos y producción",
    permissions: [
      "catalog.view",
      "quotes.view",
      "sales.view",
      "expenses.view",
      "team.view",
    ],
  },
  {
    name: "Miembro",
    description: "Acceso básico de lectura",
    permissions: ["catalog.view", "sales.view", "team.view"],
  },
];
