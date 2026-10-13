/**
 * A piecewise linear scale.
 *
 * Using a single linear scale from prehistory to today would squeeze every
 * event after 1000 into a sliver of the screen. Instead we map time onto a
 * normalised 0..1 axis where each historical era gets a chosen share of the
 * width, so the ancient past is compressed and the busy last thousand years
 * get room to breathe.
 *
 * Zoom and pan operate on a window inside the normalised axis, which keeps the
 * mapping monotonically increasing and therefore easy to reason about.
 */

interface Segment {
  from: number;
  to: number;
  /** Normalised start of this segment (0..1). */
  start: number;
  /** Normalised width of this segment (0..1). */
  span: number;
}

const BREAKPOINTS: { value: number; weight: number }[] = [
  { value: -9000, weight: 0.05 }, // Stone Age
  { value: 0, weight: 0.05 }, // to the birth of Christ
  { value: 500, weight: 0.05 }, // Romans / Anglo-Saxons
  { value: 1100, weight: 0.09 }, // Medieval
  { value: 1400, weight: 0.08 }, // late medieval
  { value: 1600, weight: 0.1 }, // Tudors & Stuarts
  { value: 1700, weight: 0.08 }, // 17th–18th c.
  { value: 1800, weight: 0.09 }, // Georgian / Victorian
  { value: 1850, weight: 0.09 },
  { value: 1900, weight: 0.1 }, // 20th century
  { value: 1950, weight: 0.09 },
  { value: 2000, weight: 0.07 },
  { value: 2020, weight: 0.06 },
];

const SEGMENTS: Segment[] = (() => {
  const total = BREAKPOINTS.slice(0, -1).reduce((sum, _b, i) => {
    return sum + BREAKPOINTS[i + 1].weight;
  }, 0);
  const segments: Segment[] = [];
  let acc = 0;
  for (let i = 0; i < BREAKPOINTS.length - 1; i++) {
    const weight = BREAKPOINTS[i + 1].weight;
    const span = weight / total;
    segments.push({
      from: BREAKPOINTS[i].value,
      to: BREAKPOINTS[i + 1].value,
      start: acc,
      span,
    });
    acc += span;
  }
  return segments;
})();

export const NORM_MIN = 0;
export const NORM_MAX = 1;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Map a year (negative = BC) to a normalised position on 0..1. */
export function toNorm(value: number): number {
  if (value <= SEGMENTS[0].from) return 0;
  const last = SEGMENTS[SEGMENTS.length - 1];
  if (value >= last.to) return 1;
  for (const seg of SEGMENTS) {
    if (value >= seg.from && value <= seg.to) {
      const t = (value - seg.from) / (seg.to - seg.from);
      return seg.start + t * seg.span;
    }
  }
  return 1;
}

/** Inverse of {@link toNorm}. */
export function toValue(norm: number): number {
  const n = clamp(norm, 0, 1);
  for (const seg of SEGMENTS) {
    if (n >= seg.start && n <= seg.start + seg.span) {
      const t = (n - seg.start) / seg.span;
      return seg.from + t * (seg.to - seg.from);
    }
  }
  return SEGMENTS[SEGMENTS.length - 1].to;
}

export interface ViewWindow {
  /** Normalised left edge, 0..1. */
  n0: number;
  /** Normalised right edge, 0..1. */
  n1: number;
}

export const FULL_VIEW: ViewWindow = { n0: NORM_MIN, n1: NORM_MAX };

/** Smallest window we allow, as a fraction of the full axis. */
export const MIN_SPAN = 0.006;

export function clampView(view: ViewWindow): ViewWindow {
  let span = clamp(view.n1 - view.n0, MIN_SPAN, NORM_MAX - NORM_MIN);
  let n0 = view.n0;
  if (n0 < NORM_MIN) n0 = NORM_MIN;
  if (n0 + span > NORM_MAX) n0 = NORM_MAX - span;
  return { n0, n1: n0 + span };
}

/** Convert a normalised position to a pixel x within a viewport of `width`. */
export function normToX(norm: number, view: ViewWindow, width: number): number {
  return ((norm - view.n0) / (view.n1 - view.n0)) * width;
}

/** Convert a pixel x back to a normalised position. */
export function xToNorm(x: number, view: ViewWindow, width: number): number {
  return view.n0 + (x / width) * (view.n1 - view.n0);
}

/** Zoom the window by `factor` (>1 zooms in) keeping `anchor` (0..1) fixed. */
export function zoomView(view: ViewWindow, factor: number, anchor: number): ViewWindow {
  const span = view.n1 - view.n0;
  const newSpan = clamp(span / factor, MIN_SPAN, NORM_MAX - NORM_MIN);
  const ratio = (anchor - view.n0) / span;
  const n0 = anchor - ratio * newSpan;
  return clampView({ n0, n1: n0 + newSpan });
}

/** Pan the window by a pixel delta at the given viewport width. */
export function panView(view: ViewWindow, dxPixels: number, width: number): ViewWindow {
  const span = view.n1 - view.n0;
  const dn = (dxPixels / width) * span;
  return clampView({ n0: view.n0 + dn, n1: view.n1 + dn });
}
