export type CategoryId =
  | "prehistory"
  | "monarchy"
  | "war"
  | "rights"
  | "religion"
  | "science"
  | "arts"
  | "sport"
  | "landscape"
  | "population";

/** A dated happening placed on the historical timeline. */
export interface TimelineEvent {
  id: string;
  /** Start year. Negative numbers are BC, e.g. -55 for 55 BC. */
  year: number;
  /** Optional end year, turning the event into a range bar. */
  endYear?: number;
  /**
   * Human readable date override, used for things that are not a single year
   * (for example "6,000 years ago" or "18th century").
   */
  displayDate?: string;
  title: string;
  /**
   * Shorter label for the timeline marker, where horizontal room is tight.
   * Falls back to `title`; search and the detail panel still use the full
   * title, so the wording that makes an event findable is not lost.
   */
  markerLabel?: string;
  summary: string;
  category: CategoryId;
  /** 3 = always visible, 2 = medium, 1 = only when zoomed in. */
  importance: 1 | 2 | 3;
  source: "exam" | "handbook";
  /** Quiz questions this event was drawn from, if any. */
  examRefs?: ExamRef[];
}

/** An event that repeats every year and has no place on the historical line. */
export interface AnnualEvent {
  id: string;
  /** 1-12. Ignored when `movable` is true. */
  month: number;
  day: number;
  title: string;
  summary: string;
  category: CategoryId;
  /** Movable feasts such as Easter and Lent, which shift each year. */
  movable?: boolean;
  examRefs?: ExamRef[];
}

export interface ExamRef {
  set: number;
  id: number;
}

/**
 * The four parts of the UK, using the same ids as the population tab's nation
 * bar (`NATION_SHARES`) so colours and wording stay in one vocabulary.
 */
export type NationId = "england" | "scotland" | "wales" | "ni";

/**
 * A real place worth finding on the map. It has no year of its own — it is a
 * *where*, not a *when* — so it is separate from `TimelineEvent`. It links back
 * to the exam questions it came from and, optionally, to the historical event
 * at that place so the two views can point at each other.
 */
export interface Place {
  id: string;
  name: string;
  nation: NationId;
  /** Latitude in degrees, north positive. */
  lat: number;
  /** Longitude in degrees, east positive. */
  lon: number;
  category: CategoryId;
  /** Town, county or region shown as the "where" line, e.g. "Wiltshire". */
  area?: string;
  /**
   * Shorter label for the map pin, where space is tight. Falls back to `name`;
   * the detail panel and search always use the full name.
   */
  markerLabel?: string;
  summary: string;
  /** 3 = labelled at every zoom, 2 = medium, 1 = only when zoomed in. */
  importance: 1 | 2 | 3;
  source: "exam" | "handbook";
  examRefs?: ExamRef[];
  /** Id of the `TimelineEvent` at this place, for the "show on the timeline" link. */
  linkedEventId?: string;
}

export type Selection =
  | { kind: "event"; event: TimelineEvent }
  | { kind: "annual"; event: AnnualEvent }
  | { kind: "place"; place: Place };

export interface Category {
  id: CategoryId;
  label: string;
}

export interface ExamQuestion {
  id: number;
  question: string;
  reference: string;
  answers: { text: string; isCorrect: boolean }[];
}
