/**
 * One-off generator for `src/data/ukOutline.ts`.
 *
 * The map is a self-contained SVG: the app is offline, the CSP forbids remote
 * images, and a tile server would add a dependency and a network round-trip.
 * So the coastline is committed as plain lon/lat data and projected at runtime
 * by `src/lib/geo.ts` — the very same projection that places the pins, which is
 * what keeps the pins glued to the coast.
 *
 * Source: Natural Earth 1:50m "admin 0 map subunits", which splits the UK into
 * England, Scotland, Wales and Northern Ireland. That gives us nation fills and
 * borders for free, plus the Republic of Ireland for context. Natural Earth is
 * public domain (no attribution required, no share-alike).
 *
 * This is NOT part of `npm run build` — run it by hand only when updating the
 * geometry:  node scripts/build-outline.mjs
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SOURCE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_map_subunits.geojson";

/** Which subunit becomes which region on the map. */
const REGIONS = [
  { source: "England", id: "england", label: "England" },
  { source: "Scotland", id: "scotland", label: "Scotland" },
  { source: "Wales", id: "wales", label: "Wales" },
  { source: "N. Ireland", id: "ni", label: "Northern Ireland" },
  { source: "Ireland", id: "ireland", label: "Republic of Ireland" },
];

/** Simplification tolerance in degrees (~1.5 km at UK latitudes). */
const EPSILON = Number(process.env.EPSILON ?? 0.007);
/** Rings smaller than this (square degrees) are dropped as visual noise. */
const MIN_RING_AREA = Number(process.env.MIN_RING_AREA ?? 0.004);
/** Decimal places kept for each coordinate (~110 m). */
const PRECISION = 3;

// ------------------------------------------------------------- geometry math
const round = (n) => Number(n.toFixed(PRECISION));

/** Perpendicular distance from a point to the line a→b (planar is fine here). */
function segmentDistance([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const cx = ax + Math.max(0, Math.min(1, t)) * dx;
  const cy = ay + Math.max(0, Math.min(1, t)) * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Ramer–Douglas–Peucker line simplification. */
function simplify(points, epsilon) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = segmentDistance(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist <= epsilon) return [points[0], points[end]];
  const left = simplify(points.slice(0, index + 1), epsilon);
  const right = simplify(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

/** Shoelace area of a closed ring; used only to discard specks. */
function ringArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return Math.abs(sum / 2);
}

/** GeoJSON Polygon | MultiPolygon → an array of lon/lat rings. */
function ringsOf(geometry) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const rings = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      if (ring.length < 4) continue;
      if (ringArea(ring) < MIN_RING_AREA) continue;
      // Drop the duplicated closing vertex; the renderer closes the path.
      const open = ring.slice(0, -1);
      const simplified = simplify(open, EPSILON);
      if (simplified.length < 3) continue;
      rings.push(simplified);
    }
  }
  return rings;
}

// -------------------------------------------------------------------- script
const response = await fetch(SOURCE);
if (!response.ok) {
  throw new Error(`Failed to download Natural Earth data: HTTP ${response.status}`);
}
const collection = await response.json();

const byName = new Map(collection.features.map((f) => [f.properties.NAME, f]));
const out = [];
for (const region of REGIONS) {
  const feature = byName.get(region.source);
  if (!feature) throw new Error(`Subunit "${region.source}" not found in the source data`);
  const rings = ringsOf(feature.geometry);
  out.push({ id: region.id, label: region.label, rings });
}

const points = out.reduce((n, r) => n + r.rings.reduce((m, g) => m + g.length, 0), 0);

const body = out
  .map((region) => {
    const rings = region.rings
      .map((ring) => `      [${ring.map(([lon, lat]) => `${round(lon)},${round(lat)}`).join(",")}],`)
      .join("\n");
    return `  {\n    id: "${region.id}",\n    label: "${region.label}",\n    rings: [\n${rings}\n    ],\n  },`;
  })
  .join("\n");

const file = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Run \`node scripts/build-outline.mjs\` to regenerate. Source: Natural Earth
 * 1:50m "admin 0 map subunits" (public domain), simplified with
 * Ramer–Douglas–Peucker (EPSILON env override) and rounded to ${PRECISION} dp.
 *
 * Each ring is a flat \`[lon, lat, lon, lat, …]\` array in degrees, projected at
 * runtime by \`src/lib/geo.ts\`. ${out.length} regions, ${points} vertices.
 */
import type { NationId } from "../types";

export interface OutlineRegion {
  /** \`ireland\` is drawn as neutral context land, not one of the four nations. */
  id: NationId | "ireland";
  label: string;
  /** Flat lon/lat rings; the first/last vertex is NOT repeated. */
  rings: number[][];
}

export const UK_OUTLINE: OutlineRegion[] = [
${body}
];
`;

const target = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/data/ukOutline.ts",
);
await writeFile(target, file, "utf8");
console.log(
  `Wrote ${path.relative(process.cwd(), target)}: ${out.length} regions, ${points} vertices, ${(file.length / 1024).toFixed(1)} kB`,
);
for (const region of out) {
  console.log(
    `  ${region.id.padEnd(9)} ${region.rings.length} ring(s), ${region.rings.reduce((n, r) => n + r.length, 0)} vertices`,
  );
}
