/**
 * Händelser längs rutten från öppna API:er. Allt hämtas INNAN löpningen startar
 * och sorteras på distans (km), så att uppspelningen på 30 sekunder aldrig väntar på nätet.
 *
 * Person B: lägg till fler källor här (Wikidata-gravar, GBIF-fossil, World Bank …).
 * Varje källa är en funktion (line, ctx) => Promise<RouteEvent[]>.
 */
import { haversine, type LngLat } from "./shape";

export type EventType = "quake" | "weather" | "grave" | "fossil" | "stat" | "country";

export interface RouteEvent {
  km: number;
  type: EventType;
  title: string;
  text: string;
  at: LngLat;
}

interface Ctx { cumKm: number[]; radiusKm: number }

type Source = (line: LngLat[], ctx: Ctx) => Promise<RouteEvent[]>;

/** Närmaste punkt på rutten → km från start, eller null om längre bort än radiusKm. */
export function kmAlong(line: LngLat[], ctx: Ctx, p: LngLat): number | null {
  const step = Math.max(1, Math.floor(line.length / 400));
  let best = -1, bd = Infinity;
  for (let i = 0; i < line.length; i += step) {
    const d = haversine(line[i], p);
    if (d < bd) { bd = d; best = i; }
  }
  return bd / 1000 <= ctx.radiusKm ? ctx.cumKm[best] : null;
}

function bboxOf(line: LngLat[], padDeg: number) {
  const xs = line.map((p) => p[0]), ys = line.map((p) => p[1]);
  return { minLng: Math.min(...xs) - padDeg, maxLng: Math.max(...xs) + padDeg, minLat: Math.min(...ys) - padDeg, maxLat: Math.max(...ys) + padDeg };
}

/** USGS: historiska jordbävningar nära rutten (hela katalogen, största först). */
const earthquakes: Source = async (line, ctx) => {
  const b = bboxOf(line, ctx.radiusKm / 111);
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=1900-01-01&minmagnitude=2&orderby=magnitude&limit=20&minlatitude=${b.minLat}&maxlatitude=${b.maxLat}&minlongitude=${b.minLng}&maxlongitude=${b.maxLng}`;
  const data = await (await fetch(url)).json();
  return (data.features ?? []).flatMap((f: any) => {
    const at: LngLat = [f.geometry.coordinates[0], f.geometry.coordinates[1]];
    const km = kmAlong(line, ctx, at);
    if (km == null) return [];
    const year = new Date(f.properties.time).getFullYear();
    return [{ km, at, type: "quake" as const, title: `Jordbävning M${f.properties.mag}`, text: `${f.properties.place} (${year})` }];
  });
};

/** Open-Meteo: aktuellt väder vid start, mitt och mål. */
const weather: Source = async (line, ctx) => {
  const idx = [0, Math.floor(line.length / 2), line.length - 2];
  const pts = idx.map((i) => line[i]);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${pts.map((p) => p[1].toFixed(3)).join(",")}&longitude=${pts.map((p) => p[0].toFixed(3)).join(",")}&current=temperature_2m,wind_speed_10m`;
  const data = await (await fetch(url)).json();
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((d: any, k: number) => ({
    km: ctx.cumKm[idx[k]],
    at: pts[k],
    type: "weather" as const,
    title: `${d.current.temperature_2m} °C`,
    text: `Vind ${d.current.wind_speed_10m} km/h`,
  }));
};

export const SOURCES: Record<string, Source> = { earthquakes, weather };

export async function fetchEvents(line: LngLat[], mode: "foot" | "car"): Promise<RouteEvent[]> {
  const cumKm = [0];
  for (let i = 1; i < line.length; i++) cumKm.push(cumKm[i - 1] + haversine(line[i - 1], line[i]) / 1000);
  const ctx: Ctx = { cumKm, radiusKm: mode === "car" ? 15 : 3 };
  const results = await Promise.allSettled(Object.values(SOURCES).map((s) => s(line, ctx)));
  results.forEach((r, i) => r.status === "rejected" && console.warn("Händelsekälla misslyckades:", Object.keys(SOURCES)[i], r.reason));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).sort((a, b) => a.km - b.km);
}
