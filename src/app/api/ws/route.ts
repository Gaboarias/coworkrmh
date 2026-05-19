import { NextResponse } from "next/server";
import { getMemberWorkspaces, getActiveWorkspace } from "@/lib/workspace";

// Datos para el selector de entorno (client component del Sidebar).
export const GET = async () => {
  const [{ workspaces, isAdmin }, active] = await Promise.all([
    getMemberWorkspaces(),
    getActiveWorkspace(),
  ]);
  return NextResponse.json({ workspaces, isAdmin, activeId: active?.id ?? null });
};
