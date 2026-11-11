/** Planar geometri i lokala meter runt en origo, plus konvertering till lng/lat. */

export type Pt = [number, number];
export type Outline = Pt[];
export type LngLat = [number, number];

const R = 6_371_008.8;
const DEG = Math.PI / 180;

/** Ekvirektangulär projektion – exakt nog för rundor upp till några hundra km. */
export function makeProjection(origin: LngLat) {
  const cos = Math.cos(origin[1] * DEG);
  return {
    toLngLat: ([x, y]: Pt): LngLat => [origin[0] + x / (R * cos * DEG), origin[1] + y / (R * DEG)],
    toMeters: ([lng, lat]: LngLat): Pt => [(lng - origin[0]) * R * cos * DEG, (lat - origin[1]) * R * DEG],
  };
}

export const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function haversine(a: LngLat, b: LngLat): number {
  const dLat = (b[1] - a[1]) * DEG;
  const dLng = (b[0] - a[0]) * DEG;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * DEG) * Math.cos(b[1] * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function lineLengthLngLat(line: LngLat[]): number {
  let s = 0;
  for (let i = 1; i < line.length; i++) s += haversine(line[i - 1], line[i]);
  return s;
}

/** Omkrets för en sluten kontur. */
export function perimeter(o: Outline): number {
  let s = 0;
  for (let i = 0; i < o.length; i++) s += dist(o[i], o[(i + 1) % o.length]);
  return s;
}

export function bbox(o: Pt[]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of o) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/** Centrera kring (0,0) och skala så att omkretsen blir 1. */
export function normalize(o: Outline): Outline {
  const [minX, minY, maxX, maxY] = bbox(o);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const centered = o.map(([x, y]) => [x - cx, y - cy] as Pt);
  const p = perimeter(centered);
  return centered.map(([x, y]) => [x / p, y / p] as Pt);
}

export function transform(o: Outline, opts: { scale: number; rotationDeg: number; offset: Pt }): Outline {
  const a = opts.rotationDeg * DEG;
  const c = Math.cos(a), s = Math.sin(a);
  return o.map(([x, y]) => [
    (x * c - y * s) * opts.scale + opts.offset[0],
    (x * s + y * c) * opts.scale + opts.offset[1],
  ]);
}

/** Avstånd från punkt till segment. */
export function pointSegDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas–Peucker för en öppen polyline. */
export function simplifyOpen(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts.slice();
  let maxD = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = pointSegDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
  const left = simplifyOpen(pts.slice(0, idx + 1), eps);
  const right = simplifyOpen(pts.slice(idx), eps);
  return [...left.slice(0, -1), ...right];
}

/** Douglas–Peucker för en sluten kontur (delas vid punkten längst från start). */
export function simplifyClosed(o: Outline, eps: number): Outline {
  let far = 0, maxD = 0;
  for (let i = 1; i < o.length; i++) {
    const d = dist(o[0], o[i]);
    if (d > maxD) { maxD = d; far = i; }
  }
  const a = simplifyOpen(o.slice(0, far + 1), eps);
  const b = simplifyOpen([...o.slice(far), o[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/** Förenkla till högst `maxPoints` hörn (binärsökning på epsilon). */
export function simplifyToCount(o: Outline, maxPoints: number): Outline {
  if (o.length <= maxPoints) return o;
  const [minX, minY, maxX, maxY] = bbox(o);
  let lo = 0, hi = Math.hypot(maxX - minX, maxY - minY);
  let best = simplifyClosed(o, hi);
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const s = simplifyClosed(o, mid);
    if (s.length > maxPoints) lo = mid;
    else { hi = mid; best = s; }
  }
  return best;
}

/** Jämnt fördelade punkter längs en polyline (sluten om `closed`). */
export function resample(pts: Pt[], n: number, closed: boolean): Pt[] {
  const ring = closed ? [...pts, pts[0]] : pts;
  const cum = [0];
  for (let i = 1; i < ring.length; i++) cum.push(cum[i - 1] + dist(ring[i - 1], ring[i]));
  const total = cum[cum.length - 1];
  const out: Pt[] = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const d = (k / (closed ? n : n - 1)) * total;
    while (j < ring.length - 1 && cum[j] < d) j++;
    const seg = cum[j] - cum[j - 1] || 1;
    const t = (d - cum[j - 1]) / seg;
    const a = ring[j - 1], b = ring[j];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/**
 * Gör om konturens hörn till waypoints: slå ihop hörn som ligger närmare än `minSpacing`
 * och lägg till mellanpunkter på långa kanter (> maxSpacing). Max `maxPoints`.
 */
export function toWaypoints(o: Outline, minSpacing: number, maxSpacing: number, maxPoints: number): Pt[] {
  const merged: Pt[] = [];
  for (const p of o) {
    if (!merged.length || dist(merged[merged.length - 1], p) >= minSpacing) merged.push(p);
  }
  if (merged.length > 2 && dist(merged[merged.length - 1], merged[0]) < minSpacing) merged.pop();
  const out: Pt[] = [];
  for (let i = 0; i < merged.length; i++) {
    const a = merged[i], b = merged[(i + 1) % merged.length];
    out.push(a);
    const n = Math.floor(dist(a, b) / maxSpacing);
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / (n + 1), a[1] + ((b[1] - a[1]) * k) / (n + 1)]);
  }
  if (out.length <= maxPoints) return out;
  // För många – behåll de viktigaste hörnen.
  return simplifyToCount(out, maxPoints);
}
