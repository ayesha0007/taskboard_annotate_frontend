import { create } from "zustand";

import { api } from "@/lib/api";
import type {
  AnnotationClass,
  AnnotationImage,
  DrawMode,
  Point,
  Polygon,
  ShapeType,
} from "@/types/annotation";

interface AnnotationState {
  images: AnnotationImage[];
  classes: AnnotationClass[];
  selectedImageId: number | null;
  selectedClassId: number | null;
  shapeMode: DrawMode;
  isLoading: boolean;
  uploadingFiles: string[];
  error: string | null;

  fetchImages: () => Promise<void>;
  fetchClasses: () => Promise<void>;
  uploadImages: (files: FileList | File[]) => Promise<void>;
  deleteImage: (id: number) => Promise<void>;
  selectImage: (id: number) => void;
  setShapeMode: (mode: DrawMode) => void;
  setSelectedClass: (id: number | null) => void;
  createClass: (name: string, color: string) => Promise<AnnotationClass>;
  updateClass: (id: number, name: string) => Promise<void>;
  deleteClass: (id: number) => Promise<void>;
  addShape: (imageId: number, points: Point[], shapeType: ShapeType) => Promise<Polygon>;
  removeShape: (shapeId: number, imageId: number) => Promise<void>;
  updateShapeClass: (shapeId: number, imageId: number, classId: number | null) => Promise<void>;
  /** Recreates a shape with the given points/color/class/type - used to undo a delete or redo an add. */
  restoreShape: (
    imageId: number,
    shape: Pick<Polygon, "points" | "color" | "shape_type" | "annotation_class">
  ) => Promise<Polygon>;
}

const PALETTE = ["#5B8DEF", "#39C48F", "#F5A623", "#EF5B5B", "#B15BEF", "#22B8CF", "#F06292"];

function colorForIndex(index: number): string {
  return PALETTE[index % PALETTE.length]!;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  images: [],
  classes: [],
  selectedImageId: null,
  selectedClassId: null,
  shapeMode: "box",
  isLoading: false,
  uploadingFiles: [],
  error: null,

  fetchImages: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<{ results?: AnnotationImage[] } | AnnotationImage[]>(
        "/annotations/images/"
      );
      const images = Array.isArray(data) ? data : data.results ?? [];
      set({
        images,
        isLoading: false,
        selectedImageId: get().selectedImageId ?? images[0]?.id ?? null,
      });
    } catch {
      set({ error: "Could not load images.", isLoading: false });
    }
  },

  fetchClasses: async () => {
    try {
      const { data } = await api.get<{ results?: AnnotationClass[] } | AnnotationClass[]>(
        "/annotations/classes/"
      );
      const classes = Array.isArray(data) ? data : data.results ?? [];
      set({ classes, selectedClassId: get().selectedClassId ?? classes[0]?.id ?? null });
    } catch {
      set({ error: "Could not load classes." });
    }
  },

  uploadImages: async (files) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    set({ uploadingFiles: fileArray.map((file) => file.name), error: null });
    const uploaded: AnnotationImage[] = [];
    const failed: string[] = [];

    for (const file of fileArray) {
      const formData = new FormData();
      formData.append("image", file);
      try {
        const { data } = await api.post<AnnotationImage>("/annotations/images/", formData);
        uploaded.push(data);
      } catch {
        failed.push(file.name);
      } finally {
        set({ uploadingFiles: get().uploadingFiles.filter((name) => name !== file.name) });
      }
    }

    set({
      images: [...uploaded, ...get().images],
      selectedImageId: uploaded[0]?.id ?? get().selectedImageId,
      error: failed.length > 0 ? `Failed to upload: ${failed.join(", ")}` : null,
    });
  },

  deleteImage: async (id) => {
    await api.delete(`/annotations/images/${id}/`);
    const remaining = get().images.filter((image) => image.id !== id);
    set({
      images: remaining,
      selectedImageId: get().selectedImageId === id ? remaining[0]?.id ?? null : get().selectedImageId,
    });
  },

  selectImage: (id) => set({ selectedImageId: id }),
  setShapeMode: (mode) => set({ shapeMode: mode }),
  setSelectedClass: (id) => set({ selectedClassId: id }),

  createClass: async (name, color) => {
    const { data } = await api.post<AnnotationClass>("/annotations/classes/", { name, color });
    set({ classes: [...get().classes, data], selectedClassId: data.id });
    return data;
  },

  updateClass: async (id, name) => {
    const { data } = await api.patch<AnnotationClass>(`/annotations/classes/${id}/`, { name });
    set({
      classes: get().classes.map((cls) => (cls.id === id ? data : cls)),
      images: get().images.map((image) => ({
        ...image,
        polygons: image.polygons.map((polygon) =>
          polygon.annotation_class === id ? { ...polygon, annotation_class_detail: data } : polygon
        ),
      })),
    });
  },

  deleteClass: async (id) => {
    await api.delete(`/annotations/classes/${id}/`);
    set({
      classes: get().classes.filter((cls) => cls.id !== id),
      selectedClassId: get().selectedClassId === id ? null : get().selectedClassId,
      images: get().images.map((image) => ({
        ...image,
        polygons: image.polygons.map((polygon) =>
          polygon.annotation_class === id
            ? { ...polygon, annotation_class: null, annotation_class_detail: null }
            : polygon
        ),
      })),
    });
  },

  addShape: async (imageId, points, shapeType) => {
    const { selectedClassId, classes, images } = get();
    const selectedClass = classes.find((cls) => cls.id === selectedClassId);
    const color = selectedClass?.color ?? colorForIndex(images.length);

    const { data } = await api.post<Polygon>("/annotations/polygons/", {
      image: imageId,
      points,
      color,
      shape_type: shapeType,
      annotation_class: selectedClassId,
    });
    set({
      images: get().images.map((image) =>
        image.id === imageId ? { ...image, polygons: [...image.polygons, data] } : image
      ),
    });
    return data;
  },

  removeShape: async (shapeId, imageId) => {
    await api.delete(`/annotations/polygons/${shapeId}/`);
    set({
      images: get().images.map((image) =>
        image.id === imageId
          ? { ...image, polygons: image.polygons.filter((polygon) => polygon.id !== shapeId) }
          : image
      ),
    });
  },

  updateShapeClass: async (shapeId, imageId, classId) => {
    const cls = classId ? get().classes.find((c) => c.id === classId) ?? null : null;
    const { data } = await api.patch<Polygon>(`/annotations/polygons/${shapeId}/`, {
      annotation_class: classId,
      color: cls?.color ?? undefined,
    });
    set({
      images: get().images.map((image) =>
        image.id === imageId
          ? {
              ...image,
              polygons: image.polygons.map((polygon) => (polygon.id === shapeId ? data : polygon)),
            }
          : image
      ),
    });
  },

  restoreShape: async (imageId, shape) => {
    const { data } = await api.post<Polygon>("/annotations/polygons/", {
      image: imageId,
      points: shape.points,
      color: shape.color,
      shape_type: shape.shape_type,
      annotation_class: shape.annotation_class,
    });
    set({
      images: get().images.map((image) =>
        image.id === imageId ? { ...image, polygons: [...image.polygons, data] } : image
      ),
    });
    return data;
  },
}));
