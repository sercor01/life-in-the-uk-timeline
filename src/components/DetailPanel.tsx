import { CATEGORY_BY_ID } from "../data/categories";
import { resolveRefs } from "../data/exams";
import { formatRange } from "../lib/lanes";
import type { Selection } from "../types";

interface Props {
  selection: Selection | null;
  onClose: () => void;
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

function ordinal(n: number): string {
  if (n % 10 === 1 && n !== 11) return `${n}st`;
  if (n % 10 === 2 && n !== 12) return `${n}nd`;
  if (n % 10 === 3 && n !== 13) return `${n}rd`;
  return `${n}th`;
}

export function DetailPanel({ selection, onClose }: Props) {
  if (!selection) {
    return (
      <aside className="detail detail--empty" aria-label="Event details">
        <div>
          <p style={{ fontSize: 34, margin: 0 }}>🗓️</p>
          <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>Pick a date</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
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

  const dateLine =
    selection.kind === "event"
      ? formatRange(selection.event)
      : selection.event.movable
        ? "Movable feast · changes each year"
        : `${ordinal(selection.event.day)} ${MONTHS[selection.event.month - 1]} · every year`;

  return (
    <aside className="detail" aria-label="Event details">
      <button type="button" className="detail__close" onClick={onClose} aria-label="Close">
        ✕
      </button>

      <span
        className="detail__eyebrow"
        style={{ background: category.tint, color: category.color }}
      >
        <span className="marker__dot" style={{ background: category.color }} />
        {category.label}
        {selection.kind === "event" && (
          <span style={{ opacity: 0.75 }}>
            · {selection.event.source === "exam" ? "from exam" : "handbook"}
          </span>
        )}
      </span>

      <h2>{event.title}</h2>
      <div className="detail__date">{dateLine}</div>
      <p className="detail__summary">{event.summary}</p>

      {refs.length > 0 && (
        <div className="detail__section">
          <h3>Exam reference</h3>
          {refs.map(({ ref, question }) => (
            <div className="ref-card" key={`${ref.set}-${ref.id}`}>
              <p className="ref-card__q">
                Set {ref.set} · Q{ref.id}: {question.question}
              </p>
              {question.reference.trim() && <p>{question.reference.trim()}</p>}
              <div className="detail__links" style={{ marginTop: 8 }}>
                {question.answers
                  .filter((a) => a.isCorrect)
                  .map((a) => (
                    <span className="chip" key={a.text}>
                      ✓ {a.text}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {refs.length === 0 && selection.kind === "event" && selection.event.source === "handbook" && (
        <div className="detail__section">
          <h3>Source</h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--muted)", margin: 0 }}>
            This date is from the official handbook but does not appear in the
            question sets you provided, so there is no exam reference to show.
          </p>
        </div>
      )}
    </aside>
  );
}
