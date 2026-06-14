/**
 * Zod schemas para server actions de negocio.
 *
 * Uso en cada action:
 *   import { createProjectSchema } from "@/lib/validation/actions";
 *   const validated = createProjectSchema.parse(formData); // lanza si inválido
 *
 * El error de Zod llega al componente como (err as Error).message via
 * el toast.error() que ya existe en todos los call sites.
 */

import { z } from "zod";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const nonEmptyString = (max: number, label: string) =>
  z.string().trim().min(1, `${label} es requerido`).max(max, `${label} demasiado largo`);

const optionalString = (max: number) =>
  z.string().trim().max(max).optional().nullable();

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido (usa formato #RRGGBB)")
  .optional()
  .nullable();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (usa YYYY-MM-DD)")
  .optional()
  .nullable();

// ─── Proyectos ────────────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: nonEmptyString(255, "Nombre del proyecto"),
  description: optionalString(2000),
  bucketId: z.string().uuid().optional().nullable(),
  color: hexColor,
  startDate: isoDate,
  endDate: isoDate,
  dueDate: isoDate,
});

export const updateProjectSchema = z.object({
  name: nonEmptyString(255, "Nombre del proyecto").optional(),
  description: optionalString(2000),
  color: hexColor,
  startDate: isoDate,
  endDate: isoDate,
  dueDate: isoDate,
  status: z.enum(["active", "completed", "archived", "in_progress", "planning"]).optional(),
});

// ─── Tareas ───────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  projectId: z.string().uuid("ID de proyecto inválido"),
  title: nonEmptyString(500, "Título de la tarea"),
  description: optionalString(5000),
  assigneeId: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().nullable(),
  dueDate: isoDate,
  parentTaskId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).max(20).optional(),
});

export const updateTaskSchema = z.object({
  title: nonEmptyString(500, "Título de la tarea").optional(),
  description: optionalString(5000),
  assigneeId: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().nullable(),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  dueDate: isoDate,
});

// ─── Clientes (CRM) ───────────────────────────────────────────────────────────

export const createClientSchema = z.object({
  companyName: nonEmptyString(255, "Nombre de la empresa"),
  contactName: optionalString(255),
  email: z.string().trim().email("Email inválido").max(254).optional().nullable(),
  phone: optionalString(50),
  notes: optionalString(2000),
});

// ─── Workspaces ───────────────────────────────────────────────────────────────

export const createWorkspaceSchema = z.object({
  name: nonEmptyString(120, "Nombre del entorno"),
  color: hexColor,
});

export const updateWorkspaceSchema = z.object({
  name: nonEmptyString(120, "Nombre del entorno").optional(),
  color: hexColor,
});
