/**
 * Validate the hand-curated map data.
 *
 * `examRefs` and `linkedEventId` are the two places where a typo fails
 * *silently*: a bad reference just renders no question, and a bad event link
 * just hides the "show on the timeline" button. This checks both against the
 * real sources, so mistakes surface here rather than in the UI.
 *
 * Run:  node scripts/validate-places.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const exams = JSON.parse(read("data/exams.json"));
const places = read("src/data/places.ts");
const events = read("src/data/events.ts");

const problems = [];

// --- every examRef resolves -------------------------------------------------
const refs = [...places.matchAll(/set:\s*(\d+),\s*id:\s*(\d+)/g)].map((m) => ({
  set: Number(m[1]),
  id: Number(m[2]),
}));
if (refs.length === 0) problems.push("found no examRefs in places.ts — has the shape changed?");
for (const ref of refs) {
  const question = (exams.exams[String(ref.set)] ?? []).find((q) => q.id === ref.id);
  if (!question) problems.push(`examRef { set: ${ref.set}, id: ${ref.id} } does not resolve`);
}

// --- every linkedEventId exists --------------------------------------------
const eventIds = new Set(
  [...events.matchAll(/^\s*id:\s*"([a-z0-9-]+)"/gm)].map((m) => m[1]),
);
const links = [...places.matchAll(/linkedEventId:\s*"([^"]+)"/g)].map((m) => m[1]);
for (const id of links) {
  if (!eventIds.has(id)) problems.push(`linkedEventId "${id}" is not an event in events.ts`);
}

// --- coordinates sit inside the map bounds ---------------------------------
const bounds = { lonMin: -8.8, lonMax: 2.1, latMin: 49.8, latMax: 59.9 };
const coords = [...places.matchAll(/lat:\s*(-?\d+(?:\.\d+)?),\s*lon:\s*(-?\d+(?:\.\d+)?)/g)];
if (coords.length === 0) problems.push("found no coordinates in places.ts — has the shape changed?");
for (const [, lat, lon] of coords) {
  const p = { lat: Number(lat), lon: Number(lon) };
  if (
    p.lat < bounds.latMin ||
    p.lat > bounds.latMax ||
    p.lon < bounds.lonMin ||
    p.lon > bounds.lonMax
  ) {
    problems.push(`(${p.lat}, ${p.lon}) falls outside the map bounds and would be cropped`);
  }
}

// --- places named in a summary should mention it, not be a copy-paste ------
const ids = [...places.matchAll(/^\s*id:\s*"([a-z0-9-]+)",\s*$/gm)].map((m) => m[1]);
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
if (duplicates.length) problems.push(`duplicate place ids: ${[...new Set(duplicates)].join(", ")}`);

console.log(
  `places: ${ids.length}, examRefs checked: ${refs.length}, event links checked: ${links.length}, coordinates checked: ${coords.length}`,
);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("All place references resolve.");
