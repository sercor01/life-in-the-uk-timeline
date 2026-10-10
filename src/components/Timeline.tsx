import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_BY_ID } from "../data/categories";
import { layoutEvents, formatRange, formatYear } from "../lib/lanes";
import {
  MIN_SPAN,
  NORM_MAX,
  NORM_MIN,
  FULL_VIEW,
  normToX,
  panView,
  toNorm,
  toValue,
  xToNorm,
  zoomView,
  type ViewWindow,
} from "../lib/scale";
import type { TimelineEvent } from "../types";
import { Overview } from "./Overview";

interface Props {
  events: TimelineEvent[];
  view: ViewWindow;
  onViewChange: (view: ViewWindow) => void;
  selectedId?: string;
  onSelect: (event: TimelineEvent) => void;
}

const ERAS: { from: number; to: number; label: string; tint: string }[] = [  { from: -9000, to: 43, label: "Prehistory", tint: "#faf7f0" },
  { from: 43, to: 410, label: "Roman Britain", tint: "#f7f1ea" },
  { from: 410, to: 1066, label: "Anglo-Saxons", tint: "#f0f6f2" },
  { from: 1066, to: 1485, label: "Medieval", tint: "#f4f1fb" },
  { from: 1485, to: 1714, label: "Tudors & Stuarts", tint: "#f9f1f1" },
  { from: 1714, to: 1837, label: "Georgian", tint: "#eef4f9" },
  { from: 1837, to: 1901, label: "Victorian", tint: "#f0f6f8" },
  { from: 1901, to: 2020, label: "Modern", tint: "#f4f5f7" },
];

const LANE_SPACING = 32;
const LANE_OFFSET = 26;
const MAX_LANES = 7;

