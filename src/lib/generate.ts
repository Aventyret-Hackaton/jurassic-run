/**
 * Kärnan: silhuett → kandidater → land/landsfilter → ruttning → terrängsträckor → Silhouette Accuracy.
 */
import { CAR_FACTOR, type Animal } from "../data/animals";
import { silhouetteAccuracy } from "./accuracy";
import { findCountry, makeLandCheck, type Country } from "./land";
import { getSilhouette } from "./silhouettes";
import {
  dist, haversine, lineLengthLngLat, makeProjection, perimeter, transform, toWaypoints,
  type LngLat, type Outline, type Pt,
} from "./shape";

export type Mode = "foot" | "car";

export interface Segment { kind: "road" | "terrain" | "connector"; coordinates: LngLat[] }

export interface GeneratedRoute {
  animal: Animal;
  mode: Mode;
  country: string;
  /** Silhuetten som den placerades (för "spöket" på kartan). */
  ghost: LngLat[];
  waypoints: LngLat[];
  segments: Segment[];
  /** Hela rundan i ordning, inklusive anslutning från/till användaren. */
  line: LngLat[];
  distance: number;
  accuracy: number;
  source: string;
  candidatesTested: number;
}

export interface GenerateOptions {
  animal: Animal;
  mode: Mode;
  origin: LngLat;
  candidates?: number;
  routed?: number;
  onProgress?: (msg: string) => void;
  signal?: AbortSignal;
}

interface Candidate { shape: Outline; waypoints: Pt[]; landScore: number; params: string }

const TERRAIN_RATIO = 2.5;

export async function generateRoute(opts: GenerateOptions): Promise<GeneratedRoute> {
  const { animal, mode, origin, onProgress = () => {} } = opts;
  const nCand = opts.candidates ?? 20;
  const nRoute = opts.routed ?? 3;

  const sil = getSilhouette(animal.id);
  if (!sil) throw new Error(`Ingen silhuett för ${animal.name}. Kör "npm run silhouettes".`);

  onProgress("Laddar världskartan…");
  const countryObj = await findCountry(origin);
  if (!countryObj) throw new Error("Du verkar stå i havet. Chuck Norris kan gå på vatten – du kan inte.");
  const country = countryObj.name;
  const onLand = await makeLandCheck(countryObj);

  const proj = makeProjection(origin);
  const targetLen = animal.baseKm * 1000 * (mode === "car" ? CAR_FACTOR : 1);
  // Max avstånd från användaren till närmaste punkt på rutten.
  const maxApproach = Math.min(mode === "car" ? 20_000 : 2_000, 0.1 * targetLen);

  // Kandidater testas lokalt (gratis). Kuststäder som New York har mycket vatten,
  // så vi kör flera omgångar och sänker kravet på landandel lite i taget.
  const cands: Candidate[] = [];
  let viable: Candidate[] = [];
  for (const [round, minLand] of [[1, 0.9], [2, 0.8], [3, 0.7]] as const) {
    onProgress(`Chuck testar ${nCand} placeringar av ${animal.name.toLowerCase()} i ${country}${round > 1 ? ` (omgång ${round})` : ""}…`);
    for (let i = 0; i < nCand; i++) cands.push(makeCandidate(sil.outline, targetLen, maxApproach, mode, (p) => onLand(proj.toLngLat(p))));
    viable = cands.filter((c) => c.landScore >= minLand).sort((x, y) => y.landScore - x.landScore);
    if (viable.length >= nRoute) break;
  }
  if (!viable.length) throw new Error(`Ingen placering får plats på land i ${country}. Prova ett mindre djur eller en annan plats.`);
  onProgress(`${viable.length} av ${cands.length} placeringar ligger på land. Ruttar de ${Math.min(nRoute, viable.length)} bästa…`);

  const toRoute = viable.slice(0, nRoute);
  const results = await Promise.allSettled(toRoute.map((c) => routeCandidate(c, mode, origin, proj, countryObj, onLand, opts.signal)));
  const ok = results.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
  if (!ok.length) {
    const firstErr = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    throw new Error(`Ruttningen misslyckades: ${firstErr?.reason?.message ?? "rutten lämnade landet"}`);
  }
  ok.sort((a, b) => b.accuracy - a.accuracy);
  const best = ok[0];
  onProgress(`Bästa rutten: ${Math.round(best.accuracy * 100)} % Silhouette Accuracy.`);
  return { ...best, animal, mode, country, candidatesTested: nCand };
}

