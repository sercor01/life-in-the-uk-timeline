import { useState } from "react";
import { CATEGORY_BY_ID, categoryColor, categoryInk, categoryTint } from "../data/categories";
import { EVENT_BY_ID } from "../data/events";
import { NATION_BY_ID, placesLinkedTo } from "../data/places";
import { resolveRefs } from "../data/exams";
import { formatAnnualDate } from "../lib/dates";
import { formatRange } from "../lib/lanes";
import type { Place, Selection, TimelineEvent } from "../types";

/**
 * Copy a link to this exact view.
 *
 * The address bar already carries the whole state (see `useUrlState`), so the
 * current `href` *is* the deep link — there is nothing to assemble here. The
 * outcome is announced through a `role="status"` rather than by renaming the
 * button, because a label change on a button is not reliably read out; the
 * button keeps its name and only the live region speaks.
 */
function CopyLink() {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("copied");
    } catch {
      // A refused permission, or a browser with no clipboard at all.
      setStatus("failed");
    }
  }

  return (
    <div className="detail__share">
      <button
        type="button"
        className="detail__share-button"
        // Keeps the visible "Copy link" inside the name, so the label still
        // matches what is on screen (WCAG 2.5.3) while saying *what* it links to.
        aria-label="Copy link to this view"
        onClick={copy}
      >
        <span aria-hidden>🔗</span> Copy link
      </button>
      <span className="detail__share-status" role="status">
        {status === "copied"
          ? "Link copied"
          : status === "failed"
            ? "Could not copy — use the address bar"
            : ""}
      </span>
    </div>
  );
}

interface Props {
  selection: Selection | null;
  onClose: () => void;
  /** Opens the Population tab; only used by population events. */
  onOpenPopulation?: () => void;
  /** Jumps to the timeline on an event; used by a place's cross-link. */
  onOpenEvent?: (event: TimelineEvent) => void;
  /** Jumps to the map on a place; used by an event's cross-link. */
  onOpenPlace?: (place: Place) => void;
}

