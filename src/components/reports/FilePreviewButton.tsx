"use client";

import { useState, type CSSProperties } from "react";
import { Eye } from "lucide-react";
import { FilePreviewModal } from "@/components/documents/FilePreviewModal";

/**
 * Botón reutilizable que abre el preview de un archivo (FilePreviewModal).
 * Usado en el report builder (admin) y en el portal de clientes.
 */
export function FilePreviewButton({
  name,
  blobUrl,
  mimeType,
  label,
  className,
  style,
  iconClassName,
}: {
  name: string;
  blobUrl: string;
  mimeType: string | null;
  label?: string;
  className?: string;
  style?: CSSProperties;
  iconClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        style={style}
        title="Vista previa"
        aria-label={`Vista previa de ${name}`}
      >
        <Eye className={iconClassName ?? "h-3.5 w-3.5"} />
        {label ? <span>{label}</span> : null}
      </button>
      {open && (
        <FilePreviewModal
          doc={{ name, blobUrl, mimeType: mimeType ?? "application/octet-stream" }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
