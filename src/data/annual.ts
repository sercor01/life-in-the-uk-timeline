import type { AnnualEvent } from "../types";

/**
 * Dates that come round every year. These do not sit on the historical
 * timeline because they have no single position in history.
 */
export const ANNUAL_EVENTS: AnnualEvent[] = [
  {
    id: "ann-st-david",
    month: 3,
    day: 1,
    title: "St David's Day",
    summary: "The patron saint's day of Wales, celebrated on 1 March.",
    category: "religion",
    examRefs: [
      { set: 1, id: 5 },
      { set: 8, id: 5 },
    ],
  },
  {
    id: "ann-st-patrick",
    month: 3,
    day: 17,
    title: "St Patrick's Day",
    summary:
      "The patron saint's day of Northern Ireland, celebrated on 17 March. It is a public holiday in Northern Ireland.",
    category: "religion",
    examRefs: [
      { set: 1, id: 5 },
      { set: 5, id: 13 },
      { set: 14, id: 1 },
    ],
  },
  {
    id: "ann-april-fool",
    month: 4,
    day: 1,
    title: "April Fool's Day",
    summary:
      "On 1 April people play jokes on each other until midday. Television and newspapers often carry April Fool stories.",
    category: "arts",
    examRefs: [
      { set: 5, id: 9 },
      { set: 12, id: 13 },
    ],
  },
  {
    id: "ann-st-george",
    month: 4,
    day: 23,
    title: "St George's Day",
    summary: "The patron saint's day of England, celebrated on 23 April.",
    category: "religion",
    examRefs: [
      { set: 1, id: 5 },
      { set: 13, id: 1 },
    ],
  },
  {
    id: "ann-halloween",
    month: 10,
    day: 31,
    title: "Halloween",
    summary: "Celebrated on 31 October, Halloween has its roots in older festivals.",
    category: "arts",
    examRefs: [{ set: 7, id: 2 }],
  },
  {
    id: "ann-remembrance",
    month: 11,
    day: 11,
    title: "Remembrance Day",
    summary:
      "The annual Remembrance Day service at the Cenotaph in Whitehall is attended by the monarch, politicians and foreign ambassadors. It commemorates those who died in war.",
    category: "war",
    examRefs: [{ set: 1, id: 8 }],
  },
  {
    id: "ann-st-andrew",
    month: 11,
    day: 30,
    title: "St Andrew's Day",
    summary:
      "The patron saint's day of Scotland, celebrated on 30 November. In Scotland it is an official holiday.",
    category: "religion",
    examRefs: [
      { set: 1, id: 5 },
      { set: 11, id: 19 },
    ],
  },
  {
    id: "ann-christmas",
    month: 12,
    day: 25,
    title: "Christmas Day",
    summary:
      "Christmas Day, 25 December, celebrates the birth of Jesus Christ and is a public holiday.",
    category: "religion",
    examRefs: [
      { set: 4, id: 15 },
      { set: 6, id: 13 },
    ],
  },
  {
    id: "ann-boxing-day",
    month: 12,
    day: 26,
    title: "Boxing Day",
    summary: "Boxing Day is the day after Christmas Day, 26 December, and is a public holiday.",
    category: "religion",
    examRefs: [{ set: 10, id: 5 }],
  },
  {
    id: "ann-hogmanay",
    month: 12,
    day: 31,
    title: "Hogmanay",
    summary:
      "In Scotland, New Year's Eve, 31 December, is called Hogmanay. People sing Auld Lang Syne to celebrate the New Year.",
    category: "arts",
    examRefs: [
      { set: 3, id: 3 },
      { set: 9, id: 8 },
      { set: 14, id: 7 },
    ],
  },
  {
    id: "ann-easter",
    month: 4,
    day: 1,
    movable: true,
    title: "Easter",
    summary:
      "Easter takes place in March or April. It marks the death of Jesus Christ on Good Friday and his rising from the dead on Easter Sunday.",
    category: "religion",
    examRefs: [
      { set: 5, id: 1 },
      { set: 8, id: 12 },
      { set: 10, id: 18 },
    ],
  },
  {
    id: "ann-lent",
    month: 3,
    day: 1,
    movable: true,
    title: "Lent",
    summary: "The 40 days before Easter are known as Lent.",
    category: "religion",
    examRefs: [
      { set: 1, id: 24 },
      { set: 7, id: 23 },
    ],
  },
  {
    id: "ann-diwalii",
    month: 10,
    day: 1,
    movable: true,
    title: "Diwali",
    summary:
      "Diwali, the Festival of Lights, is celebrated by Hindus and Sikhs in the autumn.",
    category: "religion",
    examRefs: [
      { set: 2, id: 16 },
      { set: 11, id: 4 },
    ],
  },
  {
    id: "ann-eid",
    month: 6,
    day: 1,
    movable: true,
    title: "Eid al-Fitr",
    summary:
      "Eid al-Fitr celebrates the end of Ramadan, the month in which Muslims fast during daylight hours.",
    category: "religion",
    examRefs: [{ set: 3, id: 24 }],
  },
];

export function annualForMonth(month: number): AnnualEvent[] {
  return ANNUAL_EVENTS.filter((e) => !e.movable && e.month === month).sort(
    (a, b) => a.day - b.day,
  );
}

export const MOVABLE_EVENTS = ANNUAL_EVENTS.filter((e) => e.movable);
