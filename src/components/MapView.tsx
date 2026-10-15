import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_BY_ID, categoryColor } from "../data/categories";
import { MAP_HEIGHT, MAP_WIDTH, REGION_PATHS, project } from "../lib/geo";
import {
  clampMapView,
  clusterPoints,
  fitView,
  layoutMapLabels,
  maxMapWidth,
  MIN_MAP_W,
  toPixels,
  viewBoxOf,
  type MapView,
} from "../lib/mapScale";
import { useMapGestures } from "../lib/useMapGestures";
import type { CategoryId, Place } from "../types";
import { MapMinimap } from "./MapMinimap";
import { TimelineControls } from "./TimelineControls";

interface Props {
  places: Place[];
  selectedId?: string;
  /** Category to emphasise; every other category is greyed while it is set. */
  highlight: CategoryId | null;
  onSelect: (place: Place) => void;
}

/**
 * Markers closer than this on screen are grouped into one cluster.
 *
 * Must stay above the marker's own size (28px): single-linkage clustering then
 * guarantees no two markers touch, which is what keeps the WCAG 2.2
 * target-size rule happy without shrinking the tap target.
 */
const CLUSTER_PX = 30;
/**
 * Pixels per map unit needed before a place of each importance gets a label.
 * Importance 3 is always labelled (unless another label is in the way), so the
 * map still reads as a map when it is zoomed all the way out.
 */
const LABEL_PX: Record<1 | 2 | 3, number> = { 3: 0, 2: 1, 1: 3 };
/** Rough width of one character in the 11px bold label, plus its padding. */
const LABEL_CHAR_W = 6.9;
const LABEL_PAD = 12;
/**
 * Fan-out ("spiderfy") geometry. Some places are simply closer together than
 * the deepest zoom can separate — Big Ben and Westminster Abbey are 300m apart,
 * which is under a pixel of the whole UK — so a cluster that cannot be split by
 * zooming is instead spread around its true position, with a leader line back
 * to it. The radius grows with the label width so the fanned labels stay
 * legible, and never grows beyond a starburst.
 */
const FAN_MIN_R = 34;
const FAN_MAX_R = 90;
/** How far a focused place wants its nearest neighbour, in pixels. */
const NEIGHBOUR_PX = CLUSTER_PX * 1.4;
/**
 * Widest view a focused place is given. An isolated place (Belfast, whose
 * nearest neighbour is 80km away) would otherwise be "focused" by zooming all
 * the way out, because no zoom is needed to tell it apart; this keeps a focus
 * regional. Places in a tight group still zoom in past it.
 */
const FOCUS_MAX_W = 200;
/** Fraction of the frame treated as an edge: inside it, a place is in view. */
const SAFE_MARGIN = 0.18;
const DEFAULT_ASPECT = MAP_HEIGHT / MAP_WIDTH;

/** Stable key for a set of places, independent of their order. */
const clusterKey = (ids: string[]) => `c-${[...ids].sort().join("-")}`;
const labelOf = (place: Place) => place.markerLabel ?? place.name;
const labelWidth = (place: Place) => labelOf(place).length * LABEL_CHAR_W + LABEL_PAD;

/** A place in map coordinates. */
interface MapPlace {
  id: string;
  importance: 1 | 2 | 3;
  place: Place;
  x: number;
  y: number;
}

/** A group of places that overlap at the current zoom, with screen positions. */
interface Cluster {
  key: string;
  members: MapPlace[];
  /** Centre in map units (used to zoom) and in pixels (used to draw). */
  mx: number;
  my: number;
  px: number;
  py: number;
}

/** A pin as actually drawn; `from` is set when it has been fanned out. */
interface RenderPin {
  key: string;
  place: Place;
  px: number;
  py: number;
  from?: { x: number; y: number };
}

/** A pin this far outside the frame is not drawn at all. */
const PIN_MARGIN = 16;

