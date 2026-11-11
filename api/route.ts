/**
 * POST /api/route
 * Body: { profile: "foot" | "car", coordinates: [lng, lat][] }
 * Svar: { coordinates: [lng, lat][], wayPoints: number[], distance: number, source: "ors" | "osrm" }
 *
 * Använder OpenRouteService om ORS_API_KEY finns, annars OSRM:s publika demoservrar.
 * Nyckeln stannar på servern.
 */

type Profile = "foot" | "car";
type LngLat = [number, number];

export interface RouteResponse {
  coordinates: LngLat[];
  /** Index i `coordinates` där varje waypoint hamnade. */
  wayPoints: number[];
  distance: number;
  source: "ors" | "osrm";
}

const ORS_PROFILE: Record<Profile, string> = { foot: "foot-walking", car: "driving-car" };
const OSRM_HOST: Record<Profile, string> = {
  foot: "https://routing.openstreetmap.de/routed-foot",
  car: "https://routing.openstreetmap.de/routed-car",
};

const cache = new Map<string, RouteResponse>();

export async function POST(request: Request): Promise<Response> {
  const { profile, coordinates } = (await request.json()) as { profile: Profile; coordinates: LngLat[] };
  if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.length > 50) {
    return json({ error: "coordinates måste ha 2–50 punkter" }, 400);
  }
  if (profile !== "foot" && profile !== "car") return json({ error: "okänd profil" }, 400);

  const key = `${profile}:${coordinates.map((c) => c.map((n) => n.toFixed(4)).join(",")).join(";")}`;
  const hit = cache.get(key);
  if (hit) return json(hit, 200, true);

  try {
    const result = process.env.ORS_API_KEY
      ? await routeOrs(profile, coordinates, process.env.ORS_API_KEY)
      : await routeOsrm(profile, coordinates);
    cache.set(key, result);
    return json(result);
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 502);
  }
}

async function routeOrs(profile: Profile, coordinates: LngLat[], apiKey: string): Promise<RouteResponse> {
  const res = await fetch(`https://api.openrouteservice.org/v2/directions/${ORS_PROFILE[profile]}/geojson`, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      coordinates,
      // Tillåt waypoints att snappa till väg upp till 2 km bort (standard är 350 m).
      radiuses: coordinates.map(() => 2000),
      options: { avoid_features: ["ferries"] },
      instructions: false,
    }),
  });
  if (!res.ok) throw new Error(`ORS ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const f = data.features[0];
  return {
    coordinates: f.geometry.coordinates,
    wayPoints: f.properties.way_points,
    distance: f.properties.summary.distance,
    source: "ors",
  };
}

async function routeOsrm(profile: Profile, coordinates: LngLat[]): Promise<RouteResponse> {
  const coords = coordinates.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(";");
  const url = `${OSRM_HOST[profile]}/route/v1/driving/${coords}?overview=full&geometries=geojson&continue_straight=false`;
  const res = await fetch(url, { headers: { "User-Agent": "JurassicRun-hackathon" } });
  if (!res.ok) throw new Error(`OSRM ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.code !== "Ok") throw new Error(`OSRM: ${data.code} ${data.message ?? ""}`);
  const line: LngLat[] = data.routes[0].geometry.coordinates;
  // OSRM ger inte geometri-index för waypoints – hitta närmaste punkt framåt längs linjen.
  const wayPoints: number[] = [];
  let from = 0;
  for (const wp of data.waypoints as { location: LngLat }[]) {
    let best = from;
    let bestD = Infinity;
    for (let i = from; i < line.length; i++) {
      const d = (line[i][0] - wp.location[0]) ** 2 + (line[i][1] - wp.location[1]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
      if (d < 1e-14) break;
    }
    wayPoints.push(best);
    from = best;
  }
  return { coordinates: line, wayPoints, distance: data.routes[0].distance, source: "osrm" };
}

function json(body: unknown, status = 200, cached = false): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "X-Cache": cached ? "HIT" : "MISS" },
  });
}