export function DetailPanel({
  selection,
  onClose,
  onOpenPopulation,
  onOpenEvent,
  onOpenPlace,
}: Props) {
  if (!selection) {
    return (
      <aside className="detail detail--empty" aria-label="Details">
        <div>
          <p className="detail__empty-emoji">🗓️</p>
          <h2>Pick a date</h2>
          <p>
            Select any marker on the timeline or pin on the map to read the full
            story, the exam reference and the questions it came from.
          </p>
        </div>
      </aside>
    );
  }

  if (selection.kind === "place") {
    return (
      <PlaceDetail
        selection={selection}
        onClose={onClose}
        onOpenEvent={onOpenEvent}
      />
    );
  }

  const event = selection.event;
  const category = CATEGORY_BY_ID[event.category];
  const refs = resolveRefs(event.examRefs);
  const isEvent = selection.kind === "event";
  const source = isEvent ? selection.event.source : null;
  const isHandbookOnly = isEvent && refs.length === 0 && source === "handbook";
  const linkedPlaces = isEvent ? placesLinkedTo(selection.event.id) : [];

  const dateLine = isEvent
    ? formatRange(selection.event)
    : formatAnnualDate(
        selection.event.month,
        selection.event.day,
        selection.event.movable,
      );

  return (
    <aside className="detail" aria-label="Event details">
      <div className="detail__top">
        <span
          className="detail__eyebrow"
          style={{ background: categoryTint(category.id), color: categoryInk(category.id) }}
        >
          <span className="marker__dot" style={{ background: categoryColor(category.id) }} />
          {category.label}
          {source && (
            <span className="detail__eyebrow-tag">
              · {source === "exam" ? "from exam" : "handbook"}
            </span>
          )}
        </span>

        <button type="button" className="detail__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <h2>{event.title}</h2>
      <div className="detail__date">{dateLine}</div>
      <p className="detail__summary">{event.summary}</p>

      <CopyLink />

      {event.category === "population" && onOpenPopulation && (
        <div className="detail__section">
          <h3>See it in context</h3>
          <button type="button" className="detail__cta" onClick={onOpenPopulation}>
            Open the population chart →
          </button>
        </div>
      )}

      {refs.length > 0 && (
        <div className="detail__section">
          <h3>Exam reference</h3>
          {refs.map(({ ref, question }) => (
            <div className="ref-card" key={`${ref.set}-${ref.id}`}>
              <p className="ref-card__q">
                Set {ref.set} · Q{ref.id}: {question.question}
              </p>
              {question.reference.trim() && <p>{question.reference.trim()}</p>}
              {question.answers.some((a) => a.isCorrect) && (
                <div className="detail__links">
                  {question.answers
                    .filter((a) => a.isCorrect)
                    .map((a) => (
                      <span className="chip" key={a.text}>
                        ✓ {a.text}
                      </span>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isHandbookOnly && (
        <div className="detail__section">
          <h3>Source</h3>
          <p className="detail__note">
            This date is from the official handbook but does not appear in the
            question sets you provided, so there is no exam reference to show.
          </p>
        </div>
      )}

      {isEvent && onOpenPlace && linkedPlaces.length > 0 && (
        <div className="detail__section">
          <h3>See it on the map</h3>
          {linkedPlaces.map((place) => (
            <button
              key={place.id}
              type="button"
              className="detail__cta"
              onClick={() => onOpenPlace(place)}
            >
              Show {place.name} on the map →
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

/**
 * The map's detail view. It mirrors the event panel — same eyebrow chip, same
 * exam-reference cards — and adds the "where" line and a link back to the
 * timeline event at the place, so the two views point at each other.
 */
function PlaceDetail({
  selection,
  onClose,
  onOpenEvent,
}: {
  selection: Extract<Selection, { kind: "place" }>;
  onClose: () => void;
  onOpenEvent?: (event: TimelineEvent) => void;
}) {
  const place = selection.place;
  const category = CATEGORY_BY_ID[place.category];
  const refs = resolveRefs(place.examRefs);
  const linked = place.linkedEventId ? EVENT_BY_ID[place.linkedEventId] : undefined;

  return (
    <aside className="detail" aria-label="Place details">
      <div className="detail__top">
        <span
          className="detail__eyebrow"
          style={{ background: categoryTint(category.id), color: categoryInk(category.id) }}
        >
          <span className="marker__dot" style={{ background: categoryColor(category.id) }} />
          {category.label}
          <span className="detail__eyebrow-tag">
            · {place.source === "exam" ? "from exam" : "handbook"}
          </span>
        </span>

        <button type="button" className="detail__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <h2>{place.name}</h2>
      <div className="detail__date">{place.area ?? NATION_BY_ID[place.nation]}</div>
      <p className="detail__summary">{place.summary}</p>

      <CopyLink />

      {linked && onOpenEvent && (
        <div className="detail__section">
          <h3>See it in context</h3>
          <button type="button" className="detail__cta" onClick={() => onOpenEvent(linked)}>
            Show {linked.title} on the timeline →
          </button>
        </div>
      )}

      {refs.length > 0 && (
        <div className="detail__section">
          <h3>Exam reference</h3>
          {refs.map(({ ref, question }) => (
            <div className="ref-card" key={`${ref.set}-${ref.id}`}>
              <p className="ref-card__q">
                Set {ref.set} · Q{ref.id}: {question.question}
              </p>
              {question.reference.trim() && <p>{question.reference.trim()}</p>}
              {question.answers.some((a) => a.isCorrect) && (
                <div className="detail__links">
                  {question.answers
                    .filter((a) => a.isCorrect)
                    .map((a) => (
                      <span className="chip" key={a.text}>
                        ✓ {a.text}
                      </span>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {place.source === "handbook" && refs.length === 0 && (
        <div className="detail__section">
          <h3>Source</h3>
          <p className="detail__note">
            This place is from the official handbook but does not appear in the
            question sets you provided, so there is no exam reference to show.
          </p>
        </div>
      )}
    </aside>
  );
}