export function MapView({ places, selectedId, highlight, onSelect }: Props) {
  const pinsRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;
  const aspect = height > 0 && width > 0 ? height / width : DEFAULT_ASPECT;
  const aspectRef = useRef(aspect);
  aspectRef.current = aspect;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // The view is null until the container has been measured, so the first paint
  // always frames the whole map rather than guessing the shape of the stage.
  const [stored, setStored] = useState<MapView | null>(null);
  /** Once the user has moved the map, a resize must not yank the view back. */
  const touched = useRef(false);

  const view = useMemo(
    () => clampMapView(stored ?? fitView(aspect), aspect),
    [stored, aspect],
  );
  const viewRef = useRef(view);
  viewRef.current = view;

  /**
   * Places the user has asked to see individually ("spread out").
   *
   * Stored as place ids rather than cluster keys on purpose: which places fall
   * into one cluster depends on the frame width, and the frame width changes
   * when the detail panel opens. A key captured before that would stop matching
   * and the fan would silently close. A list also lets two tight groups stay
   * open at once (London has a 3 and a 2 that no zoom can separate) instead of
   * clicking one collapsing the other.
   */
  const [spread, setSpread] = useState<string[]>([]);
  const spreadRef = useRef(spread);
  spreadRef.current = spread;
  /** Set when a cluster is expanded, so keyboard focus can follow the members. */
  const focusFan = useRef(false);

  // The updater form lets several wheel or pinch events in one frame compose,
  // instead of each one starting from the same stale view.
  const changeView = useCallback((update: (view: MapView) => MapView) => {
    touched.current = true;
    setStored((prev) =>
      update(clampMapView(prev ?? fitView(aspectRef.current), aspectRef.current)),
    );
  }, []);

  const { containerRef, grabbing, zoomCentre, handlers } = useMapGestures({
    view,
    width,
    height,
    aspect,
    onViewChange: changeView,
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
      // Re-frame on the first measure, and again on resize *until* the user has
      // taken over; after that a resize only re-clamps the view.
      if (!touched.current) {
        const a = rect.width > 0 ? rect.height / rect.width : DEFAULT_ASPECT;
        setStored(fitView(a));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  const dimmed = (category: CategoryId) => highlight !== null && highlight !== category;
  const tint = (category: CategoryId) =>
    dimmed(category) ? "var(--faint)" : categoryColor(category);

  const points = useMemo<MapPlace[]>(
    () =>
      places.map((place) => {
        const { x, y } = project(place.lon, place.lat);
        return { id: place.id, importance: place.importance, place, x, y };
      }),
    [places],
  );

  const pxPerUnit = width > 0 ? width / view.w : 0;

  const clusters = useMemo<Cluster[]>(() => {
    const threshold = CLUSTER_PX / Math.max(pxPerUnit, 1e-6);
    return clusterPoints(points, threshold).map((cluster) => {
      const pixel = toPixels(cluster, view, width, height, aspect);
      return {
        key: clusterKey(cluster.members.map((m) => m.id)),
        members: cluster.members,
        mx: cluster.x,
        my: cluster.y,
        px: pixel.x,
        py: pixel.y,
      };
    });
  }, [points, pxPerUnit, view, width, height, aspect]);

  /**
   * The fans currently drawn: any cluster with at least one member the user has
   * asked to spread out. Zooming out far enough to tell a group apart collapses
   * its fan on its own, because there is no longer a cluster to fan.
   */
  const fans = useMemo(
    () =>
      clusters.filter(
        (c) => c.members.length > 1 && c.members.some((m) => spread.includes(m.id)),
      ),
    [clusters, spread],
  );
  const fannedKeys = useMemo(() => new Set(fans.map((f) => f.key)), [fans]);

  const renderPins = useMemo<RenderPin[]>(() => {
    /*
     * Only pins inside the frame are drawn. A pin scrolled off the edge would
     * otherwise still be in the DOM — invisible, but focusable, and its label
     * would be clamped back into view, floating with no marker under it.
     */
    const onScreen = (x: number, y: number) =>
      x >= -PIN_MARGIN && x <= width + PIN_MARGIN && y >= -PIN_MARGIN && y <= height + PIN_MARGIN;

    const pins: RenderPin[] = [];
    for (const cluster of clusters) {
      if (fannedKeys.has(cluster.key)) {
        const n = cluster.members.length;
        const widest = Math.max(...cluster.members.map((m) => labelWidth(m.place)));
        const radius = Math.min(
          FAN_MAX_R,
          Math.max(FAN_MIN_R, (widest + 10) / (2 * Math.sin(Math.PI / n))),
        );
        cluster.members.forEach((member, i) => {
          const angle = ((-90 + (360 * i) / n) * Math.PI) / 180;
          const x = cluster.px + radius * Math.cos(angle);
          const y = cluster.py + radius * Math.sin(angle);
          if (!onScreen(x, y)) return;
          const truth = toPixels(member, view, width, height, aspect);
          pins.push({
            key: member.id,
            place: member.place,
            px: x,
            py: y,
            from: { x: truth.x, y: truth.y },
          });
        });
      } else if (cluster.members.length === 1 && onScreen(cluster.px, cluster.py)) {
        pins.push({
          key: cluster.members[0].id,
          place: cluster.members[0].place,
          px: cluster.px,
          py: cluster.py,
        });
      }
    }
    return pins;
  }, [clusters, fannedKeys, view, width, height, aspect]);

  /** Clusters still drawn as a count marker, and inside the frame. */
  const clusterMarkers = useMemo(
    () =>
      clusters.filter(
        (c) =>
          c.members.length > 1 &&
          !fannedKeys.has(c.key) &&
          c.px >= -PIN_MARGIN &&
          c.px <= width + PIN_MARGIN &&
          c.py >= -PIN_MARGIN &&
          c.py <= height + PIN_MARGIN,
      ),
    [clusters, fannedKeys, width, height],
  );

  /**
   * Greedy label suppression, so a crowded corner drops text rather than
   * printing labels over each other. The pins themselves always stay.
   */
  const labelled = useMemo(() => {
    const candidates = renderPins.filter(
      (pin) => pin.from !== undefined || pxPerUnit >= LABEL_PX[pin.place.importance],
    );
    const kept = layoutMapLabels(
      candidates.map((pin) => ({
        x: pin.px,
        y: pin.py,
        importance: pin.place.importance,
        width: labelWidth(pin.place),
      })),
    );
    return new Set(candidates.filter((_, i) => kept.has(i)).map((pin) => pin.key));
  }, [renderPins, pxPerUnit]);

  /**
   * A cluster click must always reveal its members. If zooming separates them,
   * the click just zooms; if it cannot — because they are closer than the
   * deepest zoom can pull apart — the members are fanned out around their true
   * position instead. Clicking again collapses the fan.
   */
  const onClusterClick = useCallback(
    (cluster: Cluster) => {
      const xs = cluster.members.map((m) => m.x);
      const ys = cluster.members.map((m) => m.y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const spanX = Math.max(Math.max(...xs) - Math.min(...xs), 1) * 2.4;
      const spanY = Math.max(Math.max(...ys) - Math.min(...ys), 1) * 2.4;
      const a = aspectRef.current;
      const w = Math.max(MIN_MAP_W, Math.min(viewRef.current.w / 1.4, Math.max(spanX, spanY / a)));
      const next = clampMapView({ cx, cy, w }, a);
      changeView(() => next);

      const frameWidth = Math.max(sizeRef.current.width, 1);
      const separated = clusterPoints(cluster.members, (CLUSTER_PX * next.w) / frameWidth).length > 1;
      const ids = cluster.members.map((m) => m.id);
      const allSpread = ids.every((id) => spreadRef.current.includes(id));
      if (separated || allSpread) {
        // Zooming told them apart (nothing to fan), or this fan was already
        // open and the click means "close it again".
        setSpread((prev) => prev.filter((id) => !ids.includes(id)));
        return;
      }
      setSpread((prev) => [...prev, ...ids.filter((id) => !prev.includes(id))]);
      focusFan.current = true;
    },
    [changeView],
  );

  /**
   * Selecting a place brings it into view at a readable zoom.
   *
   * Driven by the selection rather than by gestures, so picking a place from
   * the list or the search box lands you on it however far away the map had
   * been panned. A place that is already on screen and drawn on its own is left
   * alone, which keeps clicking a pin from yanking the map about.
   */
  const focusedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId) {
      focusedFor.current = null;
      return;
    }
    const frameWidth = sizeRef.current.width;
    const frameHeight = sizeRef.current.height;
    if (frameWidth === 0 || frameHeight === 0) return; // wait for the first measure
    if (focusedFor.current === selectedId) return;
    const point = points.find((p) => p.id === selectedId);
    if (!point) return;
    focusedFor.current = selectedId;

    const a = frameHeight / frameWidth;
    const current = viewRef.current;
    const here = clusterPoints(points, CLUSTER_PX / (frameWidth / current.w));
    const group = here.find((g) => g.members.some((m) => m.id === selectedId));
    const onItsOwn =
      !!group &&
      (group.members.length === 1 ||
        group.members.some((m) => spreadRef.current.includes(m.id)));
    const now = toPixels(point, current, frameWidth, frameHeight, a);
    const inView =
      now.x > frameWidth * SAFE_MARGIN &&
      now.x < frameWidth * (1 - SAFE_MARGIN) &&
      now.y > frameHeight * SAFE_MARGIN &&
      now.y < frameHeight * (1 - SAFE_MARGIN);
    if (onItsOwn && inView) return;

    /*
     * Pick the zoom: the most zoomed-out view at which the nearest neighbour
     * still clears the cluster radius (so this place is drawn as its own pin,
     * never folded into a group), capped so an isolated place is not "focused"
     * by zooming the whole map out.
     */
    let nearest = Infinity;
    for (const other of points) {
      if (other.id === selectedId) continue;
      nearest = Math.min(nearest, Math.hypot(other.x - point.x, other.y - point.y));
    }
    const separation = Number.isFinite(nearest)
      ? (nearest * frameWidth) / NEIGHBOUR_PX
      : MIN_MAP_W;
    const w = Math.max(MIN_MAP_W, Math.min(FOCUS_MAX_W, separation));
    const next = clampMapView({ cx: point.x, cy: point.y, w }, a);
    changeView(() => next);

    /*
     * Still inseparable at that zoom (Big Ben and Westminster Abbey, say)? Mark
     * the selection for spreading out, so its group is fanned whatever width the
     * frame settles at once the detail panel has opened. Focusing replaces any
     * other spread: the user has moved on.
     */
    setSpread([selectedId]);
  }, [selectedId, width, points, changeView]);

  // The cluster button is replaced by its members, so keyboard focus has to
  // move into the fan — otherwise it would fall back to the document body.
  useEffect(() => {
    if (fans.length === 0 || !focusFan.current) return;
    focusFan.current = false;
    pinsRef.current?.querySelector<HTMLElement>("[data-fanned]")?.focus();
  }, [fans]);

  // Nudge labels back inside the frame using their real measured width, exactly
  // as the timeline does for its markers.
  useLayoutEffect(() => {
    const layer = pinsRef.current;
    if (!layer) return;
    const edge = 6;
    const layerRect = layer.getBoundingClientRect();
    for (const node of Array.from(layer.querySelectorAll<HTMLElement>(".pin__label"))) {
      node.style.marginLeft = "0px";
      const rect = node.getBoundingClientRect();
      const left = rect.left - layerRect.left;
      const right = left + rect.width;
      let shift = 0;
      if (left < edge) shift = edge - left;
      else if (right > layerRect.width - edge) shift = layerRect.width - edge - right;
      if (shift !== 0) node.style.marginLeft = `${shift}px`;
    }
  }, [renderPins, view, width, height]);

  const canZoomIn = view.w > MIN_MAP_W * 1.01;
  const canZoomOut = view.w < maxMapWidth(aspect) - 1e-6;
  const frameWidth = Math.max(width, 1);
  const frameHeight = Math.max(height, 1);

  return (
    <div
      className={`map${grabbing ? " is-grabbing" : ""}`}
      ref={containerRef}
      {...handlers}
      tabIndex={0}
      role="application"
      aria-label="Interactive map of the United Kingdom. Use arrow keys to pan and plus or minus to zoom, then choose a place."
    >
      {/*
        The outline is decorative here: every place is a real button below, and
        `PlaceList` repeats them as a list, so the SVG carries no information a
        screen reader would miss.
      */}
      <svg
        className="map__svg"
        viewBox={viewBoxOf(view, aspect)}
        preserveAspectRatio="none"
        aria-hidden
      >
        {REGION_PATHS.map((region) => (
          <path
            key={region.id}
            d={region.d}
            className={`map__region map__region--${region.id}`}
            fill={region.id === "ireland" ? "var(--map-land)" : `var(--map-${region.id})`}
          />
        ))}
      </svg>

      <div className="map__pins" ref={pinsRef}>
        {/* Leader lines first, so they sit under the pins that they point to. */}
        {renderPins.map((pin) => {
          if (!pin.from) return null;
          const dx = pin.px - pin.from.x;
          const dy = pin.py - pin.from.y;
          const length = Math.hypot(dx, dy);
          if (length < 1) return null;
          return (
            <span
              key={`link-${pin.key}`}
              className="map__link"
              aria-hidden
              style={{
                left: `${(pin.from.x / frameWidth) * 100}%`,
                top: `${(pin.from.y / frameHeight) * 100}%`,
                width: `${length}px`,
                transform: `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`,
              }}
            />
          );
        })}

        {clusterMarkers.map((cluster) => {
          const names = cluster.members.map((m) => m.place.name);
          return (
            <button
              key={cluster.key}
              type="button"
              className="pin pin--cluster"
              data-cluster={cluster.key}
              style={{
                left: `${(cluster.px / frameWidth) * 100}%`,
                top: `${(cluster.py / frameHeight) * 100}%`,
              }}
              aria-label={`${names.length} places close together: ${names.join(", ")}. Choose to spread them out.`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onClusterClick(cluster)}
            >
              <span aria-hidden>{names.length}</span>
            </button>
          );
        })}

        {renderPins.map((pin) => {
          const place = pin.place;
          return (
            <button
              key={pin.key}
              type="button"
              className={`pin${dimmed(place.category) ? " pin--muted" : ""}${
                selectedId === place.id ? " is-selected" : ""
              }`}
              data-place={place.id}
              {...(pin.from ? { "data-fanned": "true" } : {})}
              style={
                {
                  left: `${(pin.px / frameWidth) * 100}%`,
                  top: `${(pin.py / frameHeight) * 100}%`,
                  "--pin": tint(place.category),
                } as React.CSSProperties
              }
              aria-pressed={selectedId === place.id}
              aria-label={`${place.name}${place.area ? `, ${place.area}` : ""} — ${
                CATEGORY_BY_ID[place.category].label
              }`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSelect(place)}
            >
              <span className="pin__dot" />
              {labelled.has(pin.key) && (
                <span className="pin__label" aria-hidden>
                  {labelOf(place)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="timeline__hint map__hint">
        <span>Scroll or pinch to zoom</span>
        <span>·</span>
        <span>drag to pan</span>
      </div>

      <MapMinimap
        places={places}
        view={view}
        aspect={aspect}
        highlight={highlight}
        onChange={changeView}
      />

      <TimelineControls
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        onZoom={zoomCentre}
        onReset={() => {
          touched.current = false;
          setSpread([]);
          setStored(fitView(aspect));
        }}
      />
    </div>
  );
}
