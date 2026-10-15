import { UK_OUTLINE } from "../data/ukOutline";

/**
 * Projection for the map tab.
 *
 * The United Kingdom is small and far north, so a plain equirectangular
 * projection stretched by cos(latitude) is plenty: it keeps the aspect ratio
 * right without pulling in a projection library. Both the coastline and the
 * pins go through {@link project}, which is the whole point — one function
 * means the pins can never drift off the coast.
 *
 * Map space is "degrees of latitude, times 100" so the numbers are convenient
 * for an SVG viewBox and `toFixed(2)` is accurate enough.
 */

/** The window of the world the map shows. Shetland and the far Atlantic are
 *  cropped, exactly as a UK wall map would be. */
export const MAP_BOUNDS = {
  lonMin: -8.8,
  lonMax: 2.1,
  latMin: 49.8,
  latMax: 59.9,
};

const SCALE = 100;
const MID_LAT = (MAP_BOUNDS.latMin + MAP_BOUNDS.latMax) / 2;
/** Longitude shrinks as you go north; this keeps the UK from looking stretched. */
const LON_SCALE = Math.cos((MID_LAT * Math.PI) / 180);

/** Width of the whole map in map units. */
export const MAP_WIDTH = (MAP_BOUNDS.lonMax - MAP_BOUNDS.lonMin) * LON_SCALE * SCALE;
/** Height of the whole map in map units. */
export const MAP_HEIGHT = (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin) * SCALE;

export interface MapPoint {
  x: number;
  y: number;
}

/** Longitude/latitude in degrees → map units. */
export function project(lon: number, lat: number): MapPoint {
  return {
    x: (lon - MAP_BOUNDS.lonMin) * LON_SCALE * SCALE,
    y: (MAP_BOUNDS.latMax - lat) * SCALE,
  };
}

/**
 * The coastline as SVG path strings, projected once at module load. Each region
 * is one `<path>`: a handful of nodes keeps the DOM (and Lighthouse's TBT)
 * cheap, and rings that leave the viewBox are clipped by the SVG itself.
 */
export const REGION_PATHS: { id: string; label: string; d: string }[] =
  UK_OUTLINE.map((region) => ({
    id: region.id,
    label: region.label,
    d: region.rings
      .map((ring) => {
        let d = "";
        for (let i = 0; i < ring.length; i += 2) {
          const { x, y } = project(ring[i], ring[i + 1]);
          d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
        }
        return `${d}Z`;
      })
      .join(""),
  }));
