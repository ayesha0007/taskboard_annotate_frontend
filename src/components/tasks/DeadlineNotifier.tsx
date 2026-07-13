"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { PartyPopper, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import { useTaskStore } from "@/store/taskStore";
import type { Task } from "@/types/task";

type Mood = "calm" | "alert" | "worried" | "panicked" | "hooray";

interface UrgencyInfo {
  mood: Mood;
  daysUntil: number;
}

function urgencyFor(task: Task): UrgencyInfo {
  const daysUntil = differenceInCalendarDays(parseISO(task.due_date), new Date());
  if (daysUntil <= 0) return { mood: "panicked", daysUntil };
  if (daysUntil === 1) return { mood: "worried", daysUntil };
  if (daysUntil <= 3) return { mood: "alert", daysUntil };
  return { mood: "calm", daysUntil };
}

function dueLabel(daysUntil: number): string {
  if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)}d`;
  if (daysUntil === 0) return "Due today";
  if (daysUntil === 1) return "Due tomorrow";
  return `Due in ${daysUntil}d`;
}

const MOOD_BADGE: Record<Mood, string> = {
  calm: "bg-done",
  alert: "bg-progress",
  worried: "bg-progress",
  panicked: "bg-danger",
  hooray: "bg-done",
};

const MOOD_RING: Record<Mood, string> = {
  calm: "ring-done/30",
  alert: "ring-progress/40",
  worried: "ring-progress/50",
  panicked: "ring-danger/60",
  hooray: "ring-done/50",
};

const MOOD_SCALE: Record<Mood, number> = {
  calm: 1,
  alert: 1.08,
  worried: 1.16,
  panicked: 1.28,
  hooray: 1.18,
};

function CharacterFace({ mood }: { mood: Mood }) {
  return (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <circle cx="20" cy="20" r="18" fill="#FFD37A" stroke="#00000022" strokeWidth="1" />
      {mood === "hooray" ? (
        <>
          <path d="M11 18 Q14 14 17 18" stroke="#3A2E1F" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M23 18 Q26 14 29 18" stroke="#3A2E1F" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path
            d="M12 24 Q20 33 28 24"
            stroke="#3A2E1F"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : mood === "panicked" ? (
        <>
          <circle cx="14" cy="19" r="3.4" fill="#3A2E1F" />
          <circle cx="26" cy="19" r="3.4" fill="#3A2E1F" />
          <path d="M9 12 L18 15" stroke="#3A2E1F" strokeWidth="2" strokeLinecap="round" />
          <path d="M31 12 L22 15" stroke="#3A2E1F" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="20" cy="28" rx="4.5" ry="5.5" fill="#3A2E1F" />
          <path d="M30 16 q3 2 1 6" stroke="#6FC1FF" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : mood === "worried" ? (
        <>
          <circle cx="14" cy="19" r="2.6" fill="#3A2E1F" />
          <circle cx="26" cy="19" r="2.6" fill="#3A2E1F" />
          <path
            d="M10 14 Q14 12 18 14.5"
            stroke="#3A2E1F"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M30 14 Q26 12 22 14.5"
            stroke="#3A2E1F"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx="20" cy="27" rx="3" ry="3.2" fill="#3A2E1F" />
        </>
      ) : mood === "alert" ? (
        <>
          <circle cx="14" cy="19" r="2.4" fill="#3A2E1F" />
          <circle cx="26" cy="19" r="2.4" fill="#3A2E1F" />
          <path d="M11 14 L18 15.5" stroke="#3A2E1F" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M29 14 L22 15.5" stroke="#3A2E1F" strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M14 27 Q20 24 26 27"
            stroke="#3A2E1F"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="14" cy="19" r="2.2" fill="#3A2E1F" />
          <circle cx="26" cy="19" r="2.2" fill="#3A2E1F" />
          <path
            d="M14 26 Q20 30 26 26"
            stroke="#3A2E1F"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export function DeadlineNotifier() {
  const tasks = useTaskStore((state) => state.tasks);
  const [isOpen, setIsOpen] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);
  const previousStatuses = useRef<Record<number, Task["status"]>>({});
  const celebrationTimeout = useRef<number | null>(null);

  useEffect(() => {
    const previous = previousStatuses.current;
    for (const task of tasks) {
      const prevStatus = previous[task.id];
      if (prevStatus && prevStatus !== "done" && task.status === "done") {
        setCelebration(task.title);
        if (celebrationTimeout.current) window.clearTimeout(celebrationTimeout.current);
        celebrationTimeout.current = window.setTimeout(() => setCelebration(null), 4000);
      }
    }
    const next: Record<number, Task["status"]> = {};
    for (const task of tasks) next[task.id] = task.status;
    previousStatuses.current = next;
  }, [tasks]);

  useEffect(() => {
    return () => {
      if (celebrationTimeout.current) window.clearTimeout(celebrationTimeout.current);
    };
  }, []);

  const activeTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== "done")
        .map((task) => ({ task, ...urgencyFor(task) }))
        .sort((a, b) => a.daysUntil - b.daysUntil),
    [tasks]
  );

  const mood: Mood = celebration ? "hooray" : activeTasks[0]?.mood ?? "calm";
  const urgentCount = activeTasks.filter((item) => item.daysUntil <= 1).length;
  const scale = MOOD_SCALE[mood];

  let headline: string;
  let subtext: string;
  if (celebration) {
    headline = "Nice work!";
    subtext = `"${celebration}" done`;
  } else if (activeTasks.length === 0) {
    headline = "All clear";
    subtext = "No pending deadlines";
  } else {
    const nearest = activeTasks[0]!;
    headline =
      mood === "panicked" ? "Deadline alert!" : mood === "worried" ? "Due tomorrow" : "Coming up";
    subtext = `${nearest.task.title} · ${dueLabel(nearest.daysUntil)}`;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Deadline reminders"
        title="Deadline reminders"
        className={clsx(
          "flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full bg-panel border border-border",
          "shadow-card hover:shadow-glow transition-shadow ring-2",
          MOOD_RING[mood]
        )}
      >
        <span className="relative w-9 h-9 shrink-0 flex items-center justify-center">
          {(mood === "panicked" || mood === "worried") && (
            <span
              className={clsx(
                "absolute inset-0 rounded-full animate-ping opacity-40",
                MOOD_BADGE[mood]
              )}
            />
          )}
          <span
            className={clsx("relative w-8 h-8 transition-transform duration-300", mood === "panicked" && "animate-bounce")}
            style={{ transform: `scale(${scale})` }}
          >
            <CharacterFace mood={mood} />
          </span>
        </span>

        <span className="flex flex-col items-start leading-tight text-left">
          <span className="text-xs font-semibold text-ink">{headline}</span>
          <span className="text-[10px] text-muted max-w-[140px] truncate">{subtext}</span>
        </span>

        {urgentCount > 0 && !celebration && (
          <span className="w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            {urgentCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-panel border border-border rounded-card shadow-card p-3 z-40 animate-scale-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-ink">Reminders</h3>
            <button onClick={() => setIsOpen(false)} className="text-muted hover:text-ink">
              <X size={14} />
            </button>
          </div>

          {celebration && (
            <div className="flex items-center gap-2 bg-done/10 text-done text-xs rounded-card px-3 py-2 mb-2">
              <PartyPopper size={14} />
              &quot;{celebration}&quot; completed - hooray!
            </div>
          )}

          {activeTasks.length === 0 ? (
            <p className="text-xs text-muted py-4 text-center">No pending deadlines. All clear!</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {activeTasks.map(({ task, daysUntil, mood: taskMood }) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-2 text-xs bg-surface rounded-card px-2.5 py-2"
                >
                  <span className="text-ink truncate">{task.title}</span>
                  <span
                    className={clsx(
                      "shrink-0 px-2 py-0.5 rounded-full text-white font-medium",
                      MOOD_BADGE[taskMood]
                    )}
                  >
                    {dueLabel(daysUntil)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
