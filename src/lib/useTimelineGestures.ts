import { useCallback, useEffect, useRef, useState } from "react";
import { panView, xToNorm, zoomView, type ViewWindow } from "./scale";

interface Options {
  view: ViewWindow;
  /** Container width in pixels; pixel deltas are converted to normalised ones. */
  width: number;
  onViewChange: (view: ViewWindow) => void;
}

/**
 * Zoom/pan interaction for the timeline: wheel and trackpad, one-finger drag,
 * two-finger pinch, double-click and the arrow/plus/minus keys.
 *
 * The handlers run outside React's render, so the current view and width are
 * mirrored into refs instead of being closed over (which would go stale).
 */
export function useTimelineGestures({ view, width, onViewChange }: Options) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [grabbing, setGrabbing] = useState(false);

  const viewRef = useRef(view);
  viewRef.current = view;
  const widthRef = useRef(width);
  widthRef.current = width;

  const zoomAt = useCallback(
    (factor: number, anchor: number) => {
      onViewChange(zoomView(viewRef.current, factor, anchor));
    },
    [onViewChange],
  );
  const zoomCentre = useCallback((factor: number) => zoomAt(factor, 0.5), [zoomAt]);

  // Wheel handling needs a non-passive listener so we can prevent browser zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const w = rect.width || 1;
      const anchor = xToNorm(e.clientX - rect.left, viewRef.current, w);
      const v = viewRef.current;
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        onViewChange(panView(v, delta, w));
      } else {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        onViewChange(zoomView(v, factor, anchor));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onViewChange]);

  // Pointer gestures: one finger drags, two fingers pinch to zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panStart = useRef<{ x: number; view: ViewWindow } | null>(null);
  const pinchStart = useRef<{ dist: number } | null>(null);

  const localX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? clientX - rect.left : 0;
  };

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    containerRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      panStart.current = { x: e.clientX, view: viewRef.current };
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
      const midX = (a.x + b.x) / 2;
      const anchor = xToNorm(localX(midX), viewRef.current, widthRef.current);
      const factor = dist / pinchStart.current.dist;
      pinchStart.current.dist = dist;
      onViewChange(zoomView(viewRef.current, factor, anchor));
      return;
    }

    if (panStart.current) {
      const dx = e.clientX - panStart.current.x;
      onViewChange(panView(panStart.current.view, -dx, widthRef.current));
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
      panStart.current = { x: p.x, view: viewRef.current };
    }
  }

  function onDoubleClick() {
    const w = widthRef.current || 1;
    zoomAt(1.6, xToNorm(w / 2, viewRef.current, w));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const w = widthRef.current || 1;
    if (e.key === "ArrowRight") onViewChange(panView(viewRef.current, 90, w));
    else if (e.key === "ArrowLeft") onViewChange(panView(viewRef.current, -90, w));
    else if (e.key === "+" || e.key === "=") zoomCentre(1.3);
    else if (e.key === "-") zoomCentre(1 / 1.3);
    else return;
    e.preventDefault();
  }

  return {
    containerRef,
    grabbing,
    zoomAt,
    zoomCentre,
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
