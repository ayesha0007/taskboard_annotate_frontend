"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";

import type { Task, TaskStatus } from "@/types/task";
import { TaskCard } from "./TaskCard";

const COLUMN_DOT: Record<TaskStatus, string> = {
  todo: "bg-todo",
  in_progress: "bg-progress",
  done: "bg-done",
};

interface ColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function Column({ status, title, tasks, onTaskClick }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex-1 min-w-[260px] bg-surface border border-border rounded-card p-3 flex flex-col gap-2 transition-shadow",
        isOver && "ring-2 ring-accent/40"
      )}
    >
      <div className="flex items-center justify-between mb-1 px-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className={clsx("w-2 h-2 rounded-full", COLUMN_DOT[status])} />
          {title}
        </h3>
        <span className="text-xs text-muted bg-panel border border-border px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[80px]">
          {tasks.length === 0 && (
            <p className="text-xs text-muted text-center py-6 border border-dashed border-border rounded-card">
              No tasks here yet.
            </p>
          )}
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