/** Round a raw year gap up to a friendly 1 / 2 / 5 × power of ten. */
function niceStep(raw: number): number {  if (!isFinite(raw) || raw <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const mult = n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10;
  return mult * pow;
}

export function Timeline({ events, view, onViewChange, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [grabbing, setGrabbing] = useState(false);

  // Keep the latest view available to imperative event handlers.
  const viewRef = useRef(view);
  viewRef.current = view;
  const widthRef = useRef(0);
  widthRef.current = size.width;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width, height } = size;
  const axisY = Math.max(120, height - 96);
  const topPad = 44;

  const laneCount = useMemo(() => {
    const available = axisY - topPad;
    return Math.max(2, Math.min(MAX_LANES, Math.floor(available / LANE_SPACING)));
  }, [axisY]);

  const charWidth = width < 700 ? 6.0 : 6.4;

  const layout = useMemo(() => {
    if (width === 0) return { placed: [], hidden: [], laneCount };
    return layoutEvents(events, {
      view,
      width,
      laneCount,
      charWidth,
      labelPadding: 26,
      gap: 10,
      xOf: normToX,
    });
  }, [events, view, width, laneCount, charWidth]);

  const ticks = useMemo(() => {
    if (width === 0) return [] as number[];
    const slots = Math.max(2, Math.min(20, Math.round(width / 120)));
    const out: number[] = [];
    let lastX = -Infinity;
    for (let k = 0; k <= slots; k++) {
      const x = (k / slots) * width;
      const n = xToNorm(x, view, width);
      const d = 60 / width;
      const bracket = Math.abs(
        toValue(Math.min(1, n + d)) - toValue(Math.max(0, n - d)),
      );
      const step = niceStep(bracket / 1.4);
      const year = Math.round(toValue(n) / step) * step;
      const tX = normToX(toNorm(year), view, width);
      if (tX - lastX < 56) continue;
      out.push(year);
      lastX = tX;
    }
    return out;
  }, [view, width]);

  const marked = useMemo(() => {
    return layout.placed.map((p) => {
      const half = p.labelWidth / 2;
      const clampX = Math.min(Math.max(p.x, half + 4), Math.max(half + 4, width - half - 4));
      return { ...p, clampX };
    });
  }, [layout, width]);

  // Nudge labels that still overflow, using their real measured width.
  useLayoutEffect(() => {
    const layer = labelsRef.current;
    if (!layer) return;
    const edge = 6;
    for (const node of Array.from(layer.children) as HTMLElement[]) {
      node.style.marginLeft = "0px";
      const w = node.offsetWidth;
      const left = node.offsetLeft - w / 2;
      const right = left + w;
      let shift = 0;
      if (left < edge) shift = edge - left;
      else if (right > width - edge) shift = width - edge - right;
      if (shift !== 0) node.style.marginLeft = `${shift}px`;
    }
  }, [marked, width]);

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

  function onKeyDown(e: React.KeyboardEvent) {
    const w = widthRef.current || 1;
    if (e.key === "ArrowRight") onViewChange(panView(viewRef.current, 90, w));
    else if (e.key === "ArrowLeft") onViewChange(panView(viewRef.current, -90, w));
    else if (e.key === "+" || e.key === "=") zoomCentre(1.3);
    else if (e.key === "-") zoomCentre(1 / 1.3);
    else return;
    e.preventDefault();
  }

  const canZoomIn = view.n1 - view.n0 > MIN_SPAN * 1.01;
  const canZoomOut = view.n1 - view.n0 < NORM_MAX - NORM_MIN - 1e-6;

  return (
    <div className="stage">
      <div
        className={`timeline${grabbing ? " is-grabbing" : ""}`}
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={() => {
          const anchor = xToNorm(width / 2, viewRef.current, width || 1);
          zoomAt(1.6, anchor);
        }}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="application"
        aria-label="Interactive historical timeline. Use arrow keys to pan and plus or minus to zoom."
      >
        <svg width={width} height={height} aria-hidden>
          {/* era bands */}
          {ERAS.map((era) => {
            const x0 = Math.max(0, normToX(toNorm(era.from), view, width));
            const x1 = Math.min(width, normToX(toNorm(era.to), view, width));
            if (x1 <= 0 || x0 >= width || x1 - x0 <= 0) return null;
            return <rect key={era.label} x={x0} y={0} width={x1 - x0} height={height} fill={era.tint} />;
          })}
          {ERAS.map((era) => {
            const x0 = Math.max(0, normToX(toNorm(era.from), view, width));
            const x1 = Math.min(width, normToX(toNorm(era.to), view, width));
            if (x1 - x0 < era.label.length * 7 + 22) return null;
            return (
              <text
                key={`${era.label}-t`}
                className="era-label"
                x={(x0 + x1) / 2}
                y={22}
                textAnchor="middle"
              >
                {era.label}
              </text>
            );
          })}

          {/* axis */}
          <line x1={0} y1={axisY} x2={width} y2={axisY} stroke="var(--axis)" strokeWidth={1.5} />

          {/* ticks */}
          {ticks.map((year) => {
            const x = normToX(toNorm(year), view, width);
            if (x < -20 || x > width + 20) return null;
            return (
              <g key={year}>
                <line x1={x} y1={axisY - 5} x2={x} y2={axisY + 5} stroke="var(--axis)" />
                <text className="tick-label" x={x} y={axisY + 22} textAnchor="middle">
                  {formatYear(year)}
                </text>
              </g>
            );
          })}

          {/* range bars */}
          {layout.placed.map(({ event, x }) => {
            if (event.endYear === undefined) return null;
            const cat = CATEGORY_BY_ID[event.category];
            const xEnd = normToX(toNorm(event.endYear), view, width);
            const left = Math.max(-width, Math.min(x, xEnd));
            const right = Math.min(width * 2, Math.max(x, xEnd));
            return (
              <rect
                key={`range-${event.id}`}
                x={left}
                y={axisY - 4}
                width={Math.max(4, right - left)}
                height={8}
                rx={4}
                fill={cat.color}
                opacity={selectedId === event.id ? 0.85 : 0.5}
              />
            );
          })}

          {/* selected guide */}
          {selectedId &&
            layout.placed
              .filter((p) => p.event.id === selectedId)
              .map(({ x }) => (
                <line
                  key="guide"
                  x1={x}
                  y1={topPad - 12}
                  x2={x}
                  y2={axisY}
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              ))}

          {/* stems and dots */}
          {marked.map(({ event, x, clampX, lane }) => {
            const cat = CATEGORY_BY_ID[event.category];
            const laneY = axisY - LANE_OFFSET - lane * LANE_SPACING;
            return (
              <g key={`stem-${event.id}`}>
                <line
                  x1={x}
                  y1={axisY}
                  x2={clampX}
                  y2={laneY + 4}
                  stroke={cat.color}
                  strokeWidth={1.5}
                  opacity={0.55}
                />
                <circle cx={x} cy={axisY} r={selectedId === event.id ? 6 : 4.5} fill={cat.color} />
              </g>
            );
          })}
        </svg>

        <div className="timeline__labels" ref={labelsRef}>
          {marked.map(({ event, clampX, lane }) => {
            const cat = CATEGORY_BY_ID[event.category];
            const laneY = axisY - LANE_OFFSET - lane * LANE_SPACING;
            return (
              <button
                key={event.id}
                type="button"
                className={`marker${event.source === "handbook" ? " marker--handbook" : ""}`}
                style={{ left: clampX, top: laneY, borderLeft: `3px solid ${cat.color}` }}
                aria-pressed={selectedId === event.id}
                title={`${formatRange(event)} — ${event.title}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelect(event)}
              >
                <span className="marker__dot" style={{ background: cat.color }} />
                <span className="marker__year">{formatRange(event)}</span>
                <span className="marker__title">{event.title}</span>
                {event.source === "handbook" && <span className="marker__badge">hb</span>}
              </button>
            );
          })}
        </div>

        <div className="timeline__hint">
          <span>Scroll or pinch to zoom</span>
          <span>·</span>
          <span>drag to pan</span>
        </div>

        <div className="timeline__controls">
          <button
            type="button"
            className="tl-btn"
            aria-label="Zoom out"
            disabled={!canZoomOut}
            onClick={() => zoomCentre(1 / 1.5)}
          >
            −
          </button>
          <button
            type="button"
            className="tl-btn"
            aria-label="Zoom in"
            disabled={!canZoomIn}
            onClick={() => zoomCentre(1.5)}
          >
            +
          </button>
          <button
            type="button"
            className="tl-btn tl-btn--wide"
            onClick={() => onViewChange(FULL_VIEW)}
          >
            Reset
          </button>
        </div>
      </div>

      <Overview
        events={events}
        view={view}
        onChange={onViewChange}
      />
    </div>
  );
}
