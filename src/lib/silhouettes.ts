import { HANDMADE } from "../data/handmade";
import traced from "../data/silhouettes.json";
import { normalize, type Outline } from "./shape";

export interface SilhouetteInfo {
  outline: Outline; // normaliserad: centrerad, omkrets 1, y uppåt
  credit?: string;
  license?: string;
  source: "phylopic" | "handmade";
}

type TracedFile = Record<string, { points: [number, number][]; credit?: string; license?: string }>;

const cache = new Map<string, SilhouetteInfo | null>();

export function getSilhouette(id: string): SilhouetteInfo | null {
  if (cache.has(id)) return cache.get(id)!;
  const t = (traced as unknown as TracedFile)[id];
  const info: SilhouetteInfo | null = t
    ? { outline: normalize(t.points), credit: t.credit, license: t.license, source: "phylopic" }
    : HANDMADE[id]
      ? { outline: normalize(HANDMADE[id]), source: "handmade" }
      : null;
  cache.set(id, info);
  return info;
}

/** SVG-path för förhandsvisning (y vänds för skärmen). */
export function outlineToSvgPath(o: Outline, size = 100, pad = 6): string {
  const xs = o.map((p) => p[0]), ys = o.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = (size - 2 * pad) / Math.max(maxX - minX, maxY - minY);
  const ox = (size - (maxX - minX) * s) / 2, oy = (size - (maxY - minY) * s) / 2;
  return o.map(([x, y], i) => `${i ? "L" : "M"}${((x - minX) * s + ox).toFixed(1)},${((maxY - y) * s + oy).toFixed(1)}`).join("") + "Z";
}
