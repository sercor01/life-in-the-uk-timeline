export type CategoryId =
  | "prehistory"
  | "monarchy"
  | "war"
  | "rights"
  | "religion"
  | "science"
  | "arts"
  | "sport";

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

export type Selection =
  | { kind: "event"; event: TimelineEvent }
  | { kind: "annual"; event: AnnualEvent };

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

export interface ExamSet {
  [setId: string]: ExamQuestion[];
}
