"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, File, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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

// 4 MB — límite práctico del body de las Vercel Functions (server-side put()).
const MAX_BYTES = 4 * 1024 * 1024;

export function FileUploadDropzone({
  projectId,
  taskId,
  onUploaded,
}: FileUploadDropzoneProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadFile = useCallback(
    (file: File) => {
      setUploadingFiles((prev) => [
        ...prev,
        { file, progress: 0, done: false },
      ]);

      // POST multipart a /api/documents/upload (server-side put() + insert DB).
      // XHR para tener barra de progreso real durante la subida.
      const form = new FormData();
      form.append("file", file);
      form.append("projectId", projectId);
      form.append("taskId", taskId ?? "null");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/documents/upload");

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        setUploadingFiles((prev) =>
          prev.map((f) => (f.file === file ? { ...f, progress: pct } : f))
        );
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
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
        } else {
          let msg = "Error al subir";
          try {
            msg = (JSON.parse(xhr.responseText) as { error?: string }).error ?? msg;
          } catch {
            /* respuesta no JSON */
          }
          setUploadingFiles((prev) =>
            prev.map((f) => (f.file === file ? { ...f, error: msg } : f))
          );
          toast.error(`${file.name}: ${msg}`);
        }
      };

      xhr.onerror = () => {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file ? { ...f, error: "Error de red" } : f
          )
        );
        toast.error(`${file.name}: error de red`);
      };

      xhr.send(form);
    },
    [projectId, taskId, onUploaded]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
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
          className={`mx-auto mb-3 h-8 w-8 ${
            isDragActive ? "text-primary" : "text-text-tertiary"
          }`}
        />
        <p className="text-sm font-medium text-text">
          {isDragActive ? "Suelta aquí" : "Arrastra archivos o haz clic"}
        </p>
        <p className="mt-1 text-xs text-text-muted">Máximo 4 MB por archivo</p>
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
                {f.error && <p className="text-xs text-danger">{f.error}</p>}
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
