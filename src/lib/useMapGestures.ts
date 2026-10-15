import { useCallback, useEffect, useRef, useState } from "react";
import {
  panMapView,
  toMapPoint,
  unitsPerPixel,
  zoomMapView,
  type MapView,
} from "./mapScale";

interface Options {
  view: MapView;
  /** Container size in pixels; pixel deltas are converted to map units. */
  width: number;
  height: number;
  /** height / width, so vertical maths matches the container. */
  aspect: number;
  /**
   * Apply an update to the *current* view. The updater form matters: several
   * wheel or pinch events can land in one frame, and without composing them
   * against the latest state each one would start from the same stale view and
   * all but the last would be lost.
   */
  onViewChange: (update: (view: MapView) => MapView) => void;
}

/**
 * Zoom/pan for the map: wheel and trackpad, one-finger drag, two-finger pinch,
 * double-click and the arrow/plus/minus keys. The same shape as
 * `useTimelineGestures`, for the same reason: the handlers run outside React's
 * render, so the live view and container size are mirrored into refs.
 */
export function useMapGestures({ view, width, height, aspect, onViewChange }: Options) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [grabbing, setGrabbing] = useState(false);

  const viewRef = useRef(view);
  viewRef.current = view;
  const widthRef = useRef(width);
  widthRef.current = width;
  const heightRef = useRef(height);
  heightRef.current = height;
  const aspectRef = useRef(aspect);
  aspectRef.current = aspect;

  /** Zoom about the centre of the current view. */
  const zoomCentre = useCallback(
    (factor: number) => {
      const a = aspectRef.current;
      onViewChange((v) => zoomMapView(v, factor, { x: v.cx, y: v.cy }, a));
    },
    [onViewChange],
  );

  // A non-passive wheel listener so the browser's own zoom/scroll is suppressed.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const w = rect.width || 1;
      const h = rect.height || 1;
      const a = aspectRef.current;
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        onViewChange((v) => panMapView(v, delta, 0, w, h, a));
      } else {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        onViewChange((v) =>
          zoomMapView(v, factor, toMapPoint(e.clientX - rect.left, e.clientY - rect.top, v, w, h, a), a),
        );
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onViewChange]);

  // Pointer gestures: one finger drags, two fingers pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panStart = useRef<{ x: number; y: number; view: MapView } | null>(null);
  const pinchStart = useRef<{ dist: number } | null>(null);

  const local = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: 0, y: 0 };
  };

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    containerRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      panStart.current = { x: e.clientX, y: e.clientY, view: viewRef.current };
      setGrabbing(true);
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
      panStart.current = null;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const anchor = local((a.x + b.x) / 2, (a.y + b.y) / 2);
      const factor = dist / (pinchStart.current.dist || dist);
      pinchStart.current.dist = dist;
      const aspect = aspectRef.current;
      onViewChange((v) =>
        zoomMapView(
          v,
          factor,
          toMapPoint(anchor.x, anchor.y, v, widthRef.current, heightRef.current, aspect),
          aspect,
        ),
      );
      return;
    }

    if (panStart.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const start = panStart.current.view;
      const aspect = aspectRef.current;
      // Panning is absolute from the gesture's start, not incremental, so it
      // stays stable no matter how many pointermove events arrive per frame.
      onViewChange(() =>
        panMapView(start, dx, dy, widthRef.current, heightRef.current, aspect),
      );
    }
  }

  function endPointer(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      panStart.current = null;
      setGrabbing(false);
    } else if (pointers.current.size === 1) {
      const [[, p]] = [...pointers.current.entries()];
      panStart.current = { x: p.x, y: p.y, view: viewRef.current };
    }
  }

  function onDoubleClick(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    const w = widthRef.current;
    const h = heightRef.current;
    const a = aspectRef.current;
    onViewChange((v) =>
      zoomMapView(
        v,
        1.6,
        rect
          ? toMapPoint(e.clientX - rect.left, e.clientY - rect.top, v, w, h, a)
          : { x: v.cx, y: v.cy },
        a,
      ),
    );
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const w = widthRef.current;
    const h = heightRef.current;
    const a = aspectRef.current;
    const pan = 80;
    const update =
      e.key === "ArrowRight"
        ? (v: MapView) => panMapView(v, pan, 0, w, h, a)
        : e.key === "ArrowLeft"
          ? (v: MapView) => panMapView(v, -pan, 0, w, h, a)
          : e.key === "ArrowDown"
            ? (v: MapView) => panMapView(v, 0, pan, w, h, a)
            : e.key === "ArrowUp"
              ? (v: MapView) => panMapView(v, 0, -pan, w, h, a)
              : null;
    if (update) {
      onViewChange(update);
    } else if (e.key === "+" || e.key === "=") {
      zoomCentre(1.3);
    } else if (e.key === "-") {
      zoomCentre(1 / 1.3);
    } else {
      return;
    }
    e.preventDefault();
  }

  return {
    containerRef,
    grabbing,
    zoomCentre,
    /** Map units per pixel — the pin hit area in map space. */
    unitScale: () => unitsPerPixel(viewRef.current, widthRef.current),
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onDoubleClick,
      onKeyDown,
    },
  };
}
