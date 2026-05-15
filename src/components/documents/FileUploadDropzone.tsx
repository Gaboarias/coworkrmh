"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, File, CheckCircle2 } from "lucide-react";
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

export function FileUploadDropzone({
  projectId,
  taskId,
  onUploaded,
}: FileUploadDropzoneProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadFile = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      if (taskId) formData.append("taskId", taskId);

      setUploadingFiles((prev) => [
        ...prev,
        { file, progress: 0, done: false },
      ]);

      try {
        const xhr = new XMLHttpRequest();

        await new Promise<void>((resolve, reject) => {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setUploadingFiles((prev) =>
                prev.map((f) =>
                  f.file === file ? { ...f, progress } : f
                )
              );
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadingFiles((prev) =>
                prev.map((f) =>
                  f.file === file ? { ...f, progress: 100, done: true } : f
                )
              );
              resolve();
            } else {
              reject(new Error("Error al subir"));
            }
          };
          xhr.onerror = () => reject(new Error("Error de red"));

          xhr.open("POST", "/api/documents/upload");
          xhr.send(formData);
        });

        toast.success(`${file.name} subido`);
        onUploaded();

        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
        }, 2000);
      } catch (err) {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, error: (err as Error).message }
              : f
          )
        );
        toast.error(`Error subiendo ${file.name}`);
      }
    },
    [projectId, taskId, onUploaded]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach(uploadFile);
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024,
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
          Máximo 50MB por archivo
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
