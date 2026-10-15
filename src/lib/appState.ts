import { CATEGORIES } from "../data/categories";
import { eventAtPlace } from "../data/places";
import { FULL_VIEW, MIN_SPAN, clampView, toNorm, type ViewWindow } from "./scale";
import type { MapView } from "./mapScale";
import type { CategoryId, Selection, SelectionKind, Tab, TimelineMode } from "../types";

/**
 * The whole app, as one value.
 *
 * Everything a visitor can arrange — the tab, the timeline window, the map's
 * rectangle, the open detail panels, the search text and the category filters —
 * lives here and nowhere else, because this is exactly the set of things a
 * shared link has to carry and a Back button has to restore. `urlState.ts`
 * turns it into a query string; `useUrlState` keeps the two in step.
 *
 * The reducer is pure and every action is a plain, serialisable object, so the
 * history policy (`isNavigating`) can be read off the action — and, where the
 * answer is "it depends", off the state the action applies to.
 */
export interface AppState {
  tab: Tab;
  /** Graph or list; only meaningful on the timeline tab. */
  mode: TimelineMode;
  /** Timeline window, in the scale's normalised 0..1 space. */
  view: ViewWindow;
  /**
   * Map rectangle, or null while the map is still framing itself. Null is "fit
   * the container", which is why it is not simply the fitted rectangle: a
   * fitted view depends on the frame's aspect ratio, so storing one would go
   * stale on the first resize (and would put a pointless `m=` in every link).
   */
  mapView: MapView | null;
  /**
   * The panel each *tab* has open, kept by the kind of thing it shows — an
   * event on the timeline, a date on the calendar, a place on the map.
   *
   * One selection would not survive a journey. Following an event's place to
   * the map selects that place, and coming back to the timeline must not have
   * forgotten which event was open; and since a tab switch keeps everything
   * else (the weeks you had zoomed to, the filters, the search), it has to keep
   * the panel too. The URL still describes only what is on screen
   * (`visiblePanel`), so a shared link stays short and says exactly what the
   * sharer was looking at.
   */
  panels: Record<SelectionKind, Selection | null>;
  query: string;
  /** Categories switched on in the legend. */
  active: Set<CategoryId>;
}

/** Kinds of panel, in the order the tabs come. */
const PANEL_KINDS: SelectionKind[] = ["event", "annual", "place"];

/** The tab each kind of panel lives on. */
const TAB_OF_KIND: Record<SelectionKind, Tab> = {
  event: "timeline",
  annual: "calendar",
  place: "map",
};

/** The panel the current tab is showing, if any. */
export function visiblePanel(state: AppState): Selection | null {
  const kind = PANEL_KINDS.find((k) => TAB_OF_KIND[k] === state.tab);
  return kind ? state.panels[kind] : null;
}

/** Every category id, in the order the legend lists them. */
export const ALL_CATEGORIES: CategoryId[] = CATEGORIES.map((c) => c.id);

/** A stable name for a selection — `place:stonehenge`, `event:magna-carta` —
 * used both as the URL's `sel` value and to tell "open this panel" from "open
 * the panel that is already open".
 */
export function selectionKey(selection: Selection | null): string | null {
  if (!selection) return null;
  const id = selection.kind === "place" ? selection.place.id : selection.event.id;
  return `${selection.kind}:${id}`;
}

/** A comparable name for a whole set of panels, so a no-op is recognisable. */
const panelsKey = (panels: AppState["panels"]) =>
  PANEL_KINDS.map((kind) => selectionKey(panels[kind])).join("|");

/**
 * A place that is the site of an event selects that event on the timeline too.
 *
 * The two views point at each other, so looking at St Paul's Cathedral *is*
 * looking at the Great Fire of London: pick the place and the timeline is on its
 * date, and returning there shows the event rather than whatever was open
 * before. It is deliberately one-way — a place names at most one event, while an
 * event can be the site of several places (the Norman Conquest is both the Tower
 * of London and Hastings), so those stay a list of links in the panel rather
 * than an automatic jump.
 *
 * A place with no event of its own leaves the timeline alone: the map is simply
 * looking at somewhere the timeline has nothing to say about, and throwing away
 * the reader's place in it would be the worse surprise.
 */
function followPlace(
  panels: AppState["panels"],
  selection: Selection,
): AppState["panels"] {
  if (selection.kind !== "place") return panels;
  const event = eventAtPlace(selection.place);
  return event ? { ...panels, event: { kind: "event", event } } : panels;
}

/**
 * How much of the axis a focused event gets. Well inside `MIN_SPAN`'s
 * neighbourhood, because a single date wants its neighbours for context, not
 * the whole century.
 */
const FOCUS_SPAN = Math.max(MIN_SPAN * 5, 0.05);

/** A fresh default state. Each call gets its own `Set`, not a shared one. */
export function createInitialState(): AppState {
  return {
    tab: "timeline",
    mode: "timeline",
    view: FULL_VIEW,
    mapView: null,
    panels: { event: null, annual: null, place: null },
    query: "",
    active: new Set(ALL_CATEGORIES),
  };
}

