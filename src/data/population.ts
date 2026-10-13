/**
 * The handbook's "Population growth in the UK" table, from the chapter
 * "A modern, thriving society" (section: Population).
 *
 * Source: 'Life in the United Kingdom: A Guide for New Residents'
 * (Crown Copyright); the table itself is credited to National Statistics.
 *
 * The handbook gives the figures in words — "Just over 4 million",
 * "Just under 60 million" — so `label` reproduces that wording verbatim and is
 * what the app displays. `millions` is an approximation used *only* to place a
 * point on the chart; it is never shown on its own.
 */
export interface PopulationPoint {
  year: number;
  /** Handbook wording, shown verbatim. */
  label: string;
  /** Approximate population in millions, for plotting only. */
  millions: number;
  /** A short hook to help you remember where the point sits. */
  note?: string;
  /**
   * Importance if the figure also appears as an event on the main timeline.
   * 3 = always visible, 2 = medium zoom, 1 = only when zoomed in. The tight
   * 1998–2021 cluster sits at 1 so it does not crowd the default view.
   */
  importance: 1 | 2 | 3;
}

/**
 * Top of the population chart's y-axis and the length its milestone bars are
 * measured against, in millions. Chosen so the largest figure sits below the
 * top edge with a little headroom.
 */
export const POPULATION_MAX_MILLIONS = 70;

export const POPULATION: PopulationPoint[] = [
  { year: 1600, label: "Just over 4 million", millions: 4.1, importance: 1 },
  {
    year: 1700,
    label: "5 million",
    millions: 5,
    note: "Barely moved in a century.",
    importance: 1,
  },
  {
    year: 1801,
    label: "8 million",
    millions: 8,
    note: "The first census was taken.",
    importance: 2,
  },
  {
    year: 1851,
    label: "20 million",
    millions: 20,
    note: "More than doubled since 1801.",
    importance: 2,
  },
  {
    year: 1901,
    label: "40 million",
    millions: 40,
    note: "Doubled again in 50 years.",
    importance: 2,
  },
  {
    year: 1951,
    label: "50 million",
    millions: 50,
    note: "Growth slowed after the Victorian boom.",
    importance: 2,
  },
  { year: 1998, label: "57 million", millions: 57, importance: 1 },
  { year: 2005, label: "Just under 60 million", millions: 59.9, importance: 1 },
  { year: 2010, label: "Just over 62 million", millions: 62.1, importance: 1 },
  { year: 2017, label: "Just over 66 million", millions: 66.1, importance: 1 },
  {
    year: 2021,
    label: "Just over 67 million",
    millions: 67.1,
    note: "Migration and longer life expectancy have played a part.",
    importance: 3,
  },
];

/** A step between two handbook years, phrased the way it is easiest to recall. */
export interface PopulationGrowth {
  from: number;
  to: number;
  text: string;
}

export const POPULATION_GROWTH: PopulationGrowth[] = [
  { from: 1801, to: 1851, text: "More than doubled in 50 years." },
  { from: 1851, to: 1901, text: "Doubled again in 50 years." },
  { from: 1901, to: 1951, text: "A slower rise as the boom eased." },
  { from: 1951, to: 2021, text: "A steady climb to over 67 million." },
];

/**
 * How the population is spread across the four nations. The handbook gives
 * these as words ("England more or less consistently makes up 84% of the total
 * population, Wales around 5%, Scotland just over 8%, and Northern Ireland less
 * than 3%"), so `label` is the wording and `share` only sizes the bar.
 */
export interface NationShare {
  id: "england" | "scotland" | "wales" | "ni";
  name: string;
  /** Handbook wording. */
  label: string;
  /** Approximate percentage, for the bar only. */
  share: number;
}

export const NATION_SHARES: NationShare[] = [
  { id: "england", name: "England", label: "More or less 84%", share: 84 },
  { id: "scotland", name: "Scotland", label: "Just over 8%", share: 8.2 },
  { id: "wales", name: "Wales", label: "Around 5%", share: 5 },
  { id: "ni", name: "Northern Ireland", label: "Less than 3%", share: 2.8 },
];
