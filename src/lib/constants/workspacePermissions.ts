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

// Matriz de roles del entorno: clave = nombre del rol, valor = lista de claves
// de permisos. Admite roles custom (el admin los crea) además de los built-in.
export type WsRolePermissions = Record<string, string[]>;

// Roles built-in no eliminables. "owner" NO va en la matriz (es bypass total).
export const BUILTIN_ROLE_KEYS = ["admin", "member"] as const;

// Etiquetas de display para roles built-in. Roles custom se muestran con su
// propio key (el admin elige el nombre legible al crearlos).
export const BUILTIN_ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Admin",
  member: "Miembro",
};

// Defaults para los built-in del entorno cuando se crea:
// - admin: todas las capacidades (gestiona pero no borra → owner-only).
// - member: solo lectura.
export const DEFAULT_WS_ROLE_PERMISSIONS: WsRolePermissions = {
  admin: ALL_WS_PERMISSIONS,
  member: VIEW_KEYS,
};

// Sanea un nombre de rol custom: no vacío, no "owner" (reservado), trim,
// max 32 chars. Permite letras (incluido acentos), números, espacio, guion.
export const sanitizeRoleKey = (raw: string): string => {
  const trimmed = raw.trim().slice(0, 32);
  if (!trimmed) throw new Error("El nombre del rol es obligatorio");
  if (trimmed.toLowerCase() === "owner") {
    throw new Error("\"owner\" está reservado");
  }
  if (!/^[\p{L}\p{N} _-]+$/u.test(trimmed)) {
    throw new Error("Sólo letras, números, espacio, guion y guion bajo");
  }
  return trimmed;
};
