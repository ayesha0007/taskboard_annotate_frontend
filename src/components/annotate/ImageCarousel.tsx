"use client";

import {
  CheckCircle2,
  Download,
  FileJson,
  ImagePlus,
  Images,
  Loader2,
  ShoppingBasket,
  X,
} from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import clsx from "clsx";

import { useAnnotationStore } from "@/store/annotationStore";
import type { AnnotationImage, Point } from "@/types/annotation";

type FilterTab = "all" | "annotated";

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BBOX_PADDING = 0.08;
const MIN_BBOX_SIZE = 0.08;
const THUMB_SIZE = 96;
const BASE_WIDTH = 200;

function getBoundingBox(shapesPoints: Point[][]): BBox | null {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (const points of shapesPoints) {
    for (const [x, y] of points) {
      found = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!found) return null;

  minX = Math.max(0, minX - BBOX_PADDING);
  minY = Math.max(0, minY - BBOX_PADDING);
  maxX = Math.min(1, maxX + BBOX_PADDING);
  maxY = Math.min(1, maxY + BBOX_PADDING);

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, MIN_BBOX_SIZE),
    height: Math.max(maxY - minY, MIN_BBOX_SIZE),
  };
}

function getCropStyle(bbox: BBox, aspect: number) {
  const baseWidth = BASE_WIDTH;
  const baseHeight = BASE_WIDTH / aspect;

  const scaleX = THUMB_SIZE / (bbox.width * baseWidth);
  const scaleY = THUMB_SIZE / (bbox.height * baseHeight);
  const scale = Math.max(scaleX, scaleY);

  const width = baseWidth * scale;
  const height = baseHeight * scale;

  const centerX = (bbox.x + bbox.width / 2) * width;
  const centerY = (bbox.y + bbox.height / 2) * height;

  return {
    width: `${width}px`,
    height: `${height}px`,
    left: `${THUMB_SIZE / 2 - centerX}px`,
    top: `${THUMB_SIZE / 2 - centerY}px`,
  } as React.CSSProperties;
}

function downloadJson(images: AnnotationImage[]) {
  const payload = images.map((image) => ({
    filename: image.original_filename,
    image_url: image.image,
    shapes: image.polygons.map((polygon) => ({
      shape_type: polygon.shape_type,
      class: polygon.annotation_class_detail?.name ?? null,
      color: polygon.color,
      points: polygon.points,
    })),
  }));
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "annotations.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function baseFileName(image: AnnotationImage): string {
  const raw = image.original_filename || `image-${image.id}`;
  const dot = raw.lastIndexOf(".");
  return dot > 0 ? raw.slice(0, dot) : raw;
}

