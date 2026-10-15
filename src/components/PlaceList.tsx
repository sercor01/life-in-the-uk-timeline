import { NATIONS, PLACES } from "../data/places";
import { CATEGORY_BY_ID, categoryColor, categoryInk, categoryTint } from "../data/categories";
import type { Place } from "../types";

interface Props {
  places: Place[];
  selectedId?: string;
  onSelect: (place: Place) => void;
}

/**
 * Every place as a list, grouped by nation.
 *
 * The map is not the only way in: this list is the keyboard- and
 * screen-reader-friendly route to the same places (and the easiest thing to
 * use on a phone), the same way `EventListView` backs up the timeline.
 */
export function PlaceList({ places, selectedId, onSelect }: Props) {
  const grouped = NATIONS.map((nation) => ({
    nation,
    places: places.filter((p) => p.nation === nation.id),
  })).filter((group) => group.places.length > 0);

  return (
    <section className="map-list" aria-labelledby="map-list-title">
      <h2 className="map-list__title" id="map-list-title">
        Places
        <span className="map-list__count">
          {places.length === PLACES.length
            ? `${PLACES.length} places`
            : `${places.length} of ${PLACES.length} shown`}
        </span>
      </h2>

      {grouped.length === 0 && (
        <p className="map-list__empty">No places match the current filters.</p>
      )}

      <div className="map-list__groups">
        {grouped.map(({ nation, places: rows }) => (
          <section className="map-list__group" key={nation.id}>
            <h3 className="map-list__nation">{nation.label}</h3>
            <ul className="map-list__items">
              {rows.map((place) => {
                const category = CATEGORY_BY_ID[place.category];
                return (
                  <li key={place.id}>
                    <button
                      type="button"
                      className="place-card"
                      aria-pressed={selectedId === place.id}
                      onClick={() => onSelect(place)}
                    >
                      <span
                        className="place-card__bar"
                        style={{ background: categoryColor(category.id) }}
                      />
                      <span className="place-card__body">
                        <span className="place-card__meta">
                          {place.area ?? nation.label}
                          {place.source === "handbook" && (
                            <span className="place-card__badge">handbook</span>
                          )}
                        </span>
                        <span className="place-card__title">{place.name}</span>
                        <span className="place-card__desc">{place.summary}</span>
                        <span
                          className="place-card__chip"
                          style={{
                            background: categoryTint(category.id),
                            color: categoryInk(category.id),
                          }}
                        >
                          {category.label}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
