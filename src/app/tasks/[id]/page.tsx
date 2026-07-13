"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ChangeEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  Check,
  CheckSquare,
  Eraser,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  List,
  Palette,
  Pen,
  Save,
  Type,
  Underline,
} from "lucide-react";
import clsx from "clsx";

import { AuthGuard } from "@/components/ui/AuthGuard";
import { Navbar } from "@/components/ui/Navbar";
import { useTaskStore } from "@/store/taskStore";
import type { Task } from "@/types/task";

const FONT_FAMILIES = ["Inter", "Georgia", "Courier New", "Comic Sans MS", "Times New Roman"];
const FONT_SIZES = [
  { label: "Small", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Large", value: "5" },
  { label: "Huge", value: "7" },
];

export default function TaskEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const taskId = Number(params.id);

  const tasks = useTaskStore((state) => state.tasks);
  const fetchTask = useTaskStore((state) => state.fetchTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const task = tasks.find((item) => item.id === taskId) ?? null;

  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  // Tracks which task's content/sketch has already been loaded into the DOM,
  // so we load it exactly once per task - as soon as both the data AND the
  // editor element actually exist - instead of relying on task?.id alone,
  // which can go stale while the editor is still showing a loading state.
  const loadedContentTaskIdRef = useRef<number | null>(null);
  const loadedSketchTaskIdRef = useRef<number | null>(null);

  const [isPenMode, setIsPenMode] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchTask(taskId)
      .catch(() => {
        if (!cancelled) setError("Could not load this task.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Loads the saved content into the editor exactly once per task, as soon
  // as the editor element is actually mounted (not gated behind isLoading,
  // and not solely keyed on task?.id which can be "already set" from stale
  // board data while the real editor DOM node doesn't exist yet).
  useEffect(() => {
    if (!task || !editorRef.current) return;
    if (loadedContentTaskIdRef.current === task.id) return;
    editorRef.current.innerHTML = task.content || "";
    loadedContentTaskIdRef.current = task.id;
  });

  useEffect(() => {
    if (!task || !canvasRef.current) return;
    if (loadedSketchTaskIdRef.current === task.id) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    loadedSketchTaskIdRef.current = task.id;
    const ctx = canvas.getContext("2d");
    if (!ctx || !task.sketch_data) return;
    const img = new window.Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = task.sketch_data;
  });

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function insertChecklistItem() {
    exec("insertHTML", "<div>&#9744;&nbsp;New item</div>");
  }

  function handleInsertImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      exec("insertImage", reader.result as string);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function getCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isPenMode) return;
    isDrawingRef.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getCanvasPoint(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isPenMode || !isDrawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getCanvasPoint(event);
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.lineWidth = isEraser ? 18 : 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#F5A623";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handlePointerUp() {
    isDrawingRef.current = false;
  }

  function clearSketch() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function handleSave(nextStatus?: Task["status"]) {
    if (!task) return;
    setIsSaving(true);
    setError(null);
    const content = editorRef.current?.innerHTML ?? "";
    const canvas = canvasRef.current;
    const sketch_data = canvas ? canvas.toDataURL("image/png") : "";
    const isBlank = (editorRef.current?.textContent?.trim().length ?? 0) === 0;

    const status: Task["status"] =
      nextStatus ?? (task.status === "todo" && !isBlank ? "in_progress" : task.status);

    try {
      await updateTask(task.id, { content, sketch_data, status });
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2000);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkDone() {
    await handleSave("done");
    router.push("/tasks");
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-10 text-sm text-muted">Loading task…</main>
      </AuthGuard>
    );
  }

  if (!task) {
    return (
      <AuthGuard>
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-10 text-sm text-danger">
          {error ?? "Task not found."}
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Navbar />
      <style>{`
        .prose-editor h1 { font-size: 1.5rem; font-weight: 700; margin: 0.6em 0 0.3em; }
        .prose-editor h2 { font-size: 1.2rem; font-weight: 600; margin: 0.6em 0 0.3em; }
        .prose-editor p { margin: 0.4em 0; }
        .prose-editor ul { list-style: disc; padding-left: 1.4rem; margin: 0.4em 0; }
        .prose-editor img { max-width: 100%; border-radius: 8px; margin: 0.5em 0; display: block; }
      `}</style>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <button
          onClick={() => router.push("/tasks")}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to board
        </button>

        <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
          <h1 className="font-display font-bold text-xl text-ink">{task.title}</h1>
          <div className="flex items-center gap-2">
            {justSaved && <span className="text-xs text-done">Saved</span>}
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-surface border border-border text-ink hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={handleMarkDone}
              disabled={isSaving || task.status === "done"}
              className="flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-full bg-done text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Check size={14} />
              Done
            </button>
          </div>
        </div>
        <p className="text-xs text-muted mb-5">
          Due {task.due_date}
          {task.due_time ? ` at ${task.due_time}` : ""} ·{" "}
          <span className="capitalize">{task.status.replace("_", " ")}</span>
        </p>

        {error && <p className="text-xs text-danger mb-3">{error}</p>}

        <div className="flex flex-wrap items-center gap-1 bg-surface border border-border rounded-card px-2 py-2 mb-3">
          <ToolButton onClick={() => exec("bold")} label="Bold">
            <Bold size={14} />
          </ToolButton>
          <ToolButton onClick={() => exec("italic")} label="Italic">
            <Italic size={14} />
          </ToolButton>
          <ToolButton onClick={() => exec("underline")} label="Underline">
            <Underline size={14} />
          </ToolButton>
          <Divider />
          <ToolButton onClick={() => exec("formatBlock", "H1")} label="Heading 1">
            <Heading1 size={14} />
          </ToolButton>
          <ToolButton onClick={() => exec("formatBlock", "H2")} label="Heading 2">
            <Heading2 size={14} />
          </ToolButton>
          <ToolButton onClick={() => exec("formatBlock", "P")} label="Paragraph">
            <Type size={14} />
          </ToolButton>
          <Divider />
          <select
            onChange={(event) => exec("fontName", event.target.value)}
            defaultValue=""
            title="Font family"
            className="text-xs bg-panel border border-border rounded-full px-2 py-1 outline-none"
          >
            <option value="" disabled>
              Font
            </option>
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <select
            onChange={(event) => exec("fontSize", event.target.value)}
            defaultValue=""
            title="Font size"
            className="text-xs bg-panel border border-border rounded-full px-2 py-1 outline-none"
          >
            <option value="" disabled>
              Size
            </option>
            {FONT_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
          <label
            title="Text color"
            className="flex items-center gap-1 text-xs bg-panel border border-border rounded-full px-2 py-1 cursor-pointer"
          >
            <Palette size={13} />
            <input
              type="color"
              onChange={(event) => exec("foreColor", event.target.value)}
              className="w-4 h-4 border-none bg-transparent cursor-pointer"
            />
          </label>
          <Divider />
          <ToolButton onClick={() => exec("justifyLeft")} label="Align left">
            <AlignLeft size={14} />
          </ToolButton>
          <ToolButton onClick={() => exec("justifyCenter")} label="Align center">
            <AlignCenter size={14} />
          </ToolButton>
          <ToolButton onClick={() => exec("justifyRight")} label="Align right">
            <AlignRight size={14} />
          </ToolButton>
          <Divider />
          <ToolButton onClick={() => exec("insertUnorderedList")} label="Bullet list">
            <List size={14} />
          </ToolButton>
          <ToolButton onClick={insertChecklistItem} label="Insert checklist item">
            <CheckSquare size={14} />
          </ToolButton>
          <label
            title="Insert image"
            className="flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-accent hover:bg-panel transition-colors cursor-pointer"
          >
            <ImageIcon size={14} />
            <input type="file" accept="image/*" className="hidden" onChange={handleInsertImage} />
          </label>
          <Divider />
          <ToolButton onClick={() => setIsPenMode((current) => !current)} label="Pen / sketch" active={isPenMode}>
            <Pen size={14} />
          </ToolButton>
          <ToolButton
            onClick={() => setIsEraser((current) => !current)}
            label="Eraser"
            active={isEraser}
            disabled={!isPenMode}
          >
            <Eraser size={14} />
          </ToolButton>
          {isPenMode && (
            <button
              onClick={clearSketch}
              className="text-xs text-muted hover:text-danger px-2 transition-colors"
            >
              Clear sketch
            </button>
          )}
        </div>

        <div className="relative bg-panel border border-border rounded-card min-h-[480px] overflow-hidden">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="prose-editor min-h-[480px] px-8 py-8 text-sm text-ink outline-none"
          />
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={clsx(
              "absolute inset-0 w-full h-full",
              isPenMode ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
            )}
          />
        </div>
      </main>
    </AuthGuard>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-border mx-1" />;
}

function ToolButton({
  onClick,
  label,
  active,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      disabled={disabled}
      className={clsx(
        "flex items-center justify-center w-7 h-7 rounded-full transition-colors disabled:opacity-40",
        active ? "bg-accent text-white" : "text-muted hover:text-ink hover:bg-panel"
      )}
    >
      {children}
    </button>
  );
}
