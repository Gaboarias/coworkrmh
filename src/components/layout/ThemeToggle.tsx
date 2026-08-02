"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

/**
 * Toggle light ↔ dark. Sin system option (decisión de Edition 04 —
 * dos modos explícitos, cuidados por igual).
 *
 * Se renderiza después de mount para evitar hydration mismatch
 * (next-themes guidance: el value real sólo existe client-side).
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <IconButton label="Cambiar tema">
        <Sun className="h-4 w-4" />
      </IconButton>
    );
  }

  const isDark = theme === "dark";

  return (
    <IconButton
      onClick={() => setTheme(isDark ? "light" : "dark")}
      label={isDark ? "Activar light theme" : "Activar dark theme"}
      title={isDark ? "Light" : "Dark"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </IconButton>
  );
}
