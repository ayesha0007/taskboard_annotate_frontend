"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { Button } from "@/components/ui/Button";
import { useDateStore } from "@/store/dateStore";
import { useTaskStore } from "@/store/taskStore";
import { STATUS_LABELS, STATUS_ORDER, type Task, type TaskStatus } from "@/types/task";
import { Column } from "./Column";
import { TaskModal } from "./TaskModal";

function isTaskStatus(value: string): value is TaskStatus {
  return STATUS_ORDER.includes(value as TaskStatus);
}

export function Board() {
  const router = useRouter();
  const { selectedDate } = useDateStore();
  const { tasks, isLoading, error, fetchTasksForDate, moveTask } = useTaskStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    fetchTasksForDate(selectedDate);
  }, [selectedDate, fetchTasksForDate]);

  function openCreateModal() {
    setIsModalOpen(true);
  }

  function openTask(task: Task) {
    router.push(`/tasks/${task.id}`);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = Number(active.id);
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    // `over.id` is either a column id (dropped on empty column area)
    // or another task's id (dropped on/near a card)
    const overIsColumn = isTaskStatus(String(over.id));
    const newStatus: TaskStatus = overIsColumn
      ? (over.id as TaskStatus)
      : tasks.find((item) => item.id === Number(over.id))?.status ?? task.status;

    const tasksInTargetColumn = tasks.filter(
      (item) => item.status === newStatus && item.id !== task.id
    );
    const newPosition = tasksInTargetColumn.length;

    if (newStatus !== task.status || newPosition !== task.position) {
      moveTask(task.id, newStatus, newPosition);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button onClick={openCreateModal}>+ Add task</Button>
      </div>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      {isLoading && <p className="text-sm text-muted mb-3">Loading tasks…</p>}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STATUS_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              title={STATUS_LABELS[status]}
              tasks={tasks
                .filter((task) => task.status === status)
                .sort((a, b) => a.position - b.position)}
              onTaskClick={openTask}
            />
          ))}
        </div>
      </DndContext>

      <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} task={null} />
    </div>
  );
}
