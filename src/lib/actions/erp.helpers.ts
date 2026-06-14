import { auth } from "@/lib/auth";
import { getActiveWorkspace, getWorkspacePermissions } from "@/lib/workspace";

export const ER = "/operations";

export const requireWs = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  const ws = await getActiveWorkspace();
  if (!ws) throw new Error("Selecciona un entorno");
  const { permissions } = await getWorkspacePermissions(ws.id);
  const can = (key: string) => permissions.has(key);
  return { ws, userId: session.user.id, can };
};

export const requireWsCan = async (key: string) => {
  const ctx = await requireWs();
  if (!ctx.can(key)) {
    throw new Error("No tenés permiso para esta acción en este entorno");
  }
  return ctx;
};
