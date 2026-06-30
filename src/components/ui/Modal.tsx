"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  /**
   * Si es true, cerrar por backdrop / Escape / botón X pide confirmación
   * antes de descartar. Default false → comportamiento idéntico al previo.
   * Se usa en formularios con datos sin guardar para evitar pérdida accidental.
   */
  confirmDismiss?: boolean;
}

const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

/**
 * Modal (Edition 04).
 *
 * Cambios:
 * - Overlay sin backdrop-blur (sólo opacity ink).
 * - Panel sólido bg-surface-el, sin blur.
 * - Border md rounded.
 * - Title con font-bold tracking-tight (Edition 04 typography).
 * - Header con drop-line opcional via title + description.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
  confirmDismiss = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Ref siempre fresco — evita stale closure en el listener de Escape sin
  // tener que meter confirmDismiss en las deps del effect (lo cual reejecutaría
  // el lock de overflow del body).
  const confirmDismissRef = useRef(confirmDismiss);
  confirmDismissRef.current = confirmDismiss;

  function requestClose() {
    if (
      confirmDismissRef.current &&
      typeof window !== "undefined" &&
      !window.confirm("¿Cerrar sin guardar? Se perderá lo que escribiste.")
    ) {
      return;
    }
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={requestClose}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.98, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "w-full overflow-hidden rounded-md border border-rule-strong bg-surface-el shadow-elev-3 outline-none",
          sizes[size],
          className
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
            <div>
              {title && (
                <h2 className="text-[16px] font-bold tracking-[-0.02em] text-ink">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-[15px] text-ink-soft">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Cerrar"
              className="rounded-md p-1 text-ink-faint transition-colors hover:bg-accent-soft hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-rule px-5 py-4">
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}
