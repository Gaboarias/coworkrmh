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
  const { isManager } = usePermissions();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    toast.success("Sesión cerrada");
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-white">R</span>
        </div>
        <div>
          <p className="text-sm font-bold text-text">Cowork RMH</p>
          <p className="text-xs text-text-tertiary">Rewind Media House</p>
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
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href, item.exact)
                    ? "bg-primary-muted text-primary"
                    : "text-text-muted hover:bg-surface-el hover:text-text"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4",
                    isActive(item.href, item.exact)
                      ? "text-primary"
                      : "text-text-tertiary"
                  )}
                />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* CRM section (admin/manager only) */}
        {isManager && (
          <div className="mt-6">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              CRM
            </p>
            <ul className="space-y-0.5">
              {crmItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive(item.href, item.exact)
                        ? "bg-primary-muted text-primary"
                        : "text-text-muted hover:bg-surface-el hover:text-text"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4",
                        isActive(item.href, item.exact)
                          ? "text-primary"
                          : "text-text-tertiary"
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted transition hover:bg-surface-el hover:text-text"
        >
          <Settings className="h-4 w-4" />
          Configuración
        </Link>

        {/* User profile */}
        <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <UserAvatar name={profile?.name ?? undefined} avatarUrl={profile?.image ?? undefined} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">
              {profile?.name ?? "Usuario"}
            </p>
            <p className="truncate text-xs text-text-tertiary">{profile?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-text-tertiary transition hover:text-danger"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
