"use client";

import { MotionConfig } from "motion/react";

/**
 * Provider de animaciones (motion / Framer Motion).
 * `reducedMotion="user"` respeta la preferencia del sistema (prefers-reduced-
 * motion): si el usuario pidió menos movimiento, motion desactiva las
 * animaciones automáticamente. Envuelve el AppShell para que cualquier
 * componente `motion.*` herede esta config.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
