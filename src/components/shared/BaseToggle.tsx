"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

type Base = "navy" | "pine";

export function BaseToggle() {
  const [base, setBase] = useState<Base>("navy");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored =
      (localStorage.getItem("pistachio-base") as Base | null) ?? "navy";
    setBase(stored);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Base = base === "navy" ? "pine" : "navy";
    setBase(next);
    try {
      localStorage.setItem("pistachio-base", next);
    } catch {
      /* ignore */
    }
    if (next === "pine") {
      document.documentElement.setAttribute("data-base", "pine");
    } else {
      document.documentElement.removeAttribute("data-base");
    }
  }

  const label =
    base === "navy" ? "Cambiar a base Pino" : "Cambiar a base Navy";

  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={mounted ? label : "Cambiar paleta"}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors duration-200 ease-out hover:bg-surface-el hover:text-text"
    >
      <Palette className="h-4 w-4" />
    </button>
  );
}
