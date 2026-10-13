import { useEffect, useRef, useState } from "react";
import { POPULATION, type PopulationPoint } from "../data/population";

/** Top of the y-axis, in millions. Chosen so 67m sits below the top edge. */
const Y_MAX = 70;
const PAD = { top: 26, right: 18, bottom: 30, left: 46 };
/** Years the handbook gives as a round number, labelled on the curve. */
const ANCHORS = new Set([1801, 1851, 1901, 1951]);
const GRID = [20, 40, 60];
const YEAR_TICKS = [1600, 1700, 1800, 1900, 2000];

interface Props {
  points?: PopulationPoint[];
}

/**
 * Area chart of the handbook's population table. It is decorative: the
 * milestone list in `PopulationView` carries the same numbers in text, so the
 * SVG is hidden from assistive tech.
 */
export function PopulationChart({ points = POPULATION }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  if (width <= 0) return <div className="pop-chart" ref={hostRef} />;

  const height = Math.max(190, Math.min(320, Math.round(width * 0.4)));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = Math.max(0, height - PAD.top - PAD.bottom);

  const years = points.map((p) => p.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const xOf = (year: number) =>
    PAD.left + ((year - minYear) / (maxYear - minYear)) * plotW;
  const yOf = (millions: number) => PAD.top + plotH - (millions / Y_MAX) * plotH;

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.year).toFixed(1)},${yOf(p.millions).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xOf(maxYear).toFixed(1)},${yOf(0).toFixed(1)} L${xOf(minYear).toFixed(1)},${yOf(0).toFixed(1)} Z`;

  return (
    <div className="pop-chart" ref={hostRef}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="pop-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pop-fill-top)" />
            <stop offset="100%" stopColor="var(--pop-fill-bottom)" />
          </linearGradient>
        </defs>

        {GRID.map((m) => (
          <g key={m}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={yOf(m)}
              y2={yOf(m)}
              stroke="var(--axis)"
              strokeWidth={1}
              strokeDasharray="2 5"
            />
            <text x={PAD.left - 8} y={yOf(m) + 4} textAnchor="end" className="pop-chart__ytick">
              {m}m
            </text>
          </g>
        ))}

        <line
          x1={PAD.left}
          x2={width - PAD.right}
          y1={yOf(0)}
          y2={yOf(0)}
          stroke="var(--axis)"
          strokeWidth={1.5}
        />

        <path d={area} fill="url(#pop-area)" />
        <path
          d={line}
          fill="none"
          stroke="var(--pop-line)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p) => (
          <circle
            key={p.year}
            className="pop-chart__dot"
            cx={xOf(p.year)}
            cy={yOf(p.millions)}
            r={ANCHORS.has(p.year) ? 5 : 3.5}
            fill="var(--pop-line)"
            stroke="var(--panel)"
            strokeWidth={2}
          />
        ))}

        {points
          .filter((p) => ANCHORS.has(p.year))
          .map((p) => (
            <text
              key={`label-${p.year}`}
              x={xOf(p.year)}
              y={yOf(p.millions) - 12}
              textAnchor="middle"
              className="pop-chart__anchor"
            >
              {p.millions}m
            </text>
          ))}

        {YEAR_TICKS.map((year) => (
          <text
            key={year}
            x={xOf(year)}
            y={yOf(0) + 18}
            textAnchor="middle"
            className="pop-chart__xtick"
          >
            {year}
          </text>
        ))}
      </svg>
    </div>
  );
}
