export type Point = [number, number]; // normalized 0-1 coordinates
export type ShapeType = "polygon" | "box";
/** UI drawing tool - "pen" is freehand tracing, saved to the backend as a polygon */
export type DrawMode = "box" | "polygon" | "pen" | "pan";

export interface AnnotationClass {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Polygon {
  id: number;
  image: number;
  annotation_class: number | null;
  annotation_class_detail: AnnotationClass | null;
  shape_type: ShapeType;
  points: Point[];
  color: string;
  created_at: string;
}

export interface AnnotationImage {
  id: number;
  image: string; // URL
  original_filename: string;
  uploaded_at: string;
  polygons: Polygon[];
}
