// Única fuente de verdad de permisos por entorno (scoped al workspace).
// owner ⇒ todas + borrar entorno (hardcode owner-only, NO en la matriz).
// admin global ⇒ bypass total. member/admin de entorno ⇒ según role_permissions.

export const WS_PERMISSION_GROUPS: {
  group: string;
  keys: { key: string; label: string }[];
}[] = [
  {
    group: "Catálogo",
    keys: [
      { key: "catalog.view", label: "Ver catálogo" },
      { key: "catalog.manage", label: "Editar productos" },
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
    group: "Equipo",
    keys: [
      { key: "team.view", label: "Ver equipo" },
      { key: "team.manage", label: "Editar equipo/acuerdos" },
    ],
  },
  {
    group: "Proyectos",
    keys: [
      { key: "projects.view", label: "Ver proyectos/tareas" },
      { key: "projects.manage", label: "Crear/editar proyectos/tareas" },
    ],
  },
  {
    group: "Administración del entorno",
    keys: [
      { key: "members.manage", label: "Gestionar miembros y roles" },
      { key: "settings.manage", label: "Editar nombre/color del entorno" },
    ],
  },
];

export const ALL_WS_PERMISSIONS: string[] = WS_PERMISSION_GROUPS.flatMap((g) =>
  g.keys.map((k) => k.key)
);

const VIEW_KEYS = ALL_WS_PERMISSIONS.filter((k) => k.endsWith(".view"));

export type WsRolePermissions = { admin: string[]; member: string[] };

// Defaults por rol de entorno (editables luego por owner/admin/admin-global):
// - admin de entorno: todo (gestiona pero no borra el entorno → owner-only).
// - member: solo lectura.
export const DEFAULT_WS_ROLE_PERMISSIONS: WsRolePermissions = {
  admin: ALL_WS_PERMISSIONS,
  member: VIEW_KEYS,
};

export const isValidPermission = (k: string): boolean =>
  ALL_WS_PERMISSIONS.includes(k);
