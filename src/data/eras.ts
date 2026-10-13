/**
 * The historical eras, shared by the timeline's background bands and the list
 * view's headings so the two never drift apart. The tint *values* are CSS
 * custom properties (`--era-<id>`) defined per theme in `index.css`, matching
 * the category colours.
 */
export interface Era {
  /** First year in the era (inclusive). */
  from: number;
  /** First year after the era (exclusive). */
  to: number;
  /** Shown on the timeline band and as the list heading. */
  label: string;
  tint: string;
}

export const ERAS: Era[] = [
  { from: -Infinity, to: 43, label: "Prehistory", tint: "var(--era-prehistory)" },
  { from: 43, to: 410, label: "Roman Britain", tint: "var(--era-roman)" },
  { from: 410, to: 1066, label: "Anglo-Saxons", tint: "var(--era-anglo)" },
  { from: 1066, to: 1485, label: "Medieval", tint: "var(--era-medieval)" },
  { from: 1485, to: 1714, label: "Tudors & Stuarts", tint: "var(--era-tudor)" },
  { from: 1714, to: 1837, label: "Georgian", tint: "var(--era-georgian)" },
  { from: 1837, to: 1901, label: "Victorian", tint: "var(--era-victorian)" },
  { from: 1901, to: Infinity, label: "Modern", tint: "var(--era-modern)" },
];

/** The era a year falls into. `from` is inclusive and `to` exclusive. */
export function eraOf(year: number): Era {
  return ERAS.find((era) => year >= era.from && year < era.to) ?? ERAS[ERAS.length - 1];
}
