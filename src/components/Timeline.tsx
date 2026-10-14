import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { categoryColor } from "../data/categories";
import { ERAS } from "../data/eras";
import { layoutEvents, formatRange, formatYear } from "../lib/lanes";
import {
  MIN_SPAN,
  NORM_MAX,
  NORM_MIN,
  FULL_VIEW,
  normToX,
  toNorm,
  type ViewWindow,
} from "../lib/scale";
import { computeTicks } from "../lib/ticks";
import { useTimelineGestures } from "../lib/useTimelineGestures";
import type { CategoryId, TimelineEvent } from "../types";
import { Overview } from "./Overview";
import { TimelineControls } from "./TimelineControls";

interface Props {
  events: TimelineEvent[];
  view: ViewWindow;
  onViewChange: (view: ViewWindow) => void;
  selectedId?: string;
  /** Category to emphasise; every other category is dimmed while it is set. */
  highlight: CategoryId | null;
  onSelect: (event: TimelineEvent) => void;
}

const LANE_SPACING = 32;
const LANE_OFFSET = 26;
const MAX_LANES = 7;

export function Timeline({
  events,
  view,
  onViewChange,
  selectedId,
  highlight,
  onSelect,
}: Props) {
  const labelsRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;

  /** True for the categories to fade back while another is highlighted. */
  const dimmed = (category: CategoryId) =>
    highlight !== null && highlight !== category;
  /** Colour for a category's graphics, greyed out when it is not highlighted. */
  const tint = (category: CategoryId) =>
    dimmed(category) ? "var(--faint)" : categoryColor(category);

  const { containerRef, grabbing, zoomCentre, handlers } = useTimelineGestures({
    view,
    width,
    onViewChange,
  });

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
  }, [containerRef]);

  const axisY = Math.max(120, height - 96);
  const topPad = 44;

  const laneCount = useMemo(() => {
    const available = axisY - topPad;
    return Math.max(2, Math.min(MAX_LANES, Math.floor(available / LANE_SPACING)));
  }, [axisY]);

  const charWidth = width < 700 ? 6.0 : 6.4;

  const layout = useMemo(() => {
    if (width === 0) return [];
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

  const ticks = useMemo(() => computeTicks(view, width), [view, width]);

  const marked = useMemo(() => {
    return layout.map((p) => {
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

  const canZoomIn = view.n1 - view.n0 > MIN_SPAN * 1.01;
  const canZoomOut = view.n1 - view.n0 < NORM_MAX - NORM_MIN - 1e-6;

  return (
    <div className="stage">
      <div
        className={`timeline${grabbing ? " is-grabbing" : ""}`}
        ref={containerRef}
        {...handlers}
        tabIndex={0}
        role="application"
        aria-label="Interactive historical timeline. Use arrow keys to pan and plus or minus to zoom."
      >
        <svg width={width} height={height} aria-hidden>
          {/* era bands and labels */}
          {ERAS.map((era) => {
            const x0 = Math.max(0, normToX(toNorm(era.from), view, width));
            const x1 = Math.min(width, normToX(toNorm(era.to), view, width));
            if (x1 <= 0 || x0 >= width || x1 - x0 <= 0) return null;
            return (
              <g key={era.label}>
                <rect x={x0} y={0} width={x1 - x0} height={height} fill={era.tint} />
                {x1 - x0 >= era.label.length * 7 + 22 && (
                  <text className="era-label" x={(x0 + x1) / 2} y={22} textAnchor="middle">
                    {era.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* axis */}
          <line x1={0} y1={axisY} x2={width} y2={axisY} stroke="var(--axis)" strokeWidth={1.5} />

          {/* ticks */}
          {ticks.map((year) => {
            const x = normToX(toNorm(year), view, width);
            if (x < -20 || x > width + 20) return null;
            // Keep edge labels inside the clip: anchor the first/last ones to
            // the edge instead of centring them, so they are never cut in half.
            const label = formatYear(year);
            const half = label.length * 3.6 + 2;
            const anchor = x < half ? "start" : x > width - half ? "end" : "middle";
            const tx =
              anchor === "start"
                ? Math.max(3, x)
                : anchor === "end"
                  ? Math.min(width - 3, x)
                  : x;
            return (
              <g key={year}>
                <line x1={x} y1={axisY - 5} x2={x} y2={axisY + 5} stroke="var(--axis)" />
                <text className="tick-label" x={tx} y={axisY + 22} textAnchor={anchor}>
                  {label}
                </text>
              </g>
            );
          })}

          {/* range bars */}
          {layout.map(({ event, x }) => {
            if (event.endYear === undefined) return null;
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
                fill={tint(event.category)}
                opacity={selectedId === event.id ? 0.85 : 0.5}
              />
            );
          })}

          {/* selected guide */}
          {selectedId &&
            layout.filter((p) => p.event.id === selectedId).map(({ x }) => (
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
            const laneY = axisY - LANE_OFFSET - lane * LANE_SPACING;
            return (
              <g key={`stem-${event.id}`}>
                <line
                  x1={x}
                  y1={axisY}
                  x2={clampX}
                  y2={laneY + 4}
                  stroke={tint(event.category)}
                  strokeWidth={1.5}
                  opacity={0.55}
                />
                <circle cx={x} cy={axisY} r={selectedId === event.id ? 6 : 4.5} fill={tint(event.category)} />
              </g>
            );
          })}
        </svg>

        <div className="timeline__labels" ref={labelsRef}>
          {marked.map(({ event, clampX, lane }) => {
            const laneY = axisY - LANE_OFFSET - lane * LANE_SPACING;
            return (
              <button
                key={event.id}
                type="button"
                className={`marker${event.source === "handbook" ? " marker--handbook" : ""}${
                  dimmed(event.category) ? " marker--muted" : ""
                }`}
                style={{ left: clampX, top: laneY, borderLeft: `3px solid ${tint(event.category)}` }}
                aria-pressed={selectedId === event.id}
                title={`${formatRange(event)} — ${event.title}\n${event.summary}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelect(event)}
              >
                <span className="marker__dot" style={{ background: tint(event.category) }} />
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

        <TimelineControls
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          onZoom={zoomCentre}
          onReset={() => onViewChange(FULL_VIEW)}
        />
      </div>

      <Overview
        events={events}
        view={view}
        onChange={onViewChange}
        highlight={highlight}
      />
    </div>
  );
}
