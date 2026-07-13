"use client";

import { useMemo } from "react";

import { useAnnotationStore } from "@/store/annotationStore";

interface StatCardProps {
  label: string;
  value: number;
  accentClassName?: string;
  delayMs: number;
}

function StatCard({ label, value, accentClassName, delayMs }: StatCardProps) {
  return (
    <div
      className="flex-1 min-w-[110px] bg-panel border border-border rounded-card px-4 py-3 animate-scale-in"
      style={{ animationDelay: `${delayMs}ms`, animationFillMode: "backwards" }}
    >
      <p className={`text-2xl font-display font-bold ${accentClassName ?? "text-ink"}`}>{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  );
}

export function AnnotationStats() {
  const images = useAnnotationStore((state) => state.images);
  const classes = useAnnotationStore((state) => state.classes);

  const { annotated, remaining } = useMemo(() => {
    const annotatedCount = images.filter((image) => image.polygons.length > 0).length;
    return { annotated: annotatedCount, remaining: images.length - annotatedCount };
  }, [images]);

  return (
    <div className="flex gap-3 flex-wrap">
      <StatCard label="Total images" value={images.length} delayMs={0} />
      <StatCard label="Annotated" value={annotated} accentClassName="text-done" delayMs={60} />
      <StatCard label="Remaining" value={remaining} accentClassName="text-progress" delayMs={120} />
      <StatCard label="Classes" value={classes.length} accentClassName="text-accent" delayMs={180} />
    </div>
  );
}
