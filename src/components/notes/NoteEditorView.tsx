"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link2 from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  CheckSquare, Code, Undo, Redo, Download, Save,
} from "lucide-react";
import { toast } from "sonner";
import { updateNote } from "@/lib/actions/notes";

interface NoteEditorViewProps {
  note: {
    id: string;
    title: string;
    content: unknown;
  };
  project: { id: string; name: string };
  userId: string;
  userName: string;
}

export function NoteEditorView({ note, project, userId, userName }: NoteEditorViewProps) {
  const [title, setTitle] = useState(note.title);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Ref con el save MÁS reciente: evita el stale closure de tiptap.onUpdate
  // (el editor captura la callback una sola vez; un ref siempre apunta a la
  // última versión con title/content actualizados).
  const saveFnRef = useRef<() => Promise<void>>(async () => {});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link2.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Escribe tu nota aquí..." }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    // Pasar undefined si no hay contenido (tiptap usa su doc vacío default).
    // El `{}` anterior no es un ProseMirror doc válido y podía iniciar mal.
    content: (note.content as object) ?? undefined,
    editorProps: {
      attributes: {
        class: "tiptap-editor focus:outline-none min-h-[400px] prose prose-invert max-w-none",
      },
    },
    onUpdate: () => {
      // Lee el ref → siempre la última versión de save.
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveFnRef.current(), 2000);
    },
  });

  const save = useCallback(
    async (editorInstance = editor) => {
      if (!editorInstance) return;
      setSaving(true);
      try {
        // Forzar objeto plano: tiptap getJSON() devuelve nodos con
        // prototipo que Next.js Server Actions rechaza ("Only plain
        // objects... can be passed"). El round-trip JSON.parse/stringify
        // descarta cualquier prototype/clase y deja sólo POJOs.
        const content = JSON.parse(JSON.stringify(editorInstance.getJSON()));
        await updateNote(note.id, project.id, {
          title,
          content,
          contentText: editorInstance.getText(),
        });
        setLastSaved(new Date());
      } catch (err) {
        // Surface el motivo real (permiso, sesión, conflicto, etc).
        toast.error((err as Error).message || "Error al guardar");
      } finally {
        setSaving(false);
      }
    },
    [editor, note.id, project.id, title]
  );

  // Mantener el ref apuntando al save más reciente en cada render.
  useEffect(() => {
    saveFnRef.current = () => save();
  }, [save]);

  async function handleTitleBlur() {
    if (title !== note.title) {
      await save();
    }
  }

  async function handleExportPDF() {
    if (!editor) return;
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;

    const element = document.querySelector(".ProseMirror");
    if (!element) return;

    try {
      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: "#111118",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`${title}.pdf`);
      toast.success("PDF exportado");
    } catch {
      toast.error("Error al exportar PDF");
    }
  }

  async function handleExportDocx() {
    if (!editor) return;
    try {
      const { Document, Packer, Paragraph, TextRun } = await import("docx");
      const text = editor.getText();
      const paragraphs = text.split("\n").map(
        (line) =>
          new Paragraph({
            children: [new TextRun(line)],
          })
      );

      const doc = new Document({
        sections: [{ children: paragraphs }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Word exportado");
    } catch {
      toast.error("Error al exportar Word");
    }
  }

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const toolbarBtn = "flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition hover:bg-surface-el hover:text-text disabled:opacity-40";
  const activeBtn = "bg-primary-muted text-primary";

  if (!editor) return null;

  return (
    <div className="animate-fade-in flex h-full flex-col">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-text-muted">
        <Link href={`/projects/${project.id}`} className="hover:text-text">
          {project.name}
        </Link>
        <span>/</span>
        <Link href={`/projects/${project.id}/notes`} className="hover:text-text">
          Notas
        </Link>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        className="mb-4 w-full border-none bg-transparent text-3xl font-bold text-text placeholder-text-tertiary outline-none"
        placeholder="Título de la nota"
      />

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-1 rounded-lg border border-border bg-surface p-1.5">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${toolbarBtn} ${editor.isActive("bold") ? activeBtn : ""}`}
          title="Negrita"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${toolbarBtn} ${editor.isActive("italic") ? activeBtn : ""}`}
          title="Cursiva"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${toolbarBtn} ${editor.isActive("underline") ? activeBtn : ""}`}
          title="Subrayado"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${toolbarBtn} ${editor.isActive("bulletList") ? activeBtn : ""}`}
          title="Lista"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${toolbarBtn} ${editor.isActive("orderedList") ? activeBtn : ""}`}
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`${toolbarBtn} ${editor.isActive("taskList") ? activeBtn : ""}`}
          title="Lista de tareas"
        >
          <CheckSquare className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`${toolbarBtn} ${editor.isActive("code") ? activeBtn : ""}`}
          title="Código"
        >
          <Code className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={toolbarBtn}
          title="Deshacer"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={toolbarBtn}
          title="Rehacer"
        >
          <Redo className="h-4 w-4" />
        </button>

        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-text-tertiary">
            {saving
              ? "Guardando..."
              : lastSaved
                ? `Guardado ${lastSaved.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`
                : ""}
          </span>
          <button
            onClick={() => save()}
            disabled={saving}
            className={`${toolbarBtn} ml-1`}
            title="Guardar"
          >
            <Save className="h-4 w-4" />
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={handleExportPDF}
              className={`${toolbarBtn} w-auto gap-1 px-2 text-xs`}
              title="Exportar PDF"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </button>
          </div>
          <button
            onClick={handleExportDocx}
            className={`${toolbarBtn} w-auto gap-1 px-2 text-xs`}
            title="Exportar Word"
          >
            <Download className="h-3.5 w-3.5" />
            Word
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 rounded-xl border border-border bg-surface p-6">
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
    </div>
  );
}
