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
    <div className="timeline__controls">
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
