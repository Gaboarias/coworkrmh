"use client";

import { Check } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils/cn";

interface Member {
  id: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
}

interface AssigneePickerProps {
  members: Member[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/**
 * Multi-select de asignados (toggle por miembro). Usado en crear y editar
 * tarea. El orden de selección importa: el primero es el responsable primario.
 */
export function AssigneePicker({
  members,
  value,
  onChange,
  disabled,
}: AssigneePickerProps) {
  function toggle(id: string) {
    if (disabled) return;
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id]
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-[13px] italic text-ink-faint">
        No hay miembros para asignar.
      </p>
    );
  }

  return (
    <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-rule p-1">
      {members.map((m) => {
        const selected = value.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            disabled={disabled}
            aria-pressed={selected}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
              selected ? "bg-accent-soft" : "hover:bg-accent-soft/60",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <UserAvatar name={m.name} avatarUrl={m.avatarUrl ?? null} size="xs" />
            <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
              {m.name ?? m.email}
            </span>
            <span
              className={cn(
                "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border",
                selected
                  ? "border-ink bg-ink text-bg"
                  : "border-rule text-transparent"
              )}
            >
              {selected && <Check className="h-3 w-3" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
