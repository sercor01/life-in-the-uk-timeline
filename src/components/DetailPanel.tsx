import { CATEGORY_BY_ID, categoryColor, categoryInk, categoryTint } from "../data/categories";
import { resolveRefs } from "../data/exams";
import { formatAnnualDate } from "../lib/dates";
import { formatRange } from "../lib/lanes";
import type { Selection } from "../types";

interface Props {
  selection: Selection | null;
  onClose: () => void;
  /** Opens the Population tab; only used by population events. */
  onOpenPopulation?: () => void;
}

export function DetailPanel({ selection, onClose, onOpenPopulation }: Props) {
  if (!selection) {
    return (
      <aside className="detail detail--empty" aria-label="Event details">
        <div>
          <p className="detail__empty-emoji">🗓️</p>
          <h2>Pick a date</h2>
          <p>
            Select any marker on the timeline to read the full story, the exam
            reference and the questions it came from.
          </p>
        </div>
      </aside>
    );
  }

  const event = selection.event;
  const category = CATEGORY_BY_ID[event.category];
  const refs = resolveRefs(event.examRefs);
  const isEvent = selection.kind === "event";
  const source = isEvent ? selection.event.source : null;
  const isHandbookOnly = isEvent && refs.length === 0 && source === "handbook";

  const dateLine = isEvent
    ? formatRange(selection.event)
    : formatAnnualDate(
        selection.event.month,
        selection.event.day,
        selection.event.movable,
      );

  return (
    <aside className="detail" aria-label="Event details">
      <button type="button" className="detail__close" onClick={onClose} aria-label="Close">
        ✕
      </button>

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

      <h2>{event.title}</h2>
      <div className="detail__date">{dateLine}</div>
      <p className="detail__summary">{event.summary}</p>

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
    </aside>
  );
}
