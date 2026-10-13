import { useRef } from "react";
import { categoryColor } from "../data/categories";
import type { TimelineEvent } from "../types";
import { clampView, toNorm, type ViewWindow } from "../lib/scale";

interface Props {
  events: TimelineEvent[];
  view: ViewWindow;
  onChange: (view: ViewWindow) => void;
}

export function Overview({ events, view, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; n0: number; span: number } | null>(null);

  function trackWidth(): number {
    return trackRef.current?.getBoundingClientRect().width ?? 1;
  }

  function onPointerDown(e: React.PointerEvent) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rel = (e.clientX - rect.left) / rect.width;
    const span = view.n1 - view.n0;
    // Clicking the track recentres the window; dragging moves it.
    drag.current = { startX: e.clientX, n0: view.n0, span };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (rel < view.n0 || rel > view.n1) {
      onChange(clampView({ n0: rel - span / 2, n1: rel + span / 2 }));
      drag.current = { startX: e.clientX, n0: rel - span / 2, span };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const width = trackWidth();
    const dn = (e.clientX - drag.current.startX) / width; // full axis = span 1
    onChange(clampView({ n0: drag.current.n0 + dn, n1: drag.current.n0 + dn + drag.current.span }));
  }

  function endDrag() {
    drag.current = null;
  }

  const windowLeft = view.n0 * 100;
  const windowWidth = (view.n1 - view.n0) * 100;

  return (
    <div className="overview">
      <div
        className="overview__track"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="overview__ticks">
          {events.map((event) => (
            <span
              key={event.id}
              className="overview__tick"
              style={{
                left: `${toNorm(event.year) * 100}%`,
                background: categoryColor(event.category),
                opacity: event.importance === 3 ? 1 : event.importance === 2 ? 0.85 : 0.7,
                top: event.importance === 3 ? 4 : 8,
                height: event.importance === 3 ? 18 : 10,
              }}
            />
          ))}
        </div>
        <div
          className="overview__window"
          style={{ left: `${windowLeft}%`, width: `${windowWidth}%` }}
        />
      </div>
    </div>
  );
}
