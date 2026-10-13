import type { TimelineEvent } from "../types";
import { toNorm, type ViewWindow, type normToX } from "./scale";

export interface PlacedEvent {
  event: TimelineEvent;
  x: number;
  /** Lane index, 0 is the lane nearest the axis. */
  lane: number;
  /** Estimated label width in pixels. */
  labelWidth: number;
}

interface LayoutOptions {
  view: ViewWindow;
  width: number;
  laneCount: number;
  /** Approximate character width of the label font, in pixels. */
  charWidth: number;
  /** Horizontal padding inside a label, in pixels. */
  labelPadding: number;
  /** Minimum gap between neighbouring labels, in pixels. */
  gap: number;
  xOf: typeof normToX;
}

/**
 * Place the visible events into horizontal lanes so labels do not overlap.
 *
 * More important events are placed first and get the lower lanes; events that
 * cannot find a free lane are omitted from the result.
 */
export function layoutEvents(events: TimelineEvent[], opts: LayoutOptions): PlacedEvent[] {
  const { view, width, laneCount, charWidth, labelPadding, gap, xOf } = opts;

  const candidates: PlacedEvent[] = [];
  for (const event of events) {
    const norm = toNorm(event.year);
    const x = xOf(norm, view, width);
    if (x < -200 || x > width + 200) continue;
    const text = `${formatRange(event)} ${event.title}`;
    // Handbook events carry a small badge, so reserve a little more room.
    const badge = event.source === "handbook" ? 30 : 0;
    const labelWidth = Math.min(280, text.length * charWidth + labelPadding + badge);
    candidates.push({ event, x, lane: 0, labelWidth });
  }

  // Most important first, then left to right. importance 3 > 2 > 1.
  candidates.sort((a, b) => b.event.importance - a.event.importance || a.x - b.x);

  const lanes: Array<Array<{ left: number; right: number }>> = Array.from(
    { length: laneCount },
    () => [],
  );

  const placed: PlacedEvent[] = [];

  for (const candidate of candidates) {
    const left = candidate.x - candidate.labelWidth / 2;
    const right = candidate.x + candidate.labelWidth / 2;
    let laneIndex = -1;
    for (let lane = 0; lane < laneCount; lane++) {
      const clashes = lanes[lane].some((o) => left < o.right + gap && right > o.left - gap);
      if (!clashes) {
        laneIndex = lane;
        break;
      }
    }
    if (laneIndex === -1) continue;
    lanes[laneIndex].push({ left, right });
    candidate.lane = laneIndex;
    placed.push(candidate);
  }

  return placed;
}

export function formatRange(event: TimelineEvent): string {
  if (event.displayDate) return event.displayDate;
  if (event.endYear !== undefined) return `${formatYear(event.year)}–${formatYear(event.endYear)}`;
  return formatYear(event.year);
}

export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BC`;
  if (year < 1000) return `AD ${year}`;
  return String(year);
}
