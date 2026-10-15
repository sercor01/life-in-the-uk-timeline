import { MAP_HEIGHT, MAP_WIDTH, type MapPoint } from "./geo";

/**
 * View maths for the map.
 *
 * A view is a rectangle in map space: a centre and a *width*. The height is
 * derived from the container's aspect ratio, so the SVG `viewBox` and the HTML
 * pins over it always agree on where a point lands. Zoom and pan never touch
 * pixels — only this rectangle — which is the same discipline the timeline
 * uses for its normalised window.
 */
export interface MapView {
  /** Centre of the visible rectangle, in map units. */
  cx: number;
  cy: number;
  /** Visible width in map units. The visible height is `w * aspect`. */
  w: number;
}

/** How far past the map edge the view may stray, as a fraction of the map. */
const PAN_PAD = 0.2;
/** Closest zoom, in map units across. 20 units is roughly 20 km. */
export const MIN_MAP_W = 20;

/**
 * Widest the view may be, for a container of the given aspect. Zooming out
 * stops here, which is exactly the point where the whole map is visible: on a
 * wide screen the sea fills the sides, on a tall one it fills the top and
 * bottom. Either way nothing is cropped and nothing is letterboxed away.
 */
export function maxMapWidth(aspect: number): number {
  return Math.max(MAP_WIDTH, MAP_HEIGHT / Math.max(aspect, 1e-3));
}

/** Height of the visible rectangle for a given view and container aspect. */
export function viewHeight(view: MapView, aspect: number): number {
  return view.w * aspect;
}

/** The initial view: the whole map, centred, filling the container's aspect. */
export function fitView(aspect: number): MapView {
  return { cx: MAP_WIDTH / 2, cy: MAP_HEIGHT / 2, w: maxMapWidth(aspect) };
}

/** Keep the centre near the map, allowing a little sea around the edges. */
function clampAxis(centre: number, size: number, extent: number): number {
  const half = size / 2;
  const lo = -extent * PAN_PAD + half;
  const hi = extent * (1 + PAN_PAD) - half;
  if (lo > hi) return extent / 2; // the view is bigger than the padded map
  return Math.min(hi, Math.max(lo, centre));
}

export function clampMapView(view: MapView, aspect: number): MapView {
  const w = Math.min(Math.max(view.w, MIN_MAP_W), maxMapWidth(aspect));
  const h = w * aspect;
  return {
    w,
    cx: clampAxis(view.cx, w, MAP_WIDTH),
    cy: clampAxis(view.cy, h, MAP_HEIGHT),
  };
}

/** Zoom by `factor` (>1 zooms in), keeping the map point under `anchor` still. */
export function zoomMapView(
  view: MapView,
  factor: number,
  anchor: MapPoint,
  aspect: number,
): MapView {
  const w = Math.min(Math.max(view.w / factor, MIN_MAP_W), maxMapWidth(aspect));
  // Where the anchor sat inside the old rectangle, as a fraction.
  const fx = (anchor.x - (view.cx - view.w / 2)) / view.w;
  const fy = (anchor.y - (view.cy - viewHeight(view, aspect) / 2)) / viewHeight(view, aspect);
  const cx = anchor.x - (fx - 0.5) * w;
  const cy = anchor.y - (fy - 0.5) * (w * aspect);
  return clampMapView({ cx, cy, w }, aspect);
}

/** Pan by a pixel delta at the given container size. */
export function panMapView(
  view: MapView,
  dxPixels: number,
  dyPixels: number,
  width: number,
  height: number,
  aspect: number,
): MapView {
  const h = viewHeight(view, aspect);
  const cx = view.cx - (dxPixels / width) * view.w;
  const cy = view.cy - (dyPixels / height) * h;
  return clampMapView({ cx, cy, w: view.w }, aspect);
}

/** Map units per pixel at the current view. */
export function unitsPerPixel(view: MapView, width: number): number {
  return view.w / Math.max(width, 1);
}

export interface Pixels {
  x: number;
  y: number;
}

/** Where a map point lands inside a container of the given pixel size. */
export function toPixels(
  point: MapPoint,
  view: MapView,
  width: number,
  height: number,
  aspect: number,
): Pixels {
  const h = viewHeight(view, aspect);
  return {
    x: ((point.x - (view.cx - view.w / 2)) / view.w) * width,
    y: ((point.y - (view.cy - h / 2)) / h) * height,
  };
}

