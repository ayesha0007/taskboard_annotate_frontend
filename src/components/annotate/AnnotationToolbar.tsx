"use client";

import { Check, Hand, Hexagon, Pencil, Plus, Square, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import clsx from "clsx";

import { useAnnotationStore } from "@/store/annotationStore";
import type { DrawMode } from "@/types/annotation";

const MODES: { value: DrawMode; label: string; icon: typeof Square }[] = [
  { value: "box", label: "Box (drag)", icon: Square },
  { value: "polygon", label: "Polygon (click points)", icon: Hexagon },
  { value: "pen", label: "Pen (freehand trace)", icon: Pencil },
  { value: "pan", label: "Pan (drag to move around when zoomed in)", icon: Hand },
];

const CLASS_COLOR_POOL = ["#5B8DEF", "#39C48F", "#F5A623", "#EF5B5B", "#B15BEF", "#22B8CF"];

export function AnnotationToolbar() {
  const {
    shapeMode,
    setShapeMode,
    classes,
    selectedClassId,
    setSelectedClass,
    createClass,
    updateClass,
    deleteClass,
  } = useAnnotationStore();
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  async function handleAddClass(event: FormEvent) {
    event.preventDefault();
    const name = newClassName.trim();
    if (!name) return;
    const color = CLASS_COLOR_POOL[classes.length % CLASS_COLOR_POOL.length]!;
    await createClass(name, color);
    setNewClassName("");
    setIsAddingClass(false);
  }

  function startEditing(id: number, currentName: string) {
    setEditingClassId(id);
    setEditingName(currentName);
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (editingClassId === null) return;
    const name = editingName.trim();
    if (!name) {
      setEditingClassId(null);
      return;
    }
    await updateClass(editingClassId, name);
    setEditingClassId(null);
  }

  async function handleDeleteClass(event: React.MouseEvent, id: number) {
    event.stopPropagation();
    if (!window.confirm("Delete this class? Shapes using it will become unlabeled.")) return;
    await deleteClass(id);
  }

  return (
    <div className="flex flex-wrap items-center gap-4 bg-panel border border-border rounded-card px-4 py-3 animate-fade-in">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted mr-1">Draw mode</span>
        {MODES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setShapeMode(value)}
            title={label}
            className={clsx(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all",
              shapeMode === value
                ? "bg-accent text-white font-medium shadow-glow"
                : "text-muted hover:text-ink hover:bg-surface"
            )}
          >
            <Icon size={13} />
            {value === "box" ? "Box" : value === "polygon" ? "Polygon" : value === "pen" ? "Pen" : "Pan"}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-border hidden sm:block" />

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted">Class</span>
        {classes.length === 0 && !isAddingClass && (
          <span className="text-xs text-muted italic">No classes yet</span>
        )}
        {classes.map((cls) => {
          const isEditing = editingClassId === cls.id;

          if (isEditing) {
            return (
              <form key={cls.id} onSubmit={handleSaveEdit} className="flex items-center gap-1">
                <input
                  autoFocus
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  onBlur={handleSaveEdit}
                  className="text-xs bg-surface border border-accent rounded-full px-2.5 py-1 outline-none w-28"
                />
                <button
                  type="submit"
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-done text-white shrink-0"
                >
                  <Check size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingClassId(null)}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-surface text-muted shrink-0"
                >
                  <X size={11} />
                </button>
              </form>
            );
          }

          return (
            <div
              key={cls.id}
              className={clsx(
                "group flex items-center gap-1 rounded-full border transition-colors",
                selectedClassId === cls.id ? "border-transparent" : "border-border"
              )}
              style={selectedClassId === cls.id ? { backgroundColor: cls.color } : undefined}
            >
              <button
                onClick={() => setSelectedClass(cls.id)}
                className={clsx(
                  "flex items-center gap-1.5 text-xs pl-2.5 pr-1 py-1 rounded-full",
                  selectedClassId === cls.id ? "text-white" : "text-muted hover:text-ink"
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cls.color }} />
                {cls.name}
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  startEditing(cls.id, cls.name);
                }}
                title="Rename class"
                className={clsx(
                  "w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
                  selectedClassId === cls.id ? "text-white/80 hover:text-white" : "text-muted hover:text-accent"
                )}
              >
                <Pencil size={10} />
              </button>
              <button
                onClick={(event) => handleDeleteClass(event, cls.id)}
                title="Delete class"
                className={clsx(
                  "w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-0.5",
                  selectedClassId === cls.id ? "text-white/80 hover:text-white" : "text-muted hover:text-danger"
                )}
              >
                <Trash2 size={10} />
              </button>
            </div>
          );
        })}

        {isAddingClass ? (
          <form onSubmit={handleAddClass} className="flex items-center gap-1">
            <input
              autoFocus
              value={newClassName}
              onChange={(event) => setNewClassName(event.target.value)}
              onBlur={() => !newClassName && setIsAddingClass(false)}
              placeholder="Class name"
              className="text-xs bg-surface border border-border rounded-full px-2.5 py-1 outline-none focus:border-accent w-28"
            />
          </form>
        ) : (
          <button
            onClick={() => setIsAddingClass(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-dashed border-border text-muted hover:text-accent hover:border-accent transition-colors"
          >
            <Plus size={12} />
            New class
          </button>
        )}
      </div>
    </div>
  );
}
