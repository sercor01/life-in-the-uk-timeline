import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { EVENTS } from "./data/events";
import { PLACES } from "./data/places";
import { useUrlState } from "./lib/useUrlState";
import { visiblePanel } from "./lib/appState";
import { CalendarView } from "./components/CalendarView";
import { DetailPanel } from "./components/DetailPanel";
import { EventListView } from "./components/EventListView";
import { Legend } from "./components/Legend";
import { PlaceList } from "./components/PlaceList";
import { PopulationView } from "./components/PopulationView";
import { SearchBar } from "./components/SearchBar";
import { Timeline } from "./components/Timeline";
import type {
  CategoryId,
  Place,
  Selection,
  Tab,
  TimelineEvent,
  TimelineMode,
} from "./types";
import type { ViewWindow } from "./lib/scale";
import type { MapView } from "./lib/mapScale";

/**
 * The map carries the whole UK coastline as committed data, so it is split into
 * its own chunk: the timeline's first paint should not pay for it.
 */
const MapView = lazy(() =>
  import("./components/MapView").then((m) => ({ default: m.MapView })),
);

const TABS: { id: Tab; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "calendar", label: "Annual dates" },
  { id: "map", label: "Map" },
  { id: "population", label: "Population" },
];

const MODES: { id: TimelineMode; label: string }[] = [
  { id: "timeline", label: "Graph" },
  { id: "list", label: "List" },
];

export default function App() {
  const [state, send] = useUrlState();
  const { tab, mode, view, mapView, query, active } = state;
  /** The panel the current tab is showing; each tab keeps its own (see `panels`). */
  const selection = visiblePanel(state);
  /**
   * The category under the pointer in the legend. Hover is a mouse affordance
   * with no meaning once the pointer is gone, so it stays local rather than
   * travelling in the URL with the rest of the state.
   */
  const [highlight, setHighlight] = useState<CategoryId | null>(null);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EVENTS.filter((e) => active.has(e.category)).filter((e) => {
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        (e.displayDate ?? "").toLowerCase().includes(q)
      );
    });
  }, [active, query]);

  /**
   * Places respect the legend categories and the search box, like the timeline.
   */
  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLACES.filter((p) => active.has(p.category)).filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        (p.area ?? "").toLowerCase().includes(q)
      );
    });
  }, [active, query]);

  /** Open (or replace) the panel this tab shows. */
  const select = useCallback(
    (next: Selection) => send({ type: "select", selection: next }),
    [send],
  );

  const selectEvent = useCallback(
    (event: TimelineEvent) => send({ type: "select", selection: { kind: "event", event } }),
    [send],
  );

  const selectPlace = useCallback(
    (place: Place) => send({ type: "select", selection: { kind: "place", place } }),
    [send],
  );

  /** A search result or a cross-link: jump to wherever it lives. */
  const pick = useCallback(
    (next: Selection) => send({ type: "pick", selection: next }),
    [send],
  );

  const focusEvent = useCallback(
    (event: TimelineEvent) => send({ type: "pick", selection: { kind: "event", event } }),
    [send],
  );

  const focusPlace = useCallback(
    (place: Place) => send({ type: "pick", selection: { kind: "place", place } }),
    [send],
  );

  /**
   * Switching tabs keeps everything: each tab owns its panel, so a round trip
   * lands you back on the event (or place, or date) you were reading. The panel
   * of the tab you left is simply not on screen while you are away.
   */
  const changeTab = useCallback((next: Tab) => send({ type: "tab", tab: next }), [send]);

  const setMode = useCallback(
    (next: TimelineMode) => send({ type: "mode", mode: next }),
    [send],
  );

  const setView = useCallback(
    (next: ViewWindow) => send({ type: "view", view: next }),
    [send],
  );

  const setMapView = useCallback(
    (next: MapView | null) => send({ type: "mapView", view: next }),
    [send],
  );

  const toggleCategory = useCallback(
    (id: CategoryId) => send({ type: "toggleCategory", id }),
    [send],
  );

  const isolateCategory = useCallback(
    (id: CategoryId) => send({ type: "isolateCategory", id }),
    [send],
  );

  const toggleAll = useCallback(() => send({ type: "toggleAllCategories" }), [send]);

  // Only emphasise a category that is actually shown: hovering a hidden chip
  // must not dim the whole timeline down to nothing.
  const litCategory = highlight !== null && active.has(highlight) ? highlight : null;

  const selectedId =
    selection?.kind === "place" ? selection.place.id : selection?.event.id;

  return (
    <div className={`app app--${tab}`}>
      <header className="app__header">
        <div className="brand">
          Life in the UK <small>dates to memorise</small>
        </div>

        {/*
          A plain group of buttons with aria-current, not a tablist: the panels
          are not real tabpanels and the ARIA tabs pattern would only be half
          implemented (no tabpanel, no roving tabindex, no arrow keys).
        */}
        <div className="tabs" role="group" aria-label="View">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={tab === t.id ? "true" : undefined}
              onClick={() => changeTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "timeline" && (
          <div className="mode-toggle" role="group" aria-label="Timeline display">
            {MODES.map((m) => (
              <button key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className="app__spacer" />

        <SearchBar
          active={active}
          query={query}
          onQueryChange={(value) => send({ type: "query", query: value })}
          onPick={pick}
        />
      </header>

      <main className="app__body">
        {tab === "timeline" &&
          (mode === "timeline" ? (
            <Timeline
              events={filteredEvents}
              view={view}
              onViewChange={setView}
              selectedId={selectedId}
              highlight={litCategory}
              onSelect={selectEvent}
            />
          ) : (
            <div className="stage">
              <EventListView
                events={filteredEvents}
                selectedId={selectedId}
                onSelect={selectEvent}
              />
            </div>
          ))}

        {tab === "calendar" && (
          <div className="stage">
            <CalendarView active={active} selectedId={selectedId} onSelect={select} />
          </div>
        )}

        {tab === "map" && (
          <div className="stage map-stage">
            <Suspense fallback={<p className="map-stage__loading">Loading the map…</p>}>
              <MapView
                places={filteredPlaces}
                view={mapView}
                onViewChange={setMapView}
                selectedId={selectedId}
                highlight={litCategory}
                onSelect={selectPlace}
              />
            </Suspense>
            <PlaceList
              places={filteredPlaces}
              selectedId={selectedId}
              onSelect={selectPlace}
            />
          </div>
        )}

        {tab === "population" && (
          <div className="stage">
            <PopulationView />
          </div>
        )}

        <DetailPanel
          selection={selection}
          onClose={() => send({ type: "closePanel" })}
          onOpenPopulation={() => send({ type: "tab", tab: "population" })}
          onOpenEvent={focusEvent}
          onOpenPlace={focusPlace}
        />
      </main>

      <Legend
        active={active}
        onToggle={toggleCategory}
        onIsolate={isolateCategory}
        onHighlight={setHighlight}
        onAll={toggleAll}
      />
    </div>
  );
}
