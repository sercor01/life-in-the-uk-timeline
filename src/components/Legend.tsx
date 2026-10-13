import { CATEGORIES, categoryColor } from "../data/categories";
import type { CategoryId } from "../types";

interface Props {
  active: Set<CategoryId>;
  onToggle: (id: CategoryId) => void;
  onAll: () => void;
}

export function Legend({ active, onToggle, onAll }: Props) {
  const allOn = active.size === CATEGORIES.length;
  return (
    <div className="legend" role="group" aria-label="Filter by category">
      <div className="legend__chips">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className="legend__item"
            aria-pressed={active.has(c.id)}
            onClick={() => onToggle(c.id)}
            title={`Show or hide ${c.label}`}
          >
            <span className="legend__swatch" style={{ background: categoryColor(c.id) }} />
            {c.label}
          </button>
        ))}
      </div>
      <button type="button" className="legend__all" onClick={onAll}>
        {allOn ? "Hide all" : "Show all"}
      </button>
    </div>
  );
}
