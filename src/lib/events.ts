/**
 * Trivia längs rutten från öppna API:er. Allt hämtas INNAN löpningen startar
 * och sorteras på distans (km), så att uppspelningen aldrig väntar på nätet.
 *
 * Trivian ska passa temat: hårda Chuck Norris-saker eller utdöda djur och förhistoria.
 *
 * Källor:
 *  - Wikidata (SPARQL): platser i temakategorierna nära rutten (fängelser, befästningar,
 *    fornlämningar, kyrkogårdar, djurparker …). Kategorierna finns i src/data/triviaClasses.json,
 *    som skapas med `npm run trivia-classes`.
 *  - Wikidata (SPARQL): kända personer som ligger begravda nära rutten.
 *  - Wikidata (SPARQL): kända personer som dog nära rutten.
 *  - USGS: historiska jordbävningar nära rutten.
 *
 * Lägg till fler källor i SOURCES. Varje källa är en funktion (line, ctx) => Promise<RouteEvent[]>.
 */
import TRIVIA_CLASSES from "../data/triviaClasses.json";
import { haversine, type LngLat } from "./shape";

/** Platskategorier (från triviaClasses.json) och personhändelser. */
export type PlaceCategory = "crime" | "war" | "prehistoric" | "cemetery" | "beasts" | "disaster";
export type EventType = PlaceCategory | "grave" | "death" | "quake";

const CLASSES = TRIVIA_CLASSES as Record<string, PlaceCategory>;

/** Extra poäng per kategori: det hårdaste och mest förhistoriska först. */
const CATEGORY_BONUS: Record<PlaceCategory, number> = { crime: 30, prehistoric: 25, disaster: 25, beasts: 20, war: 15, cemetery: 5 };

export interface RouteEvent {
  km: number;
  type: EventType;
  title: string;
  text: string;
  at: LngLat;
  /** Avstånd i meter från rutten. */
  distM: number;
  /** Wikipedia-artiklar för mer fakta och bild (svenska först). */
  wiki?: { sv?: string; en?: string };
  /** Hur känd saken är (antal Wikipedia-språk). Används för att välja de bästa. */
  rank: number;
}

/** Max avstånd från rutten per källa, i meter. */
export const MAX_DIST_M: Record<"place" | "grave" | "death" | "quake", number> = { place: 120, grave: 150, death: 150, quake: 1000 };
/** Max antal trivia per runda, och minsta avstånd mellan dem längs rutten. */
export const MAX_EVENTS = 10;
export const MIN_GAP_KM = 0.8;

interface Ctx { cumKm: number[] }

type Source = (line: LngLat[], ctx: Ctx) => Promise<RouteEvent[]>;

/**
 * Närmaste punkt på rutten: km från start och avstånd i meter.
 * Räknar mot varje segment (inte bara mot punkterna), i en lokal platt projektion.
 */
export function nearestOnLine(line: LngLat[], ctx: Ctx, p: LngLat): { km: number; distM: number } {
  const kx = 111_320 * Math.cos((p[1] * Math.PI) / 180), ky = 110_540;
  let best = { km: 0, distM: Infinity };
  for (let i = 1; i < line.length; i++) {
    const ax = (line[i - 1][0] - p[0]) * kx, ay = (line[i - 1][1] - p[1]) * ky;
    const bx = (line[i][0] - p[0]) * kx, by = (line[i][1] - p[1]) * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best.distM) best = { distM: d, km: ctx.cumKm[i - 1] + t * (ctx.cumKm[i] - ctx.cumKm[i - 1]) };
  }
  return best;
}

function bboxOf(line: LngLat[], padM: number) {
  const xs = line.map((p) => p[0]), ys = line.map((p) => p[1]);
  const lat = (Math.min(...ys) + Math.max(...ys)) / 2;
  const padLat = padM / 110_540, padLng = padM / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { minLng: Math.min(...xs) - padLng, maxLng: Math.max(...xs) + padLng, minLat: Math.min(...ys) - padLat, maxLat: Math.max(...ys) + padLat };
}

/* ------------------------------ Wikidata ------------------------------ */

const WDQS = "https://query.wikidata.org/sparql";

async function sparql(query: string): Promise<Record<string, { value: string }>[]> {
  // POST, eftersom frågan med alla temaklasser är för lång för en URL.
  const res = await fetch(WDQS, {
    method: "POST",
    headers: { Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query }),
  });
  if (!res.ok) throw new Error(`Wikidata svarade ${res.status}`);
  return (await res.json()).results.bindings;
}

function boxService(line: LngLat[], padM: number, subject: string, coordVar: string) {
  const b = bboxOf(line, padM);
  return `SERVICE wikibase:box {
        ${subject} wdt:P625 ${coordVar} .
        bd:serviceParam wikibase:cornerSouthWest "Point(${b.minLng.toFixed(5)} ${b.minLat.toFixed(5)})"^^geo:wktLiteral .
        bd:serviceParam wikibase:cornerNorthEast "Point(${b.maxLng.toFixed(5)} ${b.maxLat.toFixed(5)})"^^geo:wktLiteral .
      }`;
}

