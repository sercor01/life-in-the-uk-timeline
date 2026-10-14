import { CATEGORIES, categoryColor } from "../data/categories";
import type { CategoryId } from "../types";

interface Props {
  active: Set<CategoryId>;
  onToggle: (id: CategoryId) => void;
  /** Show only this category (Grafana-style isolate). */
  onIsolate: (id: CategoryId) => void;
  /** The category under the pointer, or null when there is none. */
  onHighlight: (id: CategoryId | null) => void;
  onAll: () => void;
}

export function Legend({ active, onToggle, onIsolate, onHighlight, onAll }: Props) {
  const allOn = active.size === CATEGORIES.length;
  return (
    <div className="legend" role="group" aria-label="Filter by category">
      <div className="legend__chips">
        {CATEGORIES.map((c) => {
          const on = active.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className="legend__item"
              data-category={c.id}
              aria-pressed={on}
              onClick={(e) =>
                e.metaKey || e.ctrlKey || e.shiftKey
                  ? onIsolate(c.id)
                  : onToggle(c.id)
              }
              // Hover emphasis is a mouse affordance. Checking pointerType keeps
              // a touch tap from leaving the timeline stuck in a dimmed state.
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") onHighlight(c.id);
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === "mouse") onHighlight(null);
              }}
              title={`${on ? "Hide" : "Show"} ${c.label} — Cmd/Ctrl-click to show only this`}
            >
              <span className="legend__swatch" style={{ background: categoryColor(c.id) }} />
              {c.label}
            </button>
          );
        })}
      </div>
      <button type="button" className="legend__all" onClick={onAll}>
        {allOn ? "Hide all" : "Show all"}
      </button>
    </div>
  );
}
