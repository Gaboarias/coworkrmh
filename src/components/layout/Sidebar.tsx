"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  Users,
  Settings,
  LogOut,
  Building2,
  CreditCard,
  Package,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUser } from "@/lib/hooks/useUser";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/projects", label: "Proyectos", icon: FolderKanban },
  { href: "/my-tasks", label: "Mis tareas", icon: CheckSquare },
  { href: "/calendar", label: "Calendario", icon: Calendar },
];

const crmItems = [
  { href: "/crm", label: "Clientes", icon: Building2, exact: true },
  { href: "/crm/payments", label: "Pagos", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUser();
  const { isManager, isAdmin } = usePermissions();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    toast.success("Sesión cerrada");
    await signOut({ callbackUrl: "/login" });
  }

  const navActive =
    "bg-[color-mix(in_oklab,var(--sidebar-active)_16%,transparent)] text-sidebar-active";
  const navIdle =
    "text-sidebar-muted hover:bg-[color-mix(in_oklab,var(--sidebar-foreground)_8%,transparent)] hover:text-sidebar-foreground";

  return (
    <aside className="flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <img
          src="/pistachio-logo.svg"
          alt="Pistachio"
          className="h-8 w-8 rounded-lg"
        />
        <div>
          <p className="text-sm font-bold text-sidebar-foreground">Pistachio</p>
          <p className="text-xs text-sidebar-muted">Rewind Media House</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
                  isActive(item.href, item.exact) ? navActive : navIdle
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* CRM section (admin/manager only) */}
        {isManager && (
          <div className="mt-6">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
              CRM
            </p>
            <ul className="space-y-0.5">
              {crmItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
                      isActive(item.href, item.exact) ? navActive : navIdle
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/operations"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
                  isActive("/operations") ? navActive : navIdle
                )}
              >
                <Package className="h-4 w-4" />
                Operaciones
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        {isAdmin && (
          <Link
            href="/settings/team"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ease-out",
              isActive("/settings/team", true) ? navActive : navIdle
            )}
          >
            <Users className="h-4 w-4" />
            Equipo y roles
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/settings/teams"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ease-out",
              isActive("/settings/teams") ? navActive : navIdle
            )}
          >
            <Building2 className="h-4 w-4" />
            Equipos y negocios
          </Link>
        )}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ease-out",
            isActive("/settings", true) ? navActive : navIdle
          )}
        >
          <Settings className="h-4 w-4" />
          Configuración
        </Link>

        {/* User profile */}
        <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <UserAvatar name={profile?.name ?? undefined} avatarUrl={profile?.image ?? undefined} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.name ?? "Usuario"}
            </p>
            <p className="truncate text-xs text-sidebar-muted">{profile?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sidebar-muted transition-colors hover:text-danger"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