/** The pixel under a client position, in map units. */
export function toMapPoint(
  px: number,
  py: number,
  view: MapView,
  width: number,
  height: number,
  aspect: number,
): MapPoint {
  const h = viewHeight(view, aspect);
  return {
    x: view.cx - view.w / 2 + (px / Math.max(width, 1)) * view.w,
    y: view.cy - h / 2 + (py / Math.max(height, 1)) * h,
  };
}

/** The `viewBox` attribute matching a view. */
export function viewBoxOf(view: MapView, aspect: number): string {
  const h = viewHeight(view, aspect);
  return `${(view.cx - view.w / 2).toFixed(2)} ${(view.cy - h / 2).toFixed(2)} ${view.w.toFixed(2)} ${h.toFixed(2)}`;
}

// ------------------------------------------------------------------ clusters

export interface Clusterable extends MapPoint {
  id: string;
  importance: 1 | 2 | 3;
}

export interface Cluster<T extends Clusterable> {
  /** The members, ordered most important first. */
  members: T[];
  /** Where the cluster or lone pin is drawn. */
  x: number;
  y: number;
}

/**
 * Group points that would sit on top of each other at the current zoom.
 *
 * Connected components of the "closer than `threshold`" graph (single
 * linkage), which is what makes the result safe as well as tidy: any two
 * points in *different* clusters are guaranteed to be more than `threshold`
 * apart. A greedy nearest-first pass does not give that — it can leave two
 * near neighbours in separate clusters, and the markers then overlap, which
 * fails the WCAG 2.2 target-size rule.
 *
 * Components are returned most-important first for stable keys.
 */
export function clusterPoints<T extends Clusterable>(
  points: T[],
  threshold: number,
): Cluster<T>[] {
  const parent = points.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    // Path compression, so repeated lookups stay near constant time.
    let node = i;
    while (parent[node] !== root) {
      const next = parent[node];
      parent[node] = root;
      node = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };

  const limit = threshold * threshold;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (dx * dx + dy * dy <= limit) union(i, j);
    }
  }

  const groups = new Map<number, T[]>();
  points.forEach((point, i) => {
    const root = find(i);
    const group = groups.get(root);
    if (group) group.push(point);
    else groups.set(root, [point]);
  });

  const clusters: Cluster<T>[] = [...groups.values()].map((members) => {
    members.sort((a, b) => b.importance - a.importance || a.id.localeCompare(b.id));
    return {
      members,
      x: members.reduce((sum, m) => sum + m.x, 0) / members.length,
      y: members.reduce((sum, m) => sum + m.y, 0) / members.length,
    };
  });

  clusters.sort(
    (a, b) =>
      b.members[0].importance - a.members[0].importance ||
      a.members[0].id.localeCompare(b.members[0].id),
  );
  return clusters;
}

export interface Labelled {
  x: number;
  y: number;
  importance: 1 | 2 | 3;
  /** Estimated width of the label in pixels. */
  width: number;
}

/** Vertical offset of a label's box below its pin, in pixels. */
const LABEL_TOP = 18;
const LABEL_BOTTOM = 34;
const LABEL_GAP = 2;

/**
 * Choose which labels to draw, greedily, most important first.
 *
 * The pins are never hidden — only their labels — so a crowded corner loses
 * text rather than markers. Returns the indices (into `labels`) that fit. The
 * same greedy approach as the timeline's lane packing, for the same reason:
 * a label laid over another is worse than no label.
 */
export function layoutMapLabels(labels: Labelled[]): Set<number> {
  const order = labels
    .map((label, index) => ({ label, index }))
    .sort(
      (a, b) =>
        b.label.importance - a.label.importance ||
        a.label.y - b.label.y ||
        a.label.x - b.label.x,
    );

  const placed: { left: number; right: number; top: number; bottom: number }[] = [];
  const kept = new Set<number>();

  for (const { label, index } of order) {
    const box = {
      left: label.x - label.width / 2 - LABEL_GAP,
      right: label.x + label.width / 2 + LABEL_GAP,
      top: label.y + LABEL_TOP,
      bottom: label.y + LABEL_BOTTOM,
    };
    const clashes = placed.some(
      (p) => box.left < p.right && box.right > p.left && box.top < p.bottom && box.bottom > p.top,
    );
    if (clashes) continue;
    placed.push(box);
    kept.add(index);
  }
  return kept;
}