function makeCandidate(outline: Outline, targetLen: number, maxApproach: number, mode: Mode, onLand: (p: Pt) => boolean): Candidate {
  const scale = targetLen * (0.8 + Math.random() * 0.4);
  const rotationDeg = (Math.random() - 0.5) * 50;
  const base = transform(outline, { scale, rotationDeg, offset: [0, 0] });
  // Placera en slumpad punkt på konturen nära användaren (som står i 0,0).
  const anchor = base[Math.floor(Math.random() * base.length)];
  const r = Math.random() * maxApproach * 0.6, a = Math.random() * Math.PI * 2;
  const shape = base.map(([x, y]) => [x - anchor[0] + r * Math.cos(a), y - anchor[1] + r * Math.sin(a)] as Pt);
  const per = perimeter(shape);
  const minSpacing = Math.max(mode === "car" ? 1500 : 250, per / 70);
  const waypoints = toWaypoints(shape, minSpacing, per / 25, 48);
  const valid = waypoints.filter(onLand).length;
  return { shape, waypoints, landScore: valid / waypoints.length, params: `${(scale / 1000).toFixed(1)}km ${rotationDeg.toFixed(0)}°` };
}

async function routeCandidate(
  c: Candidate, mode: Mode, origin: LngLat, proj: ReturnType<typeof makeProjection>,
  country: Country, onLand: (p: LngLat) => boolean, signal?: AbortSignal,
) {
  const wps = c.waypoints.map(proj.toLngLat);
  const closed = [...wps, wps[0]];
  const res = await fetch("/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: mode, coordinates: closed }),
    signal,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  const coords: LngLat[] = data.coordinates;
  const wpIdx: number[] = data.wayPoints;

  // Avvisa rutter som går in i ett annat land (stickprov). Punkter "utanför" som bara
  // är broar över vatten är okej – vägar går ändå aldrig över hav.
  const step = Math.max(1, Math.floor(coords.length / 150));
  let foreign = 0, checked = 0;
  for (let i = 0; i < coords.length; i += step) {
    checked++;
    if (country.contains(coords[i])) continue;
    const other = await findCountry(coords[i]);
    if (other && other.code !== country.code) foreign++;
  }
  if (foreign / checked > 0.01) return null;

  // Terrängsträckor: byt ut omvägar mot raka linjer över land.
  const segments: Segment[] = [];
  for (let i = 0; i < wpIdx.length - 1; i++) {
    const leg = coords.slice(wpIdx[i], wpIdx[i + 1] + 1);
    if (leg.length < 2) continue;
    const a = leg[0], b = leg[leg.length - 1];
    const straight = haversine(a, b);
    const legLen = lineLengthLngLat(leg);
    const tooLong = straight > 150 && legLen / straight > TERRAIN_RATIO;
    const kind = tooLong && straightOnLand(a, b, onLand) ? "terrain" : "road";
    const pts = kind === "terrain" ? [a, b] : leg;
    const last = segments[segments.length - 1];
    if (last && last.kind === kind) last.coordinates.push(...pts.slice(1));
    else segments.push({ kind, coordinates: pts });
  }

  const loop = segments.flatMap((s, i) => (i ? s.coordinates.slice(1) : s.coordinates));
  const loopM = loop.map(proj.toMeters);
  const accuracy = silhouetteAccuracy(loopM, c.shape);

  // Anslutning: från användaren till närmaste punkt på rundan, och rundan börjar där.
  const originM: Pt = [0, 0];
  let nearest = 0, nd = Infinity;
  loopM.forEach((p, i) => { const d = dist(p, originM); if (d < nd) { nd = d; nearest = i; } });
  const rotated = [...loop.slice(nearest), ...loop.slice(1, nearest + 1)];
  const connector: Segment = { kind: "connector", coordinates: [origin, loop[nearest]] };
  const line = [origin, ...rotated, origin];

  return {
    ghost: [...c.shape, c.shape[0]].map(proj.toLngLat),
    waypoints: wps,
    segments: [connector, ...segments],
    line,
    distance: lineLengthLngLat(line),
    accuracy,
    source: data.source as string,
  };
}

function straightOnLand(a: LngLat, b: LngLat, onLand: (p: LngLat) => boolean): boolean {
  for (let t = 0; t <= 1; t += 0.1) {
    const p: LngLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    if (!onLand(p)) return false;
  }
  return true;
}

