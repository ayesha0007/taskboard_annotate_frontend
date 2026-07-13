"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { todayISO, useDateStore } from "@/store/dateStore";
import { useTaskStore } from "@/store/taskStore";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = creating a new task, otherwise editing this task */
  task: Task | null;
}

function emptyFormFor(selectedDate: string | null) {
  return {
    title: "",
    description: "",
    status: "todo" as TaskStatus,
    priority: "medium" as TaskPriority,
    tags: "",
    due_date: selectedDate ?? todayISO(),
    due_time: "",
  };
}

export function TaskModal({ isOpen, onClose, task }: TaskModalProps) {
  const { selectedDate, setSelectedDate } = useDateStore();
  const { createTask, updateTask, deleteTask } = useTaskStore();
  const [form, setForm] = useState(emptyFormFor(selectedDate));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.tags.join(", "),
        due_date: task.due_date,
        due_time: task.due_time ?? "",
      });
    } else {
      setForm(emptyFormFor(selectedDate));
    }
    setError(null);
  }, [task, isOpen, selectedDate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError("Title is required.");
      return;
    }
    if (!form.due_date) {
      setError("Deadline date is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      if (task) {
        await updateTask(task.id, {
          title,
          description: form.description,
          status: form.status,
          priority: form.priority,
          tags,
          due_date: form.due_date,
          due_time: form.due_time || null,
        });
      } else {
        await createTask({
          title,
          description: form.description,
          status: form.status,
          priority: form.priority,
          tags,
          due_date: form.due_date,
          due_time: form.due_time || null,
          content: "",
          sketch_data: "",
        });
      }
      // The board can be filtered to a single day - if a filter is active
      // and the deadline lands on a different day, jump the view there so
      // the task doesn't seem to disappear. No jump needed when viewing
      // "All tasks" (selectedDate === null), since it'll already show up.
      if (selectedDate && form.due_date !== selectedDate) {
        setSelectedDate(form.due_date);
      }
      onClose();
    } catch {
      setError("Something went wrong while saving the task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    setIsSubmitting(true);
    try {
      await deleteTask(task.id);
      onClose();
    } catch {
      setError("Could not delete the task. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? "Edit task" : "New task"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-muted block mb-1">Title</label>
          <Input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="e.g. Design the login page"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Description</label>
          <Textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={3}
            placeholder="Optional details..."
          />
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Deadline</label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={form.due_date}
              onChange={(event) => setForm({ ...form, due_date: event.target.value })}
              className="w-full bg-surface border border-border rounded-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
            <input
              type="time"
              value={form.due_time}
              onChange={(event) => setForm({ ...form, due_time: event.target.value })}
              className="w-full bg-surface border border-border rounded-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
          {selectedDate && form.due_date && form.due_date !== selectedDate && (
            <p className="text-[11px] text-progress mt-1">
              This is a different day than the one you&apos;re viewing - the board will jump to{" "}
              {form.due_date} after saving.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted block mb-1">Status</label>
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}
              className="w-full bg-surface border border-border rounded-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Priority</label>
            <select
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value as TaskPriority })
              }
              className="w-full bg-surface border border-border rounded-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Tags (comma separated)</label>
          <Input
            value={form.tags}
            onChange={(event) => setForm({ ...form, tags: event.target.value })}
            placeholder="frontend, urgent"
          />
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex items-center justify-between mt-2">
          {task ? (
            <Button type="button" variant="danger" onClick={handleDelete} disabled={isSubmitting}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {task ? "Save changes" : "Add task"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
