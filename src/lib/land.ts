/**
 * Land- och landskontroll mot Natural Earth 1:10m (public/data).
 * Länderna ligger i en fil per land och laddas bara när de behövs.
 * Upplösningen är ett par hundra meter – bra nog för att hålla djuret på land.
 */
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { LngLat } from "./shape";

type BBox = [number, number, number, number];
type Poly = Feature<Polygon | MultiPolygon, { name: string; code: string }>;
interface IndexEntry { code: string; name: string; bboxes: BBox[] }
interface Part { poly: Feature<Polygon>; bbox: BBox }

export interface Country { name: string; code: string; contains: (p: LngLat) => boolean }

const inBox = ([x, y]: LngLat, b: BBox) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

let indexP: Promise<IndexEntry[]> | null = null;
let lakesP: Promise<Part[]> | null = null;
const countryCache = new Map<string, Promise<Country>>();

function toParts(f: Feature<Polygon | MultiPolygon>): Part[] {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  return polys.map((coords) => {
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    for (const [x, y] of coords[0]) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
    return { poly: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: coords } }, bbox: [minX, minY, maxX, maxY] as BBox };
  });
}

const insideParts = (parts: Part[], p: LngLat) => parts.some((pt) => inBox(p, pt.bbox) && booleanPointInPolygon(p, pt.poly));

function loadCountry(code: string): Promise<Country> {
  if (!countryCache.has(code)) {
    countryCache.set(code, fetch(`/data/countries/${code}.geojson`).then((r) => r.json()).then((f: Poly) => {
      const parts = toParts(f);
      return { name: f.properties.name, code, contains: (p: LngLat) => insideParts(parts, p) };
    }));
  }
  return countryCache.get(code)!;
}

/** Vilket land står punkten i? (null = hav) */
export async function findCountry(p: LngLat): Promise<Country | null> {
  indexP ??= fetch("/data/countries-index.json").then((r) => r.json());
  const candidates = (await indexP).filter((e) => e.bboxes.some((b) => inBox(p, b)));
  for (const e of candidates) {
    const c = await loadCountry(e.code);
    if (c.contains(p)) return c;
  }
  return null;
}

export function loadLakes(): Promise<Part[]> {
  lakesP ??= fetch("/data/lakes.geojson").then((r) => r.json()).then((fc: FeatureCollection<Polygon | MultiPolygon>) => fc.features.flatMap(toParts));
  return lakesP;
}

/** Returnerar en kontroll: ligger punkten på land i landet och inte i en sjö? */
export async function makeLandCheck(country: Country): Promise<(p: LngLat) => boolean> {
  const lakes = await loadLakes();
  return (p) => country.contains(p) && !insideParts(lakes, p);
}
