import { CATEGORY_BY_ID } from "../data/categories";
import { ANNUAL_EVENTS } from "../data/annual";
import type { AnnualEvent, CategoryId, Selection } from "../types";

interface Props {
  active: Set<CategoryId>;
  onSelect: (selection: Selection) => void;
  selectedId?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarView({ active, onSelect, selectedId }: Props) {
  const visible = ANNUAL_EVENTS.filter((e) => active.has(e.category));
  const movable = visible.filter((e) => e.movable);

  function renderEvent(event: AnnualEvent) {
    const cat = CATEGORY_BY_ID[event.category];
    return (
      <button
        key={event.id}
        type="button"
        className="annual"
        aria-pressed={selectedId === event.id}
        onClick={() => onSelect({ kind: "annual", event })}
      >
        <span className="annual__day" style={{ color: cat.color }}>
          {event.movable ? "—" : `${event.day} ${MONTHS[event.month - 1].slice(0, 3)}`}
        </span>
        <span>
          <span className="annual__title">{event.title}</span>
          <span className="annual__sub">{event.summary.split(".")[0]}.</span>
        </span>
      </button>
    );
  }

  return (
    <div className="calendar">
      <p className="calendar__intro">
        Some dates in the test come round every year rather than happening once.
        Here they are laid out across the year. Movable feasts such as Easter
        and Lent shift with the calendar and are shown separately.
      </p>

      <div className="calendar__grid">
        {MONTHS.map((name, index) => {
          const month = index + 1;
          const events = visible
            .filter((e) => !e.movable && e.month === month)
            .sort((a, b) => a.day - b.day);
          return (
            <section className="month" key={name} aria-label={name}>
              <h2 className="month__name">
                <span>{name}</span>
                {events.length > 0 && <span>{events.length}</span>}
              </h2>
              {events.length === 0 ? (
                <p className="month__empty">No fixed dates.</p>
              ) : (
                events.map(renderEvent)
              )}
            </section>
          );
        })}

        <section className="month month--movable" aria-label="Movable dates">
          <h2 className="month__name">
            <span>Movable dates</span>
          </h2>
          {movable.length === 0 ? (
            <p className="month__empty">No movable dates shown.</p>
          ) : (
            movable.map(renderEvent)
          )}
        </section>
      </div>
    </div>
  );
}
