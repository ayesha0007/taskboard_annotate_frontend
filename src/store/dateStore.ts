import { create } from "zustand";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DateState {
  selectedDate: string | null; // null = show tasks across all dates
  setSelectedDate: (date: string | null) => void;
}

/**
 * Kept separate from taskStore on purpose: the date picker should never
 * need to know anything about tasks, and the board should never own
 * date-selection logic. Any component can subscribe to `selectedDate`
 * independently, keeping date logic and task UI decoupled as required
 * by the brief.
 *
 * `selectedDate` starts as null, meaning "no filter - show every task
 * regardless of its deadline". Picking a date narrows the board down to
 * just that day; clearing it goes back to showing everything.
 */
export const useDateStore = create<DateState>((set) => ({
  selectedDate: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
