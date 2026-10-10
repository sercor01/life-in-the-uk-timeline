import { useMemo, useRef, useState } from "react";
import { ANNUAL_EVENTS } from "../data/annual";
import { EVENTS } from "../data/events";
import { CATEGORY_BY_ID } from "../data/categories";
import { formatRange } from "../lib/lanes";
import type { Selection } from "../types";

interface Props {
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

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function buildIndex(): Match[] {
  const matches: Match[] = [];
  for (const event of EVENTS) {
    matches.push({
      id: `e-${event.id}`,
      label: event.title,
      meta: formatRange(event),
      color: CATEGORY_BY_ID[event.category].color,
      selection: { kind: "event", event },
    });
  }
  for (const event of ANNUAL_EVENTS) {
    matches.push({
      id: `a-${event.id}`,
      label: event.title,
      meta: event.movable
        ? "Each year (movable)"
        : `${event.day} ${MONTHS[event.month - 1]} (every year)`,
      color: CATEGORY_BY_ID[event.category].color,
      selection: { kind: "annual", event },
    });
  }
  return matches;
}

export function SearchBar({ onPick, query, onQueryChange }: Props) {
  const [open, setOpen] = useState(false);
  const index = useMemo(buildIndex, []);
  const boxRef = useRef<HTMLDivElement>(null);

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

  function pick(m: Match) {
    onPick(m.selection);
    onQueryChange("");
    setOpen(false);
  }

  return (
    <div className="search" ref={boxRef}>
      <span className="search__icon" aria-hidden>
        ⌕
      </span>
      <input
        type="search"
        placeholder="Search dates and events…"
        value={query}
        aria-label="Search dates and events"
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) pick(results[0]);
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && query.trim().length >= 2 && (
        <div className="search__results" role="listbox">
          {results.length === 0 && (
            <div className="search__empty">No dates match “{query.trim()}”.</div>
          )}
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              className="search__item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(m)}
            >
              <span className="search__dot" style={{ background: m.color }} />
              <b>{m.label}</b>
              <span style={{ marginLeft: "auto" }}>{m.meta}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
