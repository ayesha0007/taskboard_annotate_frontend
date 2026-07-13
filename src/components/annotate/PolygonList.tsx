"use client";

import { Hexagon, Square, Trash2 } from "lucide-react";

import { useAnnotationStore } from "@/store/annotationStore";

export function PolygonList() {
  const { images, selectedImageId, removeShape } = useAnnotationStore();
  const selectedImage = images.find((image) => image.id === selectedImageId) ?? null;

  if (!selectedImage) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink">
        Shapes on this image ({selectedImage.polygons.length})
      </h3>

      {selectedImage.polygons.length === 0 && (
        <p className="text-xs text-muted">No shapes drawn yet.</p>
      )}

      <ul className="flex flex-col gap-1">
        {selectedImage.polygons.map((shape, index) => {
          const Icon = shape.shape_type === "box" ? Square : Hexagon;
          return (
            <li
              key={shape.id}
              className="flex items-center justify-between bg-surface border border-border rounded-card px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-ink">
                <span
                  className="w-3 h-3 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: shape.color }}
                />
                <Icon size={12} className="text-muted shrink-0" />
                <span>
                  {shape.annotation_class_detail?.name ?? `Shape ${index + 1}`}
                  <span className="text-muted"> · {shape.points.length} pts</span>
                </span>
              </span>
              <button
                onClick={() => removeShape(shape.id, selectedImage.id)}
                aria-label="Remove shape"
                className="text-muted hover:text-danger transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
