import { CATEGORY_BY_ID } from "../data/categories";
import { formatRange } from "../lib/lanes";
import type { TimelineEvent } from "../types";

interface Props {
  events: TimelineEvent[];
  selectedId?: string;
  onSelect: (event: TimelineEvent) => void;
}

const ERAS: { label: string; from: number; to: number }[] = [
  { label: "Prehistory & Roman Britain", from: -Infinity, to: 410 },
  { label: "Medieval England", from: 411, to: 1485 },
  { label: "Tudors & Stuarts", from: 1486, to: 1700 },
  { label: "Georgian & Victorian", from: 1701, to: 1901 },
  { label: "20th century to today", from: 1902, to: Infinity },
];

export function EventListView({ events, selectedId, onSelect }: Props) {
  const sorted = [...events].sort((a, b) => a.year - b.year);

  return (
    <div className="list">
      {ERAS.map((era) => {
        const inEra = sorted.filter((e) => e.year >= era.from && e.year <= era.to);
        if (inEra.length === 0) return null;
        return (
          <section className="list__group" key={era.label}>
            <h2 className="list__year">{era.label}</h2>
            {inEra.map((event) => {
              const cat = CATEGORY_BY_ID[event.category];
              return (
                <button
                  key={event.id}
                  type="button"
                  className="card"
                  aria-pressed={selectedId === event.id}
                  onClick={() => onSelect(event)}
                  style={
                    selectedId === event.id
                      ? { borderColor: "var(--accent)" }
                      : undefined
                  }
                >
                  <span className="card__bar" style={{ background: cat.color }} />
                  <span className="card__body">
                    <span className="card__meta">{formatRange(event)}</span>
                    <span className="card__title">{event.title}</span>
                    <span className="card__desc">{event.summary}</span>
                  </span>
                </button>
              );
            })}
          </section>
        );
      })}
      {sorted.length === 0 && (
        <p style={{ color: "var(--muted)", padding: "20px 4px" }}>
          No events match the current filters.
        </p>
      )}
    </div>
  );
}
