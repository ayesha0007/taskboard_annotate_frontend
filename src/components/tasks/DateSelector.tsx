"use client";

import { format, parseISO } from "date-fns";
import { X } from "lucide-react";

import { useDateStore } from "@/store/dateStore";

export function DateSelector() {
  const { selectedDate, setSelectedDate } = useDateStore();

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="board-date" className="text-sm text-muted">
        {selectedDate ? "Showing tasks for" : "Showing"}
      </label>
      <input
        id="board-date"
        type="date"
        value={selectedDate ?? ""}
        onChange={(event) => setSelectedDate(event.target.value || null)}
        className="bg-surface border border-border rounded-card px-3 py-1.5 text-sm text-ink focus:border-accent outline-none"
      />
      {selectedDate ? (
        <>
          <span className="text-sm text-muted hidden sm:inline">
            {format(parseISO(selectedDate), "EEEE, MMM d")}
          </span>
          <button
            onClick={() => setSelectedDate(null)}
            title="Clear date filter - show all tasks"
            className="flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors"
          >
            <X size={13} />
            All tasks
          </button>
        </>
      ) : (
        <span className="text-sm text-accent bg-accent-soft px-2.5 py-1 rounded-full">
          All tasks
        </span>
      )}
    </div>
  );
}
