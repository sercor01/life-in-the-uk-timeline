import { useEffect, useMemo, useRef, useState } from "react";
import { ANNUAL_EVENTS } from "../data/annual";
import { EVENTS } from "../data/events";
import { categoryColor } from "../data/categories";
import { MONTHS_SHORT } from "../lib/dates";
import { formatRange } from "../lib/lanes";
import type { CategoryId, Selection } from "../types";

interface Props {
  /** Only categories switched on in the legend are searchable, so a result can
   *  never point at an event the timeline is not showing (see `filteredEvents`). */
  active: Set<CategoryId>;
  onPick: (selection: Selection) => void;
  query: string;
  onQueryChange: (value: string) => void;
}

interface Match {
  id: string;
  label: string;
  meta: string;
  color: string;
  selection: Selection;
}

function buildIndex(active: Set<CategoryId>): Match[] {
  const matches: Match[] = [];
  for (const event of EVENTS) {
    if (!active.has(event.category)) continue;
    matches.push({
      id: `e-${event.id}`,
      label: event.title,
      meta: formatRange(event),
      color: categoryColor(event.category),
      selection: { kind: "event", event },
    });
  }
  for (const event of ANNUAL_EVENTS) {
    if (!active.has(event.category)) continue;
    matches.push({
      id: `a-${event.id}`,
      label: event.title,
      meta: event.movable
        ? "Each year (movable)"
        : `${event.day} ${MONTHS_SHORT[event.month - 1]} (every year)`,
      color: categoryColor(event.category),
      selection: { kind: "annual", event },
    });
  }
  return matches;
}

const RESULTS_ID = "search-results";
const optionId = (id: string) => `${RESULTS_ID}-${id}`;

export function SearchBar({ active, onPick, query, onQueryChange }: Props) {
  const [open, setOpen] = useState(false);
  /** Keyboard cursor into `results`; -1 means "no option highlighted". */
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const index = useMemo(() => buildIndex(active), [active]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return index
      .filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          m.meta.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [query, index]);

  const isOpen = open && query.trim().length >= 2;

  // Keep the highlighted option in view as the cursor moves.
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeIndex]);

  function choose(m: Match) {
    onPick(m.selection);
    onQueryChange("");
    setActiveIndex(-1);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!isOpen) return; // let the browser handle the rest while collapsed
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); // stop the caret jumping to the start/end of the input
      if (results.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) =>
        i < 0
          ? // From nothing: Down starts at the top, Up at the bottom.
            step > 0
            ? 0
            : results.length - 1
          : (i + step + results.length) % results.length,
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const m = results[activeIndex] ?? results[0];
      if (m) choose(m);
    }
  }

  return (
    <div className="search">
      <span className="search__icon" aria-hidden>
        ⌕
      </span>
      <input
        type="search"
        placeholder="Search dates and events…"
        value={query}
        aria-label="Search dates and events"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={RESULTS_ID}
        aria-autocomplete="list"
        aria-activedescendant={
          isOpen && activeIndex >= 0 && results[activeIndex]
            ? optionId(results[activeIndex].id)
            : undefined
        }
        onChange={(e) => {
          onQueryChange(e.target.value);
          setActiveIndex(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // Clicks on an option are kept from blurring the input by their
          // mousedown handler, so reaching here means focus really left.
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setOpen(false);
          setActiveIndex(-1);
        }}
        onKeyDown={onKeyDown}
      />

      {/* Always mounted so `aria-controls` points at a real element; `hidden`
          keeps it out of the a11y tree and out of the tab order while closed. */}
      <div className="search__pop" hidden={!isOpen}>
        {isOpen && results.length === 0 && (
          <p className="search__empty" role="status">
            No dates match “{query.trim()}”.
          </p>
        )}
        <ul
          className="search__results"
          id={RESULTS_ID}
          role="listbox"
          aria-label="Search results"
          ref={listRef}
        >
          {isOpen &&
            results.map((m, i) => (
              <li
                key={m.id}
                id={optionId(m.id)}
                role="option"
                aria-selected={i === activeIndex}
                className="search__item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(m)}
              >
                <span className="search__dot" style={{ background: m.color }} />
                <b>{m.label}</b>
                <span style={{ marginLeft: "auto" }}>{m.meta}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