/** "Point(lng lat)" → [lng, lat] */
function parsePoint(wkt: string): LngLat | null {
  const m = wkt.match(/Point\(([-\d.eE]+) ([-\d.eE]+)\)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}

/** Artikeltitel ur en Wikipedia-URL. */
const articleTitle = (url?: string) => (url ? decodeURIComponent(url.split("/wiki/")[1] ?? "") || undefined : undefined);

/** Platser i temakategorierna nära rutten. Klassas på sin direkta "instans av" (P31). */
const places: Source = async (line, ctx) => {
  // FILTER IN, inte VALUES: med VALUES börjar Wikidata med alla platser i världen och tar över 60 s.
  const types = Object.keys(CLASSES).map((q) => `wd:${q}`).join(",");
  const rows = await sparql(`
    SELECT ?item ?itemLabel ?itemDescription ?coord ?sl ?type ?sv ?en WHERE {
      {
        SELECT ?item (SAMPLE(?c) AS ?coord) (MAX(?s) AS ?sl) (SAMPLE(?t) AS ?type) WHERE {
          ${boxService(line, MAX_DIST_M.place, "?item", "?c")}
          ?item wikibase:sitelinks ?s .
          FILTER(?s >= 1)
          ?item wdt:P31 ?t .
          FILTER(?t IN (${types}))
        } GROUP BY ?item ORDER BY DESC(?sl) LIMIT 400
      }
      OPTIONAL { ?sv schema:about ?item ; schema:isPartOf <https://sv.wikipedia.org/> . }
      OPTIONAL { ?en schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "sv,en". }
    }`);
  return rows.flatMap((r) => {
    const at = parsePoint(r.coord.value);
    const category = CLASSES[r.type.value.split("/").pop() ?? ""];
    const title = r.itemLabel.value;
    if (!at || !category || /^Q\d+$/.test(title)) return [];
    const near = nearestOnLine(line, ctx, at);
    if (near.distM > MAX_DIST_M.place) return [];
    return [{
      ...near, at, type: category, title, text: r.itemDescription?.value ?? "",
      wiki: { sv: articleTitle(r.sv?.value), en: articleTitle(r.en?.value) }, rank: +r.sl.value + CATEGORY_BONUS[category],
    }];
  });
};

/** Kända personer som ligger begravda nära rutten. */
const graves: Source = async (line, ctx) => {
  const rows = await sparql(`
    SELECT ?place ?placeLabel ?coord ?person ?personLabel ?personDescription ?born ?died ?sl ?sv ?en WHERE {
      {
        SELECT ?place (SAMPLE(?c) AS ?coord) ?person (MAX(?s) AS ?sl) WHERE {
          ${boxService(line, MAX_DIST_M.grave, "?place", "?c")}
          FILTER NOT EXISTS { ?place wdt:P1082 [] }
          ?person wdt:P119 ?place ; wikibase:sitelinks ?s .
          FILTER(?s >= 8)
        } GROUP BY ?place ?person ORDER BY DESC(?sl) LIMIT 200
      }
      OPTIONAL { ?person wdt:P569 ?born . }
      OPTIONAL { ?person wdt:P570 ?died . }
      OPTIONAL { ?sv schema:about ?person ; schema:isPartOf <https://sv.wikipedia.org/> . }
      OPTIONAL { ?en schema:about ?person ; schema:isPartOf <https://en.wikipedia.org/> . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "sv,en". }
    }`);
  const seen = new Set<string>();
  return rows.flatMap((r) => {
    const at = parsePoint(r.coord.value);
    const name = r.personLabel.value;
    if (!at || seen.has(r.person.value) || /^Q\d+$/.test(name)) return [];
    seen.add(r.person.value);
    const near = nearestOnLine(line, ctx, at);
    if (near.distM > MAX_DIST_M.grave) return [];
    const years = [r.born?.value, r.died?.value].map((d) => d?.slice(0, 4).replace(/^0+/, "")).filter(Boolean).join("–");
    const desc = r.personDescription?.value ?? "";
    return [{
      ...near, at, type: "grave" as const, title: `Här vilar ${name}`,
      text: `${desc}${years ? ` (${years})` : ""}. Begravd vid ${r.placeLabel.value}.`,
      wiki: { sv: articleTitle(r.sv?.value), en: articleTitle(r.en?.value) }, rank: +r.sl.value + 20,
    }];
  });
};

/** Kända personer som dog nära rutten (sjukhus, fängelser, olycksplatser …). */
const deaths: Source = async (line, ctx) => {
  const rows = await sparql(`
    SELECT ?place ?placeLabel ?coord ?person ?personLabel ?personDescription ?died ?mannerLabel ?sl ?sv ?en WHERE {
      {
        SELECT ?place (SAMPLE(?c) AS ?coord) ?person (MAX(?s) AS ?sl) WHERE {
          ${boxService(line, MAX_DIST_M.death, "?place", "?c")}
          FILTER NOT EXISTS { ?place wdt:P1082 [] }
          ?person wdt:P20 ?place ; wikibase:sitelinks ?s .
          FILTER(?s >= 8)
        } GROUP BY ?place ?person ORDER BY DESC(?sl) LIMIT 200
      }
      OPTIONAL { ?person wdt:P570 ?died . }
      OPTIONAL { ?person wdt:P1196 ?manner . }
      OPTIONAL { ?sv schema:about ?person ; schema:isPartOf <https://sv.wikipedia.org/> . }
      OPTIONAL { ?en schema:about ?person ; schema:isPartOf <https://en.wikipedia.org/> . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "sv,en". }
    }`);
  const seen = new Set<string>();
  return rows.flatMap((r) => {
    const at = parsePoint(r.coord.value);
    const name = r.personLabel.value;
    if (!at || seen.has(r.person.value) || /^Q\d+$/.test(name)) return [];
    seen.add(r.person.value);
    const near = nearestOnLine(line, ctx, at);
    if (near.distM > MAX_DIST_M.death) return [];
    const year = r.died?.value?.slice(0, 4).replace(/^0+/, "");
    const manner = r.mannerLabel?.value && !/^Q\d+$/.test(r.mannerLabel.value) ? ` Dödsorsak: ${r.mannerLabel.value}.` : "";
    return [{
      ...near, at, type: "death" as const, title: `Här dog ${name}`,
      text: `${r.personDescription?.value ?? ""}${year ? ` (${year})` : ""}. Dog vid ${r.placeLabel.value}.${manner}`,
      wiki: { sv: articleTitle(r.sv?.value), en: articleTitle(r.en?.value) }, rank: +r.sl.value + 25,
    }];
  });
};

/* ------------------------------ USGS ------------------------------ */

/** Historiska jordbävningar nära rutten (hela katalogen, största först). */
const earthquakes: Source = async (line, ctx) => {
  const b = bboxOf(line, MAX_DIST_M.quake);
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=1900-01-01&minmagnitude=2&orderby=magnitude&limit=20&minlatitude=${b.minLat}&maxlatitude=${b.maxLat}&minlongitude=${b.minLng}&maxlongitude=${b.maxLng}`;
  const data = await (await fetch(url)).json();
  return (data.features ?? []).flatMap((f: any) => {
    const at: LngLat = [f.geometry.coordinates[0], f.geometry.coordinates[1]];
    const near = nearestOnLine(line, ctx, at);
    if (near.distM > MAX_DIST_M.quake) return [];
    const year = new Date(f.properties.time).getFullYear();
    return [{ ...near, at, type: "quake" as const, title: `Jordbävning M${f.properties.mag}`, text: `${f.properties.place} (${year})`, rank: 30 + f.properties.mag }];
  });
};

export const SOURCES: Record<string, Source> = { places, graves, deaths, earthquakes };

/** De mest kända först, med minst MIN_GAP_KM mellan varje, sorterade längs rutten. */
export function pickEvents(all: RouteEvent[], max = MAX_EVENTS, gapKm = MIN_GAP_KM): RouteEvent[] {
  const chosen: RouteEvent[] = [];
  for (const e of [...all].sort((a, b) => b.rank - a.rank)) {
    if (chosen.length >= max) break;
    if (chosen.some((c) => Math.abs(c.km - e.km) < gapKm)) continue;
    chosen.push(e);
  }
  return chosen.sort((a, b) => a.km - b.km);
}

export async function fetchEvents(line: LngLat[]): Promise<RouteEvent[]> {
  const cumKm = [0];
  for (let i = 1; i < line.length; i++) cumKm.push(cumKm[i - 1] + haversine(line[i - 1], line[i]) / 1000);
  const ctx: Ctx = { cumKm };
  const results = await Promise.allSettled(Object.values(SOURCES).map((s) => s(line, ctx)));
  results.forEach((r, i) => r.status === "rejected" && console.warn("Triviakälla misslyckades:", Object.keys(SOURCES)[i], r.reason));
  // Hoppa över trivia precis vid start/mål (där står man redan).
  const total = cumKm[cumKm.length - 1];
  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).filter((e) => e.km > 0.3 && e.km < total - 0.3);
  return pickEvents(all);
}

/** Sammanfattning och bild från Wikipedia (svenska först, annars engelska). */
export async function wikiSummary(wiki?: RouteEvent["wiki"]): Promise<{ extract: string; image?: string; url?: string } | null> {
  for (const [lang, title] of [["sv", wiki?.sv], ["en", wiki?.en]] as const) {
    if (!title) continue;
    try {
      const d = await (await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)).json();
      if (d.extract) return { extract: d.extract, image: d.thumbnail?.source, url: d.content_urls?.mobile?.page };
    } catch { /* prova nästa språk */ }
  }
  return null;
}
