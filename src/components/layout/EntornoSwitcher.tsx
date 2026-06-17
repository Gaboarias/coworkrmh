"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Shield, Layers, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { readableFg } from "@/lib/utils/color";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SwatchPicker } from "@/components/ui/SwatchPicker";
import { DEFAULT_ENTORNO_COLOR } from "@/lib/constants/entornoColors";
import { createOwnedWorkspace } from "@/lib/actions/workspaces";

interface Ws {
  id: string;
  name: string;
  color: string;
  tier?: "basic" | "premium";
}
export interface WsData {
  workspaces: Ws[];
  isAdmin: boolean;
  activeId: string | null;
}

export const EntornoSwitcher = ({ initialData }: { initialData: WsData }) => {
  const data = initialData;
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(DEFAULT_ENTORNO_COLOR);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(
          listRef.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []
        );
        if (items.length === 0) return;
        const i = items.indexOf(document.activeElement as HTMLAnchorElement);
        const nextEl =
          e.key === "ArrowDown"
            ? items[(i + 1 + items.length) % items.length]
            : items[(i - 1 + items.length) % items.length];
        nextEl?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const ws = await createOwnedWorkspace({
        name: newName.trim(),
        color: newColor,
      });
      toast.success("Entorno creado");
      window.location.href = `/api/ws/switch?to=${ws.id}&next=${encodeURIComponent(
        "/dashboard"
      )}`;
    } catch (err) {
      toast.error((err as Error).message);
      setSaving(false);
    }
  };

  const createModal = (
    <Modal
      open={creating}
      onClose={() => {
        setSaving(false);
        setCreating(false);
      }}
      title="Nuevo entorno"
      description="Un espacio aislado con sus propios proyectos y operaciones. Quedás como propietario."
    >
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label
            htmlFor="ws-new-name"
            className="mb-1.5 block text-sm font-medium text-text-muted"
          >
            Nombre
          </label>
          <Input
            id="ws-new-name"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej. Azulejos & Colores"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-text-muted">
            Color
          </span>
          <SwatchPicker
            value={newColor}
            onChange={setNewColor}
            label="Color del entorno"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCreating(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={saving} disabled={!newName.trim()}>
            <Plus className="h-4 w-4" />
            Crear entorno
          </Button>
        </div>
      </form>
    </Modal>
  );

  const active =
    data.workspaces.find((w) => w.id === data.activeId) ??
    data.workspaces[0] ??
    null;

  if (!active && !data.isAdmin) {
    return (
      <div className="mx-3 mt-3 space-y-2 rounded-lg border border-sidebar-border p-3">
        <p className="text-xs text-sidebar-muted">
          No perteneces a ningún entorno todavía.
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[color-mix(in_oklab,var(--sidebar-foreground)_10%,transparent)] px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--sidebar-foreground)_18%,transparent)]"
        >
          <Plus className="h-4 w-4" />
          Crear entorno
        </button>
        {createModal}
      </div>
    );
  }

  const next = encodeURIComponent("/dashboard");

  return (
    <div ref={ref} className="relative mx-3 mt-3">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg border border-sidebar-border bg-[color-mix(in_oklab,var(--sidebar-foreground)_6%,transparent)] py-2 pl-4 pr-3 text-left transition-colors duration-200 ease-out hover:bg-[color-mix(in_oklab,var(--sidebar-foreground)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-active"
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: active?.color ?? DEFAULT_ENTORNO_COLOR }}
        />
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
          style={{
            backgroundColor: active?.color ?? DEFAULT_ENTORNO_COLOR,
            color: readableFg(active?.color ?? DEFAULT_ENTORNO_COLOR),
          }}
        >
          <Layers className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] uppercase tracking-wider text-sidebar-muted">
            Entorno
          </span>
          <span className="block truncate text-sm font-semibold text-sidebar-foreground">
            {active?.name ?? "Administración"}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-sidebar-muted" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 origin-top animate-slide-up overflow-hidden rounded-lg border border-border bg-surface shadow-elev-3"
        >
          <ul ref={listRef} className="max-h-72 overflow-y-auto py-1">
            {data.workspaces.length === 0 && (
              <li className="px-3 py-2 text-xs text-text-muted">
                No hay entornos todavía.
              </li>
            )}
            {data.workspaces.map((w) => {
              const isActive = w.id === active?.id;
              return (
                <li key={w.id} role="option" aria-selected={isActive}>
                  <a
                    href={`/api/ws/switch?to=${w.id}&next=${next}`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-surface-el",
                      isActive ? "text-primary" : "text-text"
                    )}
                  >
                    <span
                      className="h-3 w-3 flex-shrink-0 rounded-sm"
                      style={{ backgroundColor: w.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{w.name}</span>
                    {isActive && (
                      <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setCreating(true);
            }}
            className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-el hover:text-text"
          >
            <Plus className="h-4 w-4 flex-shrink-0" />
            Crear entorno
          </button>
          {data.isAdmin && (
            <a
              href="/admin"
              className="flex items-center gap-2.5 border-t border-border px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-el hover:text-text"
            >
              <Shield className="h-4 w-4 flex-shrink-0" />
              Administración
            </a>
          )}
        </div>
      )}
      {createModal}
    </div>
  );
};
