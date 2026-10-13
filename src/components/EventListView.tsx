import { categoryColor } from "../data/categories";
import { ERAS, eraOf } from "../data/eras";
import { formatRange } from "../lib/lanes";
import type { TimelineEvent } from "../types";

interface Props {
  events: TimelineEvent[];
  selectedId?: string;
  onSelect: (event: TimelineEvent) => void;
}

export function EventListView({ events, selectedId, onSelect }: Props) {
  const sorted = [...events].sort((a, b) => a.year - b.year);

  return (
    <div className="list">
      {ERAS.map((era) => {
        const inEra = sorted.filter((e) => eraOf(e.year) === era);
        if (inEra.length === 0) return null;
        return (
          <section className="list__group" key={era.label}>
            <h2 className="list__year">{era.label}</h2>
            {inEra.map((event) => {
              return (
                <button
                  key={event.id}
                  type="button"
                  className="card"
                  aria-pressed={selectedId === event.id}
                  onClick={() => onSelect(event)}
                >
                  <span className="card__bar" style={{ background: categoryColor(event.category) }} />
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
        <p className="list__empty">No events match the current filters.</p>
      )}
    </div>
  );
}