export type Action =
  /** Show this panel on the tab it belongs to. */
  | { type: "select"; selection: Selection }
  /** Dismiss whatever the current tab is showing. */
  | { type: "closePanel" }
  /**
   * A search result or a cross-link: the panel *and* wherever it points. This
   * is the only action that clears the search, because the box doubles as a
   * live filter and carrying "Hadrian" onto the map would strand the viewer
   * with a single pin and nothing on screen to explain why.
   */
  | { type: "pick"; selection: Selection }
  /** Switch tab. Each tab keeps the panel it had, and its own state. */
  | { type: "tab"; tab: Tab }
  | { type: "mode"; mode: TimelineMode }
  | { type: "query"; query: string }
  /** Timeline zoom/pan. */
  | { type: "view"; view: ViewWindow }
  /** Map zoom/pan; null fits the container again. */
  | { type: "mapView"; view: MapView | null }
  | { type: "toggleCategory"; id: CategoryId }
  | { type: "isolateCategory"; id: CategoryId }
  | { type: "toggleAllCategories" }
  /** Back/forward, or the first read of the URL. */
  | { type: "restore"; state: AppState };

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "select": {
      const selection = action.selection;
      const panels = followPlace(
        { ...state.panels, [selection.kind]: selection },
        selection,
      );
      // Re-picking what is already open is not a change: no re-render, and so
      // no history entry either. Comparing the whole set catches the case where
      // the place is the same but the event it dragged along is not.
      return panelsKey(panels) === panelsKey(state.panels)
        ? state
        : { ...state, panels };
    }

    case "closePanel": {
      const kind = PANEL_KINDS.find((k) => TAB_OF_KIND[k] === state.tab);
      if (!kind || state.panels[kind] === null) return state;
      return { ...state, panels: { ...state.panels, [kind]: null } };
    }

    case "pick": {
      const selection = action.selection;
      const panels = followPlace(
        { ...state.panels, [selection.kind]: selection },
        selection,
      );
      if (selection.kind === "annual") {
        return { ...state, panels, tab: "calendar", query: "" };
      }
      if (selection.kind === "place") {
        return { ...state, panels, tab: "map", query: "" };
      }
      const centre = toNorm(selection.event.year);
      return {
        ...state,
        panels,
        view: clampView({ n0: centre - FOCUS_SPAN / 2, n1: centre + FOCUS_SPAN / 2 }),
        tab: "timeline",
        mode: "timeline",
        query: "",
      };
    }

    case "tab":
      // Re-picking the active tab is a no-op, so the open panel survives it.
      if (action.tab === state.tab) return state;
      // Nothing else is cleared: every tab keeps its own view, filters, search
      // and panel, so a round trip through another tab lands you back where you
      // were. The panel of the tab you are leaving is simply not on screen.
      return { ...state, tab: action.tab };

    case "mode":
      return action.mode === state.mode ? state : { ...state, mode: action.mode };

    case "query":
      return action.query === state.query ? state : { ...state, query: action.query };

    case "view":
      return { ...state, view: clampView(action.view) };

    case "mapView":
      return { ...state, mapView: action.view };

    case "toggleCategory": {
      const active = new Set(state.active);
      if (active.has(action.id)) active.delete(action.id);
      else active.add(action.id);
      return { ...state, active };
    }

    case "isolateCategory": {
      // Grafana-style isolate: show only this one, and repeat it to restore.
      const active =
        state.active.size === 1 && state.active.has(action.id)
          ? new Set(ALL_CATEGORIES)
          : new Set([action.id]);
      return { ...state, active };
    }

    case "toggleAllCategories": {
      const active =
        state.active.size === ALL_CATEGORIES.length
          ? new Set<CategoryId>()
          : new Set(ALL_CATEGORIES);
      return { ...state, active };
    }

    case "restore":
      return action.state;
  }
}

/**
 * Whether an action should add a history entry rather than overwrite the one we
 * are on.
 *
 * Two ideas decide it, and both are about what a visitor would expect Back to
 * undo. A **journey** — arriving on another tab, changing the filters, the first
 * panel a tab opens — is pushed, so Back undoes it one step at a time. **Looking
 * around** is not: zoom, pan and typing stream dozens of updates a second, and
 * changing which pin the map shows is the same kind of act. Replacing is what
 * keeps Back useful there: after wandering from pin to pin, one press has to
 * take you back to the timeline — not back through every point you looked at on
 * the way, one at a time.
 *
 * Deciding from the state as well as the action is what lets the first panel a
 * tab opens push, and every later one replace.
 */
export function isNavigating(action: Action, state: AppState): boolean {
  switch (action.type) {
    case "select":
      // Only the first panel this tab opens is a step worth undoing; Back
      // dismissing it is the whole reason to push it.
      return visiblePanel(state) === null;

    case "pick": {
      // A cross-link or a search result is a journey when it lands you on
      // another tab; picking again while already there is browsing.
      const tab = TAB_OF_KIND[action.selection.kind];
      return tab !== state.tab || state.panels[action.selection.kind] === null;
    }

    case "tab":
    case "mode":
    case "toggleCategory":
    case "isolateCategory":
    case "toggleAllCategories":
      return true;

    case "closePanel":
    case "query":
    case "view":
    case "mapView":
    case "restore":
      return false;
  }
}
