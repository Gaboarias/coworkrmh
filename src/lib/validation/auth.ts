/**
 * Zod schemas reutilizables para endpoints de auth + acciones admin.
 *
 * Validar al borde: cada API route parsea el body con uno de estos. Si la
 * forma no coincide, devuelve 400 con el error parseado — sin try/catch
 * a mano para cada campo.
 */

import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email inválido")
  .max(254, "Email demasiado largo");

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(200, "La contraseña es demasiado larga");

// ─── Bodies de cada endpoint ────────────────────────────────────────────────

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Contraseña requerida").max(200),
});

export const signupBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(120).optional().nullable(),
});

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(32).max(128),
  password: passwordSchema,
});

export const setPasswordBodySchema = z.object({
  password: passwordSchema,
});

export const changeMyPasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});

export const setUserRoleBodySchema = z.object({
  role: z.enum(["admin", "manager", "member"]),
});

export const setUserWorkspacesBodySchema = z.object({
  workspaceIds: z.array(z.string().uuid()).max(100),
});

export const createUserBodySchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(120).optional().nullable(),
  password: passwordSchema.optional(),
  role: z.enum(["admin", "manager", "member"]).optional(),
  workspaceIds: z.array(z.string().uuid()).max(100).optional(),
});

// ─── Helper para devolver 400 limpio ────────────────────────────────────────

import { NextResponse } from "next/server";

export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "JSON inválido" }, { status: 400 }),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return {
      ok: false,
      response: NextResponse.json(
        { error: firstIssue?.message ?? "Body inválido" },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: result.data };
}
