/** Month names, indexed from 0 to match `Date#getMonth`. */
export const MONTHS = [
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

/** Three-letter month names for tight spaces (search results, calendar grid). */
export const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3));

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th". */
function ordinal(n: number): string {
  if (n % 10 === 1 && n !== 11) return `${n}st`;
  if (n % 10 === 2 && n !== 12) return `${n}nd`;
  if (n % 10 === 3 && n !== 13) return `${n}rd`;
  return `${n}th`;
}

/** "3rd June · every year", or a note for movable feasts. */
export function formatAnnualDate(month: number, day: number, movable?: boolean): string {
  if (movable) return "Movable feast · changes each year";
  return `${ordinal(day)} ${MONTHS[month - 1]} · every year`;
}
