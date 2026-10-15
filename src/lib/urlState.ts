import { ANNUAL_EVENTS } from "../data/annual";
import { EVENT_BY_ID } from "../data/events";
import { PLACES } from "../data/places";
import {
  ALL_CATEGORIES,
  createInitialState,
  selectionKey,
  visiblePanel,
  type AppState,
} from "./appState";
import { clampView, toNorm, toValue, type ViewWindow } from "./scale";
import type { MapView } from "./mapScale";
import type { AnnualEvent, CategoryId, Place, Selection, Tab } from "../types";

/**
 * The query string, as the app's shareable half.
 *
 * The URL carries the view rather than pointing at a server route, which is the
 * only shape a static page can offer: `?tab=map&sel=place:stonehenge` is read at
 * boot and rewritten as the visitor moves, by `useUrlState`. Nothing here
 * touches `window` or React — it is a pure pair of functions, and it is the one
 * place that decides what a shared link means.
 *
 * Everything is relative to the defaults: a bare `/` is the whole timeline with
 * every category on, so only the differences are written. That keeps a link
 * short, and it means a hand-edited or hand-typed URL is read forgivingly —
 * anything unrecognised falls back to the default it would have had.
 */

const ANNUAL_BY_ID: Record<string, AnnualEvent> = Object.fromEntries(
  ANNUAL_EVENTS.map((e) => [e.id, e]),
);
const PLACE_BY_ID: Record<string, Place> = Object.fromEntries(
  PLACES.map((p) => [p.id, p]),
);

const TABS: Tab[] = ["timeline", "calendar", "map", "population"];

/**
 * A number for the URL: rounded to `dp` places and stripped of trailing zeros.
 * Years need four places — at the deepest zoom the whole window is under two
 * years wide, so a coarser number would visibly move the view it restored.
 */
const num = (value: number, dp: number) => String(Number(value.toFixed(dp)));

/** The visible years, or null for the full axis. */
function encodeView(view: ViewWindow): string | null {
  if (view.n0 <= 1e-9 && view.n1 >= 1 - 1e-9) return null;
  return `${num(toValue(view.n0), 4)},${num(toValue(view.n1), 4)}`;
}

function decodeView(raw: string | null): ViewWindow | null {
  if (!raw) return null;
  const parts = raw.split(",").map(Number);
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) return null;
  const [a, b] = parts;
  const [from, to] = a <= b ? [a, b] : [b, a];
  // `toNorm` pins the ends of the axis, so only `y=0,9999` needs clamping.
  return clampView({ n0: toNorm(from), n1: toNorm(to) });
}

function encodeMapView(view: MapView | null): string | null {
  if (!view) return null;
  return `${num(view.cx, 2)},${num(view.cy, 2)},${num(view.w, 2)}`;
}

function decodeMapView(raw: string | null): MapView | null {
  if (!raw) return null;
  const parts = raw.split(",").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [cx, cy, w] = parts;
  // A zero-width rectangle would divide by zero in every projection.
  return w > 0 ? { cx, cy, w } : null;
}

function decodeSelection(raw: string | null): Selection | null {
  if (!raw) return null;
  const cut = raw.indexOf(":");
  if (cut < 0) return null;
  const kind = raw.slice(0, cut);
  const id = raw.slice(cut + 1);
  if (kind === "event") {
    const event = EVENT_BY_ID[id];
    return event ? { kind: "event", event } : null;
  }
  if (kind === "place") {
    const place = PLACE_BY_ID[id];
    return place ? { kind: "place", place } : null;
  }
  if (kind === "annual") {
    const event = ANNUAL_BY_ID[id];
    return event ? { kind: "annual", event } : null;
  }
  // Unknown kind, or an id that no longer exists — a link shared before the
  // data was renamed.
  return null;
}

/** The categories switched *off*, so the everyday "everything on" is the empty set. */
function encodeActive(active: Set<CategoryId>): string | null {
  const hidden = ALL_CATEGORIES.filter((id) => !active.has(id));
  return hidden.length > 0 ? hidden.join(",") : null;
}

function decodeActive(raw: string | null): Set<CategoryId> {
  // Unknown tokens in the list simply match no category, so they are ignored.
  const hidden = new Set(raw ? raw.split(",") : []);
  return new Set(ALL_CATEGORIES.filter((id) => !hidden.has(id)));
}

/**
 * The query string for a state, without the "?" and without defaults.
 *
 * Built by hand rather than with `URLSearchParams`, which percent-encodes the
 * "," and ":" that make `y=1600,1650` and `sel=place:stonehenge` readable at a
 * glance. Both are legal in a query value; only the search text needs escaping.
 */
export function encodeState(state: AppState): string {
  const parts: string[] = [];
  if (state.tab !== "timeline") parts.push(`tab=${state.tab}`);
  if (state.mode !== "timeline") parts.push(`mode=${state.mode}`);

  const view = encodeView(state.view);
  if (view) parts.push(`y=${view}`);

  const map = encodeMapView(state.mapView);
  if (map) parts.push(`m=${map}`);

  const selection = selectionKey(visiblePanel(state));
  if (selection) parts.push(`sel=${selection}`);

  if (state.query.trim()) parts.push(`q=${encodeURIComponent(state.query)}`);

  const active = encodeActive(state.active);
  if (active) parts.push(`off=${active}`);

  return parts.join("&");
}

/** The state a URL describes, with anything missing or unrecognised defaulted. */
export function parseState(search: string): AppState {
  const params = new URLSearchParams(search);
  const initial = createInitialState();

  const tab = params.get("tab");
  const selection = decodeSelection(params.get("sel"));
  return {
    tab: TABS.includes(tab as Tab) ? (tab as Tab) : initial.tab,
    mode: params.get("mode") === "list" ? "list" : initial.mode,
    view: decodeView(params.get("y")) ?? initial.view,
    mapView: decodeMapView(params.get("m")),
    // The link names the panel that was on screen; it belongs to the tab its
    // subject lives on, which is the one it was opened from.
    panels: selection
      ? { ...initial.panels, [selection.kind]: selection }
      : initial.panels,
    query: params.get("q") ?? "",
    active: decodeActive(params.get("off")),
  };
}
