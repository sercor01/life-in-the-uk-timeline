import { useLayoutEffect, useRef, useState } from "react";
import { categoryColor } from "../data/categories";
import { MAP_HEIGHT, MAP_WIDTH, REGION_PATHS, project } from "../lib/geo";
import { viewHeight, type MapView } from "../lib/mapScale";
import type { CategoryId, Place } from "../types";

interface Props {
  places: Place[];
  view: MapView;
  /** The main frame's aspect, so the window rectangle matches what is shown. */
  aspect: number;
  /** Category to emphasise; every other category is dimmed. */
  highlight: CategoryId | null;
  onChange: (update: (view: MapView) => MapView) => void;
}

/** Dot radius in map units; small enough to read as a speck at any inset size. */
const DOT_R = 7;
/**
 * Smallest the indicator is drawn, in CSS pixels.
 *
 * At a deep zoom the true rectangle is a couple of pixels across and simply
 * cannot be seen, so it is drawn no smaller than this. The *centre* stays
 * exact, which is what the inset is for; only the drawn size is floored.
 */
const MIN_INDICATOR_PX = 16;

/**
 * A corner inset showing the whole country, where the current view sits inside
 * it, and every place as a speck. Clicking or dragging it moves the map.
 *
 * Like the timeline's `Overview`, this is a pointer convenience with no ARIA:
 * panning and zooming are available from the keyboard on the map itself, so
 * announcing a second, non-keyboard control would only add noise.
 */
export function MapMinimap({ places, view, aspect, highlight, onChange }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const h = viewHeight(view, aspect);

  // The inset's width in pixels, so the indicator's minimum size can be worked
  // out in map units.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBoxWidth(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pxPerUnit = boxWidth > 0 ? boxWidth / MAP_WIDTH : 0;
  const minUnits = pxPerUnit > 0 ? MIN_INDICATOR_PX / pxPerUnit : 0;
  const markW = Math.max(view.w, minUnits);
  const markH = Math.max(h, minUnits);

  const boxRect = () => boxRef.current?.getBoundingClientRect();

  function onPointerDown(e: React.PointerEvent) {
    const rect = boxRect();
    if (!rect || rect.width === 0) return;
    // The inset sits inside the map, whose own pointer-down starts a pan.
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const mx = ((e.clientX - rect.left) / rect.width) * MAP_WIDTH;
    const my = ((e.clientY - rect.top) / rect.height) * MAP_HEIGHT;
    // Clicking outside the window jumps to that spot; clicking inside grabs it.
    const inside = Math.abs(mx - view.cx) <= view.w / 2 && Math.abs(my - view.cy) <= h / 2;
    drag.current = inside
      ? { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy }
      : { x: e.clientX, y: e.clientY, cx: mx, cy: my };
    if (!inside) onChange(() => ({ cx: mx, cy: my, w: view.w }));
  }

  function onPointerMove(e: React.PointerEvent) {
    const start = drag.current;
    const rect = boxRect();
    if (!start || !rect || rect.width === 0) return;
    // Measured from the gesture's start, not accumulated, so a fast drag with
    // many events in one frame still lands where the pointer is.
    const dx = ((e.clientX - start.x) / rect.width) * MAP_WIDTH;
    const dy = ((e.clientY - start.y) / rect.height) * MAP_HEIGHT;
    onChange(() => ({ cx: start.cx + dx, cy: start.cy + dy, w: view.w }));
  }

  function endDrag() {
    drag.current = null;
  }

  return (
    <div
      className="map-minimap"
      ref={boxRef}
      style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-hidden
    >
      <svg
        className="map-minimap__svg"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {REGION_PATHS.map((region) => (
          <path
            key={region.id}
            d={region.d}
            className="map-minimap__region"
            fill={region.id === "ireland" ? "var(--map-land)" : `var(--map-${region.id})`}
          />
        ))}

        {places.map((place) => {
          const { x, y } = project(place.lon, place.lat);
          return (
            <circle
              key={place.id}
              className="map-minimap__dot"
              cx={x}
              cy={y}
              r={DOT_R}
              fill={
                highlight !== null && highlight !== place.category
                  ? "var(--faint)"
                  : categoryColor(place.category)
              }
            />
          );
        })}

        {/* The visible area, centred exactly on the view. It can reach past the
            coast when the map is panned to its edge; the SVG clips it, which is
            honest. The halo is drawn first so the indicator reads over any land
            tint, then the indicator itself. */}
        <rect
          className="map-minimap__halo"
          x={view.cx - markW / 2}
          y={view.cy - markH / 2}
          width={markW}
          height={markH}
        />
        <rect
          className="map-minimap__window"
          data-view-w={Math.round(view.w)}
          x={view.cx - markW / 2}
          y={view.cy - markH / 2}
          width={markW}
          height={markH}
        />
      </svg>
    </div>
  );
}
