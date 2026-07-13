"use client";

import { Check, Lightbulb, Redo2, Trash2, Undo2, X, ZoomIn, ZoomOut } from "lucide-react";
import { MouseEvent, SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import { useAnnotationStore } from "@/store/annotationStore";
import type { Point, Polygon, ShapeType } from "@/types/annotation";

const DRAFT_COLOR = "#5B8DEF";
const PENDING_COLOR = "#F5A623";
const CLOSE_DISTANCE_PX = 12;
const PEN_MIN_SPACING_PX = 6;
const PEN_TIP_AUTO_HIDE_MS = 7000;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

interface PendingShape {
  points: Point[];
  shapeType: ShapeType;
}

interface ContentBox {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

type HistoryAction = { type: "add"; shape: Polygon } | { type: "delete"; shape: Polygon };

export function AnnotationCanvas() {
  const { images, selectedImageId, shapeMode, selectedClassId, classes, addShape, removeShape, restoreShape } =
    useAnnotationStore();
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [boxStart, setBoxStart] = useState<Point | null>(null);
  const [boxCurrent, setBoxCurrent] = useState<Point | null>(null);
  const [isPenDrawing, setIsPenDrawing] = useState(false);
  const [penPath, setPenPath] = useState<Point[]>([]);
  const [pending, setPending] = useState<PendingShape | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPenTip, setShowPenTip] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const isPanDraggingRef = useRef(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);

  const [selectedShapeId, setSelectedShapeId] = useState<number | null>(null);
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const selectedImage = images.find((image) => image.id === selectedImageId) ?? null;
  const selectedClass = classes.find((cls) => cls.id === selectedClassId) ?? null;

  useEffect(() => {
    setDraftPoints([]);
    setBoxStart(null);
    setBoxCurrent(null);
    setPenPath([]);
    setIsPenDrawing(false);
    setPending(null);
  }, [selectedImageId, shapeMode]);

  useEffect(() => {
    setNaturalSize(null);
    setZoom(1);
    setSelectedShapeId(null);
    setUndoStack([]);
    setRedoStack([]);
  }, [selectedImageId]);

  useEffect(() => {
    if (shapeMode !== "pen") {
      setShowPenTip(false);
      return;
    }
    setShowPenTip(true);
    const timeout = window.setTimeout(() => setShowPenTip(false), PEN_TIP_AUTO_HIDE_MS);
    return () => window.clearTimeout(timeout);
  }, [shapeMode]);

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [selectedImageId, zoom]);

  function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
  }

  // The image is placed inside the container via object-contain, so it is
  // letterboxed on one axis unless the aspect ratios match exactly. This box
  // describes where the real image pixels sit, as a fraction of the container.
  const contentBox: ContentBox = useMemo(() => {
    if (!naturalSize || containerSize.width === 0 || containerSize.height === 0) {
      return { offsetX: 0, offsetY: 0, width: 1, height: 1 };
    }
    const containerAspect = containerSize.width / containerSize.height;
    const imageAspect = naturalSize.width / naturalSize.height;

    if (imageAspect < containerAspect) {
      const width = imageAspect / containerAspect;
      return { offsetX: (1 - width) / 2, offsetY: 0, width, height: 1 };
    }
    const height = containerAspect / imageAspect;
    return { offsetX: 0, offsetY: (1 - height) / 2, width: 1, height };
  }, [naturalSize, containerSize]);

  const displayedImagePx = {
    width: contentBox.width * containerSize.width,
    height: contentBox.height * containerSize.height,
  };

  function toNormalizedPoint(event: MouseEvent<HTMLDivElement>): Point {
    const rect = containerRef.current!.getBoundingClientRect();
    const rawX = (event.clientX - rect.left) / rect.width;
    const rawY = (event.clientY - rect.top) / rect.height;
    const imgX = contentBox.width > 0 ? (rawX - contentBox.offsetX) / contentBox.width : rawX;
    const imgY = contentBox.height > 0 ? (rawY - contentBox.offsetY) / contentBox.height : rawY;
    return [clamp01(imgX), clamp01(imgY)];
  }

  function pushHistory(action: HistoryAction) {
    setUndoStack((stack) => [...stack, action]);
    setRedoStack([]);
  }

  function handlePolygonClick(event: MouseEvent<HTMLDivElement>) {
    if (!selectedImage || pending) return;
    const point = toNormalizedPoint(event);

    if (draftPoints.length >= 3) {
      const first = draftPoints[0]!;
      const pixelDistance = Math.hypot(
        (point[0] - first[0]) * displayedImagePx.width,
        (point[1] - first[1]) * displayedImagePx.height
      );
      if (pixelDistance <= CLOSE_DISTANCE_PX) {
        setPending({ points: draftPoints, shapeType: "polygon" });
        setDraftPoints([]);
        return;
      }
    }
    setDraftPoints([...draftPoints, point]);
  }

  function handleBoxMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (!selectedImage || pending) return;
    setBoxStart(toNormalizedPoint(event));
    setBoxCurrent(toNormalizedPoint(event));
  }

  function handleBoxMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!boxStart) return;
    setBoxCurrent(toNormalizedPoint(event));
  }

  function handleBoxMouseUp() {
    if (!selectedImage || !boxStart || !boxCurrent) return;
    const [x1, y1] = boxStart;
    const [x2, y2] = boxCurrent;

    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);

    setBoxStart(null);
    setBoxCurrent(null);

    const widthPx = (maxX - minX) * displayedImagePx.width;
    const heightPx = (maxY - minY) * displayedImagePx.height;
    if (widthPx < 6 || heightPx < 6) return;

    const corners: Point[] = [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
    ];
    setPending({ points: corners, shapeType: "box" });
  }

  function handlePenMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (!selectedImage || pending) return;
    setIsPenDrawing(true);
    setPenPath([toNormalizedPoint(event)]);
  }

  function handlePenMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!isPenDrawing) return;
    const point = toNormalizedPoint(event);
    setPenPath((current) => {
      const last = current[current.length - 1];
      if (last) {
        const distancePx = Math.hypot(
          (point[0] - last[0]) * displayedImagePx.width,
          (point[1] - last[1]) * displayedImagePx.height
        );
        if (distancePx < PEN_MIN_SPACING_PX) return current;
      }
      return [...current, point];
    });
  }

  function handlePenMouseUp() {
    if (!selectedImage || !isPenDrawing) return;
    setIsPenDrawing(false);
    if (penPath.length >= 3) {
      setPending({ points: penPath, shapeType: "polygon" });
    }
    setPenPath([]);
  }

  function handlePanMouseDown(event: MouseEvent<HTMLDivElement>) {
    isPanDraggingRef.current = true;
    setIsPanning(true);
    lastPanPointRef.current = { x: event.clientX, y: event.clientY };
  }

  function handlePanMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!isPanDraggingRef.current || !lastPanPointRef.current || !viewportRef.current) return;
    const dx = event.clientX - lastPanPointRef.current.x;
    const dy = event.clientY - lastPanPointRef.current.y;
    viewportRef.current.scrollLeft -= dx;
    viewportRef.current.scrollTop -= dy;
    lastPanPointRef.current = { x: event.clientX, y: event.clientY };
  }

  function handlePanMouseUp() {
    isPanDraggingRef.current = false;
    setIsPanning(false);
    lastPanPointRef.current = null;
  }

  function handleCancelDraft() {
    setDraftPoints([]);
    setBoxStart(null);
    setBoxCurrent(null);
    setPenPath([]);
    setIsPenDrawing(false);
  }

  async function handleConfirm() {
    if (!selectedImage || !pending) return;
    setIsSaving(true);
    try {
      const created = await addShape(selectedImage.id, pending.points, pending.shapeType);
      pushHistory({ type: "add", shape: created });
      setPending(null);
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscard() {
    setPending(null);
  }

  function handleSelectShape(event: MouseEvent<SVGPolygonElement>, shapeId: number) {
    event.stopPropagation();
    if (pending) return;
    setSelectedShapeId((current) => (current === shapeId ? null : shapeId));
  }

  async function handleDeleteSelected() {
    if (!selectedImage || selectedShapeId === null) return;
    const shape = selectedImage.polygons.find((polygon) => polygon.id === selectedShapeId);
    if (!shape) return;
    await removeShape(shape.id, selectedImage.id);
    pushHistory({ type: "delete", shape });
    setSelectedShapeId(null);
  }

  async function handleUndo() {
    if (!selectedImage || undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1]!;
    setUndoStack((stack) => stack.slice(0, -1));
    if (last.type === "add") {
      await removeShape(last.shape.id, selectedImage.id);
      setRedoStack((stack) => [...stack, last]);
    } else {
      const restored = await restoreShape(selectedImage.id, last.shape);
      setRedoStack((stack) => [...stack, { type: "delete", shape: restored }]);
    }
    setSelectedShapeId(null);
  }

  async function handleRedo() {
    if (!selectedImage || redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1]!;
    setRedoStack((stack) => stack.slice(0, -1));
    if (last.type === "add") {
      const restored = await restoreShape(selectedImage.id, last.shape);
      setUndoStack((stack) => [...stack, { type: "add", shape: restored }]);
    } else {
      await removeShape(last.shape.id, selectedImage.id);
      setUndoStack((stack) => [...stack, last]);
    }
    setSelectedShapeId(null);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (pending) setPending(null);
      else if (selectedShapeId !== null) setSelectedShapeId(null);
      else handleCancelDraft();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, selectedShapeId]);

  if (!selectedImage) {
    return (
      <div className="flex items-center justify-center h-80 border border-dashed border-border rounded-card text-muted text-sm animate-fade-in">
        Select or upload an image to start annotating.
      </div>
    );
  }

  const draftBoxRect =
    boxStart && boxCurrent
      ? {
          x: Math.min(boxStart[0], boxCurrent[0]) * 100,
          y: Math.min(boxStart[1], boxCurrent[1]) * 100,
          width: Math.abs(boxCurrent[0] - boxStart[0]) * 100,
          height: Math.abs(boxCurrent[1] - boxStart[1]) * 100,
        }
      : null;

  const isBusy = Boolean(pending);
  const overlayStyle = {
    left: `${contentBox.offsetX * 100}%`,
    top: `${contentBox.offsetY * 100}%`,
    width: `${contentBox.width * 100}%`,
    height: `${contentBox.height * 100}%`,
  };

  return (
    <div className="flex flex-col gap-2">
      {showPenTip && (
        <div className="flex items-center justify-between gap-3 bg-accent-soft border border-accent/30 rounded-card px-4 py-2 animate-scale-in">
          <span className="flex items-center gap-2 text-xs text-accent">
            <Lightbulb size={14} className="shrink-0" />
            Tip: move slowly with short, steady strokes along the edge, it traces much smoother than
            fast swipes.
          </span>
          <button
            onClick={() => setShowPenTip(false)}
            aria-label="Dismiss tip"
            className="text-accent/70 hover:text-accent shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo"
            className="flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-ink hover:bg-panel disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo"
            className="flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-ink hover:bg-panel disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Redo2 size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
            disabled={zoom <= ZOOM_MIN}
            title="Zoom out"
            className="flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-ink hover:bg-panel disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-muted w-10 text-center select-none">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
            disabled={zoom >= ZOOM_MAX}
            title="Zoom in"
            className="flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-ink hover:bg-panel disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ZoomIn size={14} />
          </button>
          {zoom !== 1 && (
            <button
              onClick={() => setZoom(1)}
              className="text-accent hover:underline ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative w-full overflow-auto rounded-card border border-border bg-black"
        style={{ maxHeight: 560 }}
      >
        <div
          ref={containerRef}
          onClick={shapeMode === "polygon" ? handlePolygonClick : undefined}
          onMouseDown={
            shapeMode === "box"
              ? handleBoxMouseDown
              : shapeMode === "pen"
              ? handlePenMouseDown
              : shapeMode === "pan"
              ? handlePanMouseDown
              : undefined
          }
          onMouseMove={
            shapeMode === "box"
              ? handleBoxMouseMove
              : shapeMode === "pen"
              ? handlePenMouseMove
              : shapeMode === "pan"
              ? handlePanMouseMove
              : undefined
          }
          onMouseUp={
            shapeMode === "box"
              ? handleBoxMouseUp
              : shapeMode === "pen"
              ? handlePenMouseUp
              : shapeMode === "pan"
              ? handlePanMouseUp
              : undefined
          }
          onMouseLeave={shapeMode === "pan" ? handlePanMouseUp : undefined}
          className={clsx("relative aspect-video select-none", isBusy ? "cursor-default" : undefined)}
          style={{
            width: `${zoom * 100}%`,
            minWidth: "100%",
            cursor: isBusy
              ? undefined
              : shapeMode === "pan"
              ? isPanning
                ? "grabbing"
                : "grab"
              : "crosshair",
          }}
        >
          <img
            src={selectedImage.image}
            alt={selectedImage.original_filename || "Annotated image"}
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
            onLoad={handleImageLoad}
          />

          <svg
            className="absolute"
            style={{ ...overlayStyle, pointerEvents: "none" }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {selectedImage.polygons.map((shape) => (
              <g key={shape.id}>
                {selectedShapeId === shape.id && (
                  <polygon
                    points={pointsToSvg(shape.points)}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                    strokeOpacity={0.55}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                <polygon
                  points={pointsToSvg(shape.points)}
                  fill={`${shape.color}33`}
                  stroke={shape.color}
                  strokeWidth={selectedShapeId === shape.id ? 0.8 : 0.4}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: shapeMode === "pan" || pending ? "none" : "auto" }}
                  className="cursor-pointer"
                  onClick={(event) => handleSelectShape(event, shape.id)}
                />
                {shape.annotation_class_detail && (
                  <text
                    x={shape.points[0]![0] * 100}
                    y={Math.max(shape.points[0]![1] * 100 - 1.5, 3)}
                    fontSize={3}
                    fill={shape.color}
                    fontFamily="sans-serif"
                    style={{ pointerEvents: "none" }}
                  >
                    {shape.annotation_class_detail.name}
                  </text>
                )}
              </g>
            ))}

            {shapeMode === "polygon" && draftPoints.length > 0 && (
              <>
                <polyline
                  points={pointsToSvg(draftPoints)}
                  fill="none"
                  stroke={DRAFT_COLOR}
                  strokeWidth={0.4}
                  vectorEffect="non-scaling-stroke"
                />
                {draftPoints.map((point, index) => (
                  <circle key={index} cx={point[0] * 100} cy={point[1] * 100} r={0.8} fill={DRAFT_COLOR} />
                ))}
              </>
            )}

            {shapeMode === "box" && draftBoxRect && (
              <rect
                x={draftBoxRect.x}
                y={draftBoxRect.y}
                width={draftBoxRect.width}
                height={draftBoxRect.height}
                fill={`${DRAFT_COLOR}22`}
                stroke={DRAFT_COLOR}
                strokeWidth={0.4}
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2 1"
              />
            )}

            {shapeMode === "pen" && penPath.length > 0 && (
              <polyline
                points={pointsToSvg(penPath)}
                fill="none"
                stroke={DRAFT_COLOR}
                strokeWidth={0.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {pending && (
              <polygon
                points={pointsToSvg(pending.points)}
                fill={`${PENDING_COLOR}33`}
                stroke={PENDING_COLOR}
                strokeWidth={0.5}
                strokeDasharray="1.5 1"
                vectorEffect="non-scaling-stroke"
                className="animate-pulse"
              />
            )}
          </svg>
        </div>
      </div>

      {pending ? (
        <div className="flex items-center justify-between gap-3 bg-panel border border-progress/40 rounded-card px-4 py-2.5 animate-scale-in">
          <span className="text-xs text-ink flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-progress animate-pulse" />
            Ready to save as
            <span
              className="font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: selectedClass?.color ?? "#8A8F9C" }}
            >
              {selectedClass?.name ?? "Unlabeled"}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscard}
              disabled={isSaving}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full text-muted hover:text-danger transition-colors disabled:opacity-50"
            >
              <X size={13} />
              Discard
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full bg-done text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Check size={13} />
              {isSaving ? "Saving…" : "Confirm annotation"}
            </button>
          </div>
        </div>
      ) : selectedShapeId !== null ? (
        <div className="flex items-center justify-between gap-3 bg-panel border border-accent/40 rounded-card px-4 py-2.5 animate-scale-in">
          <span className="text-xs text-ink flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Shape selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedShapeId(null)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full text-muted hover:text-ink transition-colors"
            >
              <X size={13} />
              Deselect
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full bg-danger text-white font-medium hover:opacity-90 transition-opacity"
            >
              <Trash2 size={13} />
              Delete shape
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {shapeMode === "box" && "Click and drag to draw a box."}
            {shapeMode === "polygon" &&
              `Click to place points, click near the first point to close (${draftPoints.length} placed).`}
            {shapeMode === "pen" && "Hold and drag to trace a shape freehand, then release."}
            {shapeMode === "pan" && "Drag to move around the image. Zoom in first to have room to pan."}
            {" · Click any existing shape to select it."}
          </span>
          {(draftPoints.length > 0 || boxStart || penPath.length > 0) && (
            <button onClick={handleCancelDraft} className="text-danger hover:underline">
              Cancel drawing
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function pointsToSvg(points: Point[]): string {
  return points.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
