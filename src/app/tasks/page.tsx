"use client";

import { Board } from "@/components/tasks/Board";
import { DateSelector } from "@/components/tasks/DateSelector";
import { DeadlineNotifier } from "@/components/tasks/DeadlineNotifier";
import { AuthGuard } from "@/components/ui/AuthGuard";
import { Navbar } from "@/components/ui/Navbar";

export default function TasksPage() {
  return (
    <AuthGuard>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="font-display font-bold text-xl text-ink">Task Board</h1>
          <div className="flex items-center gap-3">
            <DeadlineNotifier />
            <DateSelector />
          </div>
        </div>
        <Board />
      </main>
    </AuthGuard>
  );
}
