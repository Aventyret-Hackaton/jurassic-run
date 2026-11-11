import { bbox, pointSegDist, resample, type Pt } from "./shape";

/**
 * Hur stor del av formens diagonal ett medelavstånd får vara innan betyget blir 0 %.
 * Höj för snällare betyg, sänk för strängare. (Projektdokumentet föreslog 0,05.)
 */
export const ACCURACY_TOLERANCE = 0.08;

function meanDistTo(samples: Pt[], line: Pt[], closed: boolean): number {
  let sum = 0;
  const segs = closed ? line.length : line.length - 1;
  for (const p of samples) {
    let best = Infinity;
    for (let i = 0; i < segs; i++) {
      const d = pointSegDist(p, line[i], line[(i + 1) % line.length]);
      if (d < best) best = d;
    }
    sum += best;
  }
  return sum / samples.length;
}

/**
 * Silhouette Accuracy (0–1). Symmetriskt medelavstånd mellan rutten och silhuetten,
 * normaliserat mot silhuettens diagonal. Allt i lokala meter.
 */
export function silhouetteAccuracy(route: Pt[], shape: Pt[], samples = 200): number {
  if (route.length < 2) return 0;
  const routeSamples = resample(route, samples, false);
  const shapeSamples = resample(shape, samples, true);
  const d1 = meanDistTo(routeSamples, shape, true);
  const d2 = meanDistTo(shapeSamples, route, false);
  const mean = (d1 + d2) / 2;
  const [minX, minY, maxX, maxY] = bbox(shape);
  const diag = Math.hypot(maxX - minX, maxY - minY);
  return Math.max(0, Math.min(1, 1 - mean / (ACCURACY_TOLERANCE * diag)));
}
