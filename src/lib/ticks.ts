import { normToX, toNorm, toValue, xToNorm, type ViewWindow } from "./scale";

/** Round a raw year gap up to a friendly 1 / 2 / 5 × power of ten. */
function niceStep(raw: number): number {
  if (!isFinite(raw) || raw <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const mult = n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10;
  return mult * pow;
}

/**
 * Choose the years to label on the axis: one tick roughly every 120px, snapped
 * to a round step so the labels are easy to read, and never closer than 56px
 * apart.
 */
export function computeTicks(view: ViewWindow, width: number): number[] {
  if (width === 0) return [];
  const slots = Math.max(2, Math.min(20, Math.round(width / 120)));
  const out: number[] = [];
  let lastX = -Infinity;
  for (let k = 0; k <= slots; k++) {
    const x = (k / slots) * width;
    const n = xToNorm(x, view, width);
    const d = 60 / width;
    const bracket = Math.abs(
      toValue(Math.min(1, n + d)) - toValue(Math.max(0, n - d)),
    );
    const step = niceStep(bracket / 1.4);
    const year = Math.round(toValue(n) / step) * step;
    const tX = normToX(toNorm(year), view, width);
    if (tX - lastX < 56) continue;
    out.push(year);
    lastX = tX;
  }
  return out;
}
