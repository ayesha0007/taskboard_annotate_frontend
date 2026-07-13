"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import { Flag, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import clsx from "clsx";

import { useTaskStore } from "@/store/taskStore";
import type { Task } from "@/types/task";

const PRIORITY_STYLES: Record<Task["priority"], string> = {
  low: "bg-todo/10 text-todo",
  medium: "bg-progress/10 text-progress",
  high: "bg-danger/10 text-danger",
};

const STICKY_COLORS = ["#FFF3B0", "#FFD9E8", "#C9F2D8", "#CDE7FF", "#FFE2C6", "#E4D9FF"];
const STICKY_ROTATIONS = [-3, -1.5, 1.5, 3, -2.5, 2];

function pickByTaskId<T>(pool: T[], id: number): T {
  return pool[id % pool.length]!;
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const rotation = pickByTaskId(STICKY_ROTATIONS, task.id);
  const background = pickByTaskId(STICKY_COLORS, task.id);

  const transformCss = transform ? CSS.Transform.toString(transform) : undefined;
  const rotateCss = `rotate(${isDragging ? 0 : rotation}deg)`;

  const style = {
    transform: [transformCss, rotateCss].filter(Boolean).join(" "),
    transition,
    opacity: isDragging ? 0.6 : 1,
    backgroundColor: background,
  };

  async function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (!window.confirm("Delete this task?")) return;
    await deleteTask(task.id);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={clsx(
        "group relative border border-black/5 rounded-md p-3 cursor-grab active:cursor-grabbing",
        "shadow-[2px_4px_10px_rgba(0,0,0,0.18)] hover:shadow-[3px_6px_14px_rgba(0,0,0,0.24)]",
        "hover:-translate-y-0.5 transition-all duration-150"
      )}
    >
      <span
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white/70 border border-black/10 shadow-sm"
        aria-hidden
      />

      <button
        onClick={handleDelete}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="Delete task"
        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/10 text-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-danger hover:text-white transition-all"
      >
        <Trash2 size={11} />
      </button>

      <p className="text-sm font-medium text-[#3A2E1F] mb-2 leading-snug pr-4">{task.title}</p>
      <div className="flex items-center justify-between gap-2">
        <span
          className={clsx(
            "flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium capitalize",
            PRIORITY_STYLES[task.priority]
          )}
        >
          <Flag size={10} />
          {task.priority}
        </span>
        <span className="text-[11px] text-[#3A2E1F]/70">{format(parseISO(task.due_date), "MMM d")}</span>
      </div>
      {task.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2">
          {task.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[11px] text-[#3A2E1F]/70 bg-black/5 px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
