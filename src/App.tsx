import { useCallback, useMemo, useState } from "react";
import { CATEGORIES } from "./data/categories";
import { EVENTS } from "./data/events";
import { MIN_SPAN, FULL_VIEW, clampView, toNorm, type ViewWindow } from "./lib/scale";
import { CalendarView } from "./components/CalendarView";
import { DetailPanel } from "./components/DetailPanel";
import { EventListView } from "./components/EventListView";
import { Legend } from "./components/Legend";
import { PopulationView } from "./components/PopulationView";
import { SearchBar } from "./components/SearchBar";
import { Timeline } from "./components/Timeline";
import type { CategoryId, Selection, TimelineEvent } from "./types";

type Tab = "timeline" | "calendar" | "population";
type TimelineMode = "timeline" | "list";

const FOCUS_SPAN = Math.max(MIN_SPAN * 5, 0.05);

const TABS: { id: Tab; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "calendar", label: "Annual dates" },
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

  /** Jump the timeline to an event and open its detail panel. */
  const focusEvent = useCallback((event: TimelineEvent) => {
    const centre = toNorm(event.year);
    setView(clampView({ n0: centre - FOCUS_SPAN / 2, n1: centre + FOCUS_SPAN / 2 }));
    setSelected({ kind: "event", event });
    setTab("timeline");
    setMode("timeline");
  }, []);

  const handlePick = useCallback(
    (selection: Selection) => {
      if (selection.kind === "annual") {
        setSelected(selection);
        setTab("calendar");
      } else {
        focusEvent(selection.event);
      }
    },
    [focusEvent],
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

  const selectedId = selected?.event.id;

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          Life in the UK <small>dates to memorise</small>
        </div>

        <div className="tabs" role="tablist" aria-label="View">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
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

        <SearchBar query={query} onQueryChange={setQuery} onPick={handlePick} />
      </header>

      <main className="app__body">
        {tab === "timeline" &&
          (mode === "timeline" ? (
            <Timeline
              events={filteredEvents}
              view={view}
              onViewChange={setView}
              selectedId={selectedId}
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
        />
      </main>

      <Legend active={active} onToggle={toggleCategory} onAll={toggleAll} />
    </div>
  );
}
