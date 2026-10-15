import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { CATEGORIES } from "./data/categories";
import { EVENTS } from "./data/events";
import { PLACES } from "./data/places";
import { MIN_SPAN, FULL_VIEW, clampView, toNorm, type ViewWindow } from "./lib/scale";
import { CalendarView } from "./components/CalendarView";
import { DetailPanel } from "./components/DetailPanel";
import { EventListView } from "./components/EventListView";
import { Legend } from "./components/Legend";
import { PlaceList } from "./components/PlaceList";
import { PopulationView } from "./components/PopulationView";
import { SearchBar } from "./components/SearchBar";
import { Timeline } from "./components/Timeline";
import type { CategoryId, Place, Selection, TimelineEvent } from "./types";

/**
 * The map carries the whole UK coastline as committed data, so it is split into
 * its own chunk: the timeline's first paint should not pay for it.
 */
const MapView = lazy(() =>
  import("./components/MapView").then((m) => ({ default: m.MapView })),
);

type Tab = "timeline" | "calendar" | "map" | "population";
type TimelineMode = "timeline" | "list";

const FOCUS_SPAN = Math.max(MIN_SPAN * 5, 0.05);

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
  const [tab, setTab] = useState<Tab>("timeline");
  const [mode, setMode] = useState<TimelineMode>("timeline");
  const [view, setView] = useState<ViewWindow>(FULL_VIEW);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Set<CategoryId>>(
    () => new Set(CATEGORIES.map((c) => c.id)),
  );
  /** Category under the pointer in the legend, emphasised on the timeline. */
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

  const selectEvent = useCallback((event: TimelineEvent) => {
    setSelected({ kind: "event", event });
  }, []);

  const selectPlace = useCallback((place: Place) => {
    setSelected({ kind: "place", place });
  }, []);

  /** Jump to the map on a place and open its panel. */
  const focusPlace = useCallback((place: Place) => {
    setSelected({ kind: "place", place });
    setTab("map");
    // As in `focusEvent`: a stale search filter would hide the place's
    // neighbours, and the map is where the context matters most.
    setQuery("");
  }, []);

  /** Places respect the legend categories and the search box, like the timeline. */
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

  /** Jump the timeline to an event and open its detail panel. */
  const focusEvent = useCallback((event: TimelineEvent) => {
    const centre = toNorm(event.year);
    setView(clampView({ n0: centre - FOCUS_SPAN / 2, n1: centre + FOCUS_SPAN / 2 }));
    setSelected({ kind: "event", event });
    setTab("timeline");
    setMode("timeline");
    /*
     * Drop any search text. The box doubles as a live filter, so arriving from
     * a cross-link with "Hadrian" still in it would leave the whole view
     * showing one marker, with nothing on screen to explain why — and Reset
     * only resets the zoom, so it would look stuck.
     */
    setQuery("");
  }, []);

  const handlePick = useCallback(
    (selection: Selection) => {
      if (selection.kind === "annual") {
        setSelected(selection);
        setTab("calendar");
      } else if (selection.kind === "place") {
        setSelected(selection);
        setTab("map");
      } else {
        focusEvent(selection.event);
      }
    },
    [focusEvent],
  );

  /**
   * Switching tabs dismisses the detail panel: a selection belongs to the view
   * it was made in, so carrying it into another tab would leave a stale panel
   * open. Re-picking the active tab is a no-op and keeps the panel open.
   */
  const changeTab = useCallback(
    (next: Tab) => {
      if (next === tab) return;
      setSelected(null);
      setTab(next);
    },
    [tab],
  );

  const toggleCategory = useCallback((id: CategoryId) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setActive((prev) =>
      prev.size === CATEGORIES.length ? new Set() : new Set(CATEGORIES.map((c) => c.id)),
    );
  }, []);

  /**
   * Grafana-style isolate: show only this category. Repeating it while this is
   * already the only one on restores everything, so the gesture toggles.
   */
  const isolateCategory = useCallback((id: CategoryId) => {
    setActive((prev) =>
      prev.size === 1 && prev.has(id)
        ? new Set(CATEGORIES.map((c) => c.id))
        : new Set([id]),
    );
  }, []);

  // Only emphasise a category that is actually shown: hovering a hidden chip
  // must not dim the whole timeline down to nothing.
  const litCategory = highlight !== null && active.has(highlight) ? highlight : null;

  const selectedId =
    selected?.kind === "place" ? selected.place.id : selected?.event.id;

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
          onQueryChange={setQuery}
          onPick={handlePick}
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
            <CalendarView
              active={active}
              selectedId={selectedId}
              onSelect={setSelected}
            />
          </div>
        )}

        {tab === "map" && (
          <div className="stage map-stage">
            <Suspense fallback={<p className="map-stage__loading">Loading the map…</p>}>
              <MapView
                places={filteredPlaces}
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
          selection={selected}
          onClose={() => setSelected(null)}
          onOpenPopulation={() => {
            setSelected(null);
            setTab("population");
          }}
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
