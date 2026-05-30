"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

/**
 * ThemeProvider de Edition 04:
 * - Light por default (NOA-inspired).
 * - El usuario puede toggle a dark.
 * - Storage key `pistachio-theme` (sync con script inline en layout.tsx).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="pistachio-theme"
    >
      {children}
    </NextThemeProvider>
  );
}
