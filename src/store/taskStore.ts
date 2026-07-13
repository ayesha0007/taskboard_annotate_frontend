import { create } from "zustand";

import { api } from "@/lib/api";
import type { Task, TaskDraft, TaskStatus } from "@/types/task";

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasksForDate: (date: string | null) => Promise<void>;
  fetchTask: (id: number) => Promise<Task>;
  createTask: (draft: TaskDraft) => Promise<void>;
  updateTask: (id: number, patch: Partial<TaskDraft>) => Promise<void>;
  moveTask: (id: number, status: TaskStatus, position: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
}

// Guards against out-of-order responses: if two fetchTasksForDate calls are
// in flight (e.g. React StrictMode double-invoking effects in dev, or a
// quick date change), only the response from the most recently *issued*
// call is applied - an older call resolving late can no longer stomp over
// newer data.
let fetchSequence = 0;

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasksForDate: async (date) => {
    const requestId = ++fetchSequence;
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<{ results?: Task[] } | Task[]>("/tasks/", {
        params: date ? { date } : {},
      });
      if (requestId !== fetchSequence) return; // superseded by a newer request
      const tasks = Array.isArray(data) ? data : data.results ?? [];
      set({ tasks, isLoading: false });
    } catch {
      if (requestId !== fetchSequence) return;
      set({ error: "Could not load tasks.", isLoading: false });
    }
  },

  fetchTask: async (id) => {
    const { data } = await api.get<Task>(`/tasks/${id}/`);
    set({
      tasks: get().tasks.some((task) => task.id === id)
        ? get().tasks.map((task) => (task.id === id ? data : task))
        : [...get().tasks, data],
    });
    return data;
  },

  createTask: async (draft) => {
    const { data } = await api.post<Task>("/tasks/", draft);
    set({ tasks: [...get().tasks, data] });
  },

  updateTask: async (id, patch) => {
    const { data } = await api.patch<Task>(`/tasks/${id}/`, patch);
    set({ tasks: get().tasks.map((task) => (task.id === id ? data : task)) });
  },

  moveTask: async (id, status, position) => {
    const previous = get().tasks;
    set({
      tasks: previous.map((task) => (task.id === id ? { ...task, status, position } : task)),
    });
    try {
      await api.patch(`/tasks/${id}/`, { status, position });
    } catch {
      set({ tasks: previous, error: "Could not move the task. Please try again." });
    }
  },

  deleteTask: async (id) => {
    await api.delete(`/tasks/${id}/`);
    set({ tasks: get().tasks.filter((task) => task.id !== id) });
  },
}));