function loadImage(src: string, useCors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (useCors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

async function downloadCroppedImage(image: AnnotationImage) {
  const bbox = getBoundingBox(image.polygons.map((polygon) => polygon.points));
  if (!bbox) return;

  let sourceImg: HTMLImageElement;
  try {
    sourceImg = await loadImage(image.image, true);
  } catch {
    window.open(image.image, "_blank", "noopener,noreferrer");
    window.alert(
      "Could not crop the image automatically (likely a CORS restriction on the media server), so the full original image was opened in a new tab instead."
    );
    return;
  }

  const sx = bbox.x * sourceImg.naturalWidth;
  const sy = bbox.y * sourceImg.naturalHeight;
  const sw = bbox.width * sourceImg.naturalWidth;
  const sh = bbox.height * sourceImg.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (!blob) {
      window.open(image.image, "_blank", "noopener,noreferrer");
      window.alert(
        "Could not export the cropped image (likely a CORS restriction on the media server), so the full original image was opened in a new tab instead."
      );
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseFileName(image)}-annotated.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, "image/png");
}

export function ImageCarousel() {
  const { images, selectedImageId, selectImage, uploadImages, deleteImage, uploadingFiles } =
    useAnnotationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [naturalSizes, setNaturalSizes] = useState<Record<number, number>>({});
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const isUploading = uploadingFiles.length > 0;

  const annotatedImages = images.filter((image) => image.polygons.length > 0);
  const visibleImages = filter === "annotated" ? annotatedImages : images;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadImages(files);
    event.target.value = "";
  }

  async function handleDelete(event: React.MouseEvent, id: number) {
    event.stopPropagation();
    if (!window.confirm("Delete this image and all its shapes?")) return;
    await deleteImage(id);
  }

  async function handleDownloadClick(event: React.MouseEvent, image: AnnotationImage) {
    event.stopPropagation();
    if (downloadingId === image.id) return;
    setDownloadingId(image.id);
    try {
      await downloadCroppedImage(image);
    } finally {
      setDownloadingId(null);
    }
  }

  function handleThumbLoad(imageId: number, event: React.SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setNaturalSizes((current) => ({ ...current, [imageId]: img.naturalWidth / img.naturalHeight }));
    }
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-surface border border-border rounded-full p-1">
          <button
            onClick={() => setFilter("all")}
            className={clsx(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors",
              filter === "all" ? "bg-accent text-white font-medium" : "text-muted hover:text-ink"
            )}
          >
            <Images size={13} />
            All images
            <span className="opacity-80">{images.length}</span>
          </button>
          <button
            onClick={() => setFilter("annotated")}
            className={clsx(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors",
              filter === "annotated" ? "bg-done text-white font-medium" : "text-muted hover:text-ink"
            )}
            title="Images that already have at least one shape"
          >
            <ShoppingBasket size={13} />
            Annotated basket
            <span className="opacity-80">{annotatedImages.length}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {filter === "annotated" && annotatedImages.length > 0 && (
            <button
              onClick={() => downloadJson(annotatedImages)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-surface border border-border text-ink font-medium hover:border-accent hover:text-accent transition-colors"
            >
              <FileJson size={14} />
              Export JSON
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-accent-soft text-accent font-medium hover:opacity-80 transition-opacity"
          >
            <ImagePlus size={14} />
            Upload images
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {visibleImages.length === 0 && !isUploading && (
          <p className="text-xs text-muted py-6">
            {filter === "annotated"
              ? "Nothing in the basket yet - confirm a shape on an image to send it here."
              : "No images uploaded yet. You can select multiple files at once."}
          </p>
        )}

        {filter === "all" &&
          uploadingFiles.map((filename) => (
            <div
              key={filename}
              className="shrink-0 w-24 h-24 rounded-full border-2 border-dashed border-accent/40 bg-accent-soft flex flex-col items-center justify-center gap-1 animate-pulse"
              title={filename}
            >
              <Loader2 size={18} className="text-accent animate-spin" />
              <span className="text-[9px] text-accent px-2 truncate max-w-[80px]">{filename}</span>
            </div>
          ))}

        {visibleImages.map((image) => {
          const isAnnotated = image.polygons.length > 0;
          const showCrop = filter === "annotated" && isAnnotated;
          const bbox = showCrop ? getBoundingBox(image.polygons.map((polygon) => polygon.points)) : null;
          const aspect = naturalSizes[image.id];
          const cropStyle = bbox && aspect ? getCropStyle(bbox, aspect) : null;
          const isDownloading = downloadingId === image.id;

          return (
            <button
              key={image.id}
              onClick={() => selectImage(image.id)}
              className={clsx(
                "group relative shrink-0 w-24 h-24 rounded-card overflow-hidden border-2 transition-colors animate-scale-in",
                image.id === selectedImageId ? "border-accent" : "border-border hover:border-muted"
              )}
            >
              {showCrop ? (
                <span className="absolute inset-0 overflow-hidden bg-black">
                  <img
                    src={image.image}
                    alt={image.original_filename || "Annotated region"}
                    className="absolute"
                    style={cropStyle ?? { width: "100%", height: "100%", objectFit: "cover" }}
                    draggable={false}
                    onLoad={(event) => handleThumbLoad(image.id, event)}
                  />
                </span>
              ) : (
                <img
                  src={image.image}
                  alt={image.original_filename || "Uploaded image"}
                  className="w-full h-full object-cover"
                  draggable={false}
                  onLoad={(event) => handleThumbLoad(image.id, event)}
                />
              )}

              <span
                className={clsx(
                  "absolute top-1 left-1 flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                  isAnnotated ? "bg-done/90 text-white" : "bg-black/50 text-white"
                )}
              >
                {isAnnotated ? <CheckCircle2 size={10} /> : null}
                {image.polygons.length}
              </span>

              {filter === "annotated" ? (
                <span
                  onClick={(event) => handleDownloadClick(event, image)}
                  role="button"
                  aria-label="Download cropped annotation"
                  title="Download just the annotated region as a new image"
                  className={clsx(
                    "absolute bottom-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 text-white transition-opacity hover:bg-accent",
                    isDownloading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  {isDownloading ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Download size={11} />
                  )}
                </span>
              ) : null}

              <span
                onClick={(event) => handleDelete(event, image.id)}
                role="button"
                aria-label="Delete image"
                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger"
              >
                <X size={11} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
