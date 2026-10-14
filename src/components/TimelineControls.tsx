interface Props {
  canZoomIn: boolean;
  canZoomOut: boolean;
  /** Zoom by a factor (>1 zooms in) around the centre of the view. */
  onZoom: (factor: number) => void;
  onReset: () => void;
}

/** The − / + / Reset buttons in the corner of the timeline. */
export function TimelineControls({ canZoomIn, canZoomOut, onZoom, onReset }: Props) {
  return (
    // Stop pointer-down from reaching the timeline container: it captures the
    // pointer for panning, which would retarget the button's click event and
    // swallow the zoom/reset presses.
    <div className="timeline__controls" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="tl-btn"
        aria-label="Zoom out"
        disabled={!canZoomOut}
        onClick={() => onZoom(1 / 1.5)}
      >
        −
      </button>
      <button
        type="button"
        className="tl-btn"
        aria-label="Zoom in"
        disabled={!canZoomIn}
        onClick={() => onZoom(1.5)}
      >
        +
      </button>
      <button type="button" className="tl-btn tl-btn--wide" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}
