"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { upload } from "@vercel/blob/client";
import { Upload, File, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { recordUploadedDocument } from "@/lib/actions/documents";

interface FileUploadDropzoneProps {
  projectId: string;
  taskId?: string;
  onUploaded: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  done: boolean;
  error?: string;
}

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export function FileUploadDropzone({
  projectId,
  taskId,
  onUploaded,
}: FileUploadDropzoneProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploadingFiles((prev) => [
        ...prev,
        { file, progress: 0, done: false },
      ]);

      try {
        // 1) Cliente sube DIRECTO a Vercel Blob (saltea el limite ~4.5MB
        //    de las Vercel Functions). El route `/api/documents/upload`
        //    solo firma el token previo verificando acceso al proyecto.
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/documents/upload",
          clientPayload: JSON.stringify({ projectId, taskId }),
          onUploadProgress: ({ percentage }) => {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.file === file
                  ? { ...f, progress: Math.round(percentage) }
                  : f
              )
            );
          },
        });

        // 2) Registrar la fila en DB via server action (verifica acceso
        //    de nuevo y revalida la pagina de documentos).
        await recordUploadedDocument({
          projectId,
          taskId: taskId ?? null,
          blobUrl: blob.url,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file ? { ...f, progress: 100, done: true } : f
          )
        );
        toast.success(`${file.name} subido`);
        onUploaded();

        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
        }, 2000);
      } catch (err) {
        const message = (err as Error).message || "Error al subir";
        setUploadingFiles((prev) =>
          prev.map((f) => (f.file === file ? { ...f, error: message } : f))
        );
        // Toast con el motivo real (permiso, tamano, red, etc).
        toast.error(`${file.name}: ${message}`);
      }
    },
    [projectId, taskId, onUploaded]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // Surface rechazos del dropzone (ej. >50MB) con mensaje claro.
      fileRejections.forEach(({ file, errors }) => {
        const msg = errors.map((e) => e.message).join(", ");
        toast.error(`${file.name}: ${msg}`);
      });
      acceptedFiles.forEach(uploadFile);
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_BYTES,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragActive
            ? "border-primary bg-primary-muted"
            : "border-border hover:border-primary/50 hover:bg-surface-el"
        }`}
      >
        <input {...getInputProps()} />
        <Upload
          className={`mx-auto mb-3 h-8 w-8 ${isDragActive ? "text-primary" : "text-text-tertiary"}`}
        />
        <p className="text-sm font-medium text-text">
          {isDragActive ? "Suelta aquí" : "Arrastra archivos o haz clic"}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Máximo 25MB por archivo
        </p>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-el px-3 py-2"
            >
              <File className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-text">{f.file.name}</p>
                {!f.done && !f.error && (
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
                {f.error && (
                  <p className="text-xs text-danger">{f.error}</p>
                )}
              </div>
              {f.done && (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
