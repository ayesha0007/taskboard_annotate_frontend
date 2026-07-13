export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string; // ISO date, e.g. "2026-07-07"
  due_time: string | null; // "HH:MM" or null
  tags: string[];
  content: string; // rich text HTML from the per-task document editor
  sketch_data: string; // base64 PNG data URL from the freehand sketch layer
  position: number;
  created_at: string;
  updated_at: string;
}

export type TaskDraft = Omit<Task, "id" | "created_at" | "updated_at" | "position">;

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];
