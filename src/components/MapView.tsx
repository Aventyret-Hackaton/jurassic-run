import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { RouteEvent } from "../lib/events";
import type { GeneratedRoute, Segment } from "../lib/generate";
import { haversine, type LngLat } from "../lib/shape";

const STYLE = "https://tiles.openfreemap.org/styles/dark";
const empty = { type: "FeatureCollection" as const, features: [] };

const DRAW_MS = 3200; // hur länge neonrutten ritas fram
const SPARKLE_LIFE = 750;
const GHOST_FADE_MS = 1600; // hur länge djurets kontur tonar ut när rutten är klar
const GHOST_FILL_OPACITY = 0.14;
const GHOST_LINE_OPACITY = 0.5;
const SPARKLE_COLORS = ["#ffffff", "#ffe45c", "#22e6ff", "#ff2fb3"];

interface Props {
  center: LngLat;
  route: GeneratedRoute | null;
  runner: LngLat | null;
  events: RouteEvent[];
  passedKm: number;
  /** Anropas när neonrutten är färdigritad. */
  onDrawn?: () => void;
  /** Extra utrymme (px) i botten för panelen när rutten passas in. */
  bottomInset?: number;
  /** Följ löparen: kartan zoomar in och håller löparen i mitten. */
  follow?: boolean;
  /** Zoomnivå när kartan följer löparen. */
  followZoom?: number;
  /** Visa hela rutten igen (t.ex. när rundan är slut). */
  overview?: boolean;
  /** Anropas när löparen går ut i eller kommer upp ur vatten (bara när kartan följer löparen). */
  onWaterChange?: (inWater: boolean) => void;
}

/**
 * Dämpad kamera när kartan följer löparen. Rutten svänger hela tiden längs gatorna,
 * och en kamera som hänger med i varje sväng ger lätt illamående. Därför:
 *  - Dödzon: kameran står still så länge löparen är nära mitten.
 *  - Dämpning: kameran glider efter löparen med tidskonstanten TAU, så att små
 *    sicksack-svängar jämnas ut.
 *  - Ikappkörning: om löparen är på väg ut ur bilden följer kameran snabbare.
 */
const CAMERA = {
  TAU_S: 0.9,
  DEAD_ZONE_PX: 50,
  /** Del av skärmens minsta mått där kameran börjar köra ikapp. */
  CATCH_UP_AT: 0.32,
  /** Med "minska rörelse" i systemet: stor dödzon, så att kameran flyttar sig sällan. */
  REDUCED_DEAD_ZONE: 0.3,
};

interface Sparkle { at: LngLat; born: number; size: number; color: string }

export function MapView({ center, route, runner, events, passedKm, onDrawn, bottomInset = 0, follow = false, followZoom = 15, overview = false, onWaterChange }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const ready = useRef<Promise<void> | null>(null);
  const runnerMarker = useRef<maplibregl.Marker | null>(null);
  const homeMarker = useRef<maplibregl.Marker | null>(null);
  const onDrawnRef = useRef(onDrawn);
  onDrawnRef.current = onDrawn;
  const onWaterRef = useRef(onWaterChange);
  onWaterRef.current = onWaterChange;
  /** Kartlagren med vattenytor och vägar (för broar), från kartstilen. */
  const layerIds = useRef<{ water: string[]; roads: string[] }>({ water: [], roads: [] });
  const inWater = useRef(false);
  /** Följer kartan löparen just nu, och pågår inzoomningen fortfarande? */
  const following = useRef(false);
  const easing = useRef(false);
  /** Löparens senaste position, som den dämpade kameran glider efter. */
  const runnerPos = useRef<LngLat | null>(null);

  useEffect(() => {
    const m = new maplibregl.Map({ container: el.current!, style: STYLE, center, zoom: 11, attributionControl: { compact: true } });
    map.current = m;
    ready.current = new Promise((res) => m.on("load", () => {
      m.addSource("ghost", { type: "geojson", data: empty });
      m.addSource("route", { type: "geojson", data: empty });
      m.addSource("head", { type: "geojson", data: empty });
      m.addSource("sparkles", { type: "geojson", data: empty });
      m.addSource("events", { type: "geojson", data: empty });
      const isRoad = ["==", ["get", "kind"], "road"] as maplibregl.FilterSpecification;
      const isTerrain = ["==", ["get", "kind"], "terrain"] as maplibregl.FilterSpecification;
      const round = { "line-join": "round", "line-cap": "round" } as const;
      m.addLayer({ id: "ghost-fill", type: "fill", source: "ghost", paint: { "fill-color": "#9b2cf0", "fill-opacity": GHOST_FILL_OPACITY } });
      m.addLayer({ id: "ghost-line", type: "line", source: "ghost", paint: { "line-color": "#22e6ff", "line-opacity": GHOST_LINE_OPACITY, "line-width": 1.2, "line-dasharray": [2, 3] } });
      // Neon: bred suddig glöd, smalare färg, vit kärna.
      m.addLayer({ id: "route-glow", type: "line", source: "route", layout: round, paint: { "line-color": "#ff2fb3", "line-width": 18, "line-blur": 12, "line-opacity": 0.75 } });
      m.addLayer({ id: "route-road", type: "line", source: "route", filter: isRoad, layout: round, paint: { "line-color": "#ff4fc4", "line-width": 5 } });
      m.addLayer({ id: "route-terrain", type: "line", source: "route", filter: isTerrain, layout: round, paint: { "line-color": "#22e6ff", "line-width": 4, "line-dasharray": [1.2, 1.4] } });
      m.addLayer({ id: "route-connector", type: "line", source: "route", filter: ["==", ["get", "kind"], "connector"], layout: round, paint: { "line-color": "#c9b8ff", "line-width": 2, "line-dasharray": [0.5, 2] } });
      m.addLayer({ id: "route-core", type: "line", source: "route", filter: ["!=", ["get", "kind"], "connector"], layout: round, paint: { "line-color": "#fff", "line-width": 1.6, "line-opacity": 0.9 } });
      m.addLayer({ id: "sparkles", type: "circle", source: "sparkles", paint: {
        "circle-radius": ["get", "r"], "circle-color": ["get", "color"], "circle-opacity": ["get", "o"], "circle-blur": 0.4,
      } });
      m.addLayer({ id: "head-glow", type: "circle", source: "head", paint: { "circle-radius": 16, "circle-color": "#ff2fb3", "circle-blur": 1, "circle-opacity": 0.9 } });
      m.addLayer({ id: "head-core", type: "circle", source: "head", paint: { "circle-radius": 4.5, "circle-color": "#fff" } });
      m.addLayer({ id: "events", type: "circle", source: "events", paint: {
        "circle-radius": 6, "circle-stroke-width": 2, "circle-stroke-color": "#1a1033",
        "circle-color": ["case", ["get", "passed"], "#ffe45c", "#6b5b9a"],
      } });
      // Lagren i OpenMapTiles-stilen: "water" är vattenytor, "transportation" är vägar och broar.
      const styleLayers = m.getStyle().layers as (maplibregl.LayerSpecification & { "source-layer"?: string })[];
      layerIds.current = {
        water: styleLayers.filter((l) => l["source-layer"] === "water" && l.type === "fill").map((l) => l.id),
        roads: styleLayers.filter((l) => l["source-layer"] === "transportation" && l.type === "line").map((l) => l.id),
      };
      res();
    }));
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hemposition
  useEffect(() => {
    const m = map.current!;
    homeMarker.current?.remove();
    const div = document.createElement("div");
    div.className = "home-marker";
    homeMarker.current = new maplibregl.Marker({ element: div }).setLngLat(center).addTo(m);
    if (!route) m.flyTo({ center, zoom: 12 });
  }, [center, route]);

  // Rutt + spöke, ritas fram i neon
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    ready.current?.then(() => {
      if (cancelled) return;
      const m = map.current!;
      const set = (id: string, data: GeoJSON.GeoJSON) => (m.getSource(id) as GeoJSONSource).setData(data);
      set("sparkles", empty);
      set("head", empty);
      if (!route) { set("ghost", empty); set("route", empty); return; }

      fitRoute(m, route, bottomInset, 1200);

      set("ghost", { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [route.ghost] } });
      showGhost(m, true, 0); // ny rutt: djuret syns direkt igen

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const segs = withLengths(route.segments);
      const total = segs.reduce((s, x) => s + x.len, 0);
      if (reduced || total === 0) {
        set("route", partialRoute(segs, total).fc);
        showGhost(m, false, 0);
        onDrawnRef.current?.();
        return;
      }

      let sparkles: Sparkle[] = [];
      const start = performance.now() + 900; // vänta in kartans inzoomning
      let finishedAt = 0;
      const tick = (now: number) => {
        if (cancelled) return;
        const t = Math.max(0, Math.min(1, (now - start) / DRAW_MS));
        const eased = t < 1 ? 1 - Math.pow(1 - t, 1.6) : 1;
        const { fc, head } = partialRoute(segs, eased * total);
        set("route", fc);

        if (t < 1 && head && now >= start) {
          set("head", { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: head } });
          for (let i = 0; i < 3; i++) sparkles.push(spark(m, head, now, 18));
        } else if (t >= 1 && !finishedAt) {
          finishedAt = now;
          set("head", empty);
          // Slutglitter längs hela rutten
          for (let i = 0; i < 70; i++) {
            const p = route.line[Math.floor(Math.random() * route.line.length)];
            sparkles.push(spark(m, p, now + Math.random() * 500, 6));
          }
          // Djuret har gjort sitt – tona ut konturen så att bara springrundan ligger kvar.
          showGhost(m, false, GHOST_FADE_MS);
          onDrawnRef.current?.();
        }

        sparkles = sparkles.filter((s) => now - s.born < SPARKLE_LIFE);
        set("sparkles", {
          type: "FeatureCollection",
          features: sparkles.filter((s) => now >= s.born).map((s) => {
            const age = (now - s.born) / SPARKLE_LIFE;
            const twinkle = 0.6 + 0.4 * Math.sin((now - s.born) / 40);
            return { type: "Feature", properties: { r: s.size * (1 - age * 0.6), o: (1 - age) * twinkle, color: s.color }, geometry: { type: "Point", coordinates: s.at } };
          }),
        });

        if (!finishedAt || sparkles.length) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => { cancelled = true; cancelAnimationFrame(raf); };
    // bottomInset ska inte rita om rutten
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  // Händelser
  useEffect(() => {
    ready.current?.then(() => {
      (map.current!.getSource("events") as GeoJSONSource).setData({
        type: "FeatureCollection",
        features: events.map((e) => ({ type: "Feature", properties: { passed: e.km <= passedKm, title: e.title }, geometry: { type: "Point", coordinates: e.at } })),
      });
    });
  }, [events, passedKm]);

  // Löparen: markören, kameran som följer med, och vattenkontrollen.
  useEffect(() => {
    const m = map.current!;
    if (!runner) {
      runnerMarker.current?.remove(); runnerMarker.current = null;
      inWater.current = false;
      following.current = false;
      return;
    }
    if (!runnerMarker.current) {
      const div = document.createElement("div");
      div.className = "runner-marker";
      // Ikonen ligger i ett inre element: maplibre flyttar markören med transform på yttre elementet.
      const icon = document.createElement("span");
      // Löparen är en lysande cyan plupp. I vatten får den krusningar runt sig.
      icon.className = "runner-icon";
      div.appendChild(icon);
      runnerMarker.current = new maplibregl.Marker({ element: div }).setLngLat(runner).addTo(m);
    } else runnerMarker.current.setLngLat(runner);
    runnerPos.current = runner;
    if (!follow) return;

    // Vatten under löparen? Kontrollera bara när kartan följer löparen, då är platsen ritad.
    const ids = layerIds.current;
    if (!ids.water.length || easing.current) return;
    const pt = m.project(runner);
    let wet = m.queryRenderedFeatures(pt, { layers: ids.water }).length > 0;
    if (wet && ids.roads.length) {
      // En bro över vattnet, eller en tunnel under det, räknas inte som simning.
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [[pt.x - 6, pt.y - 6], [pt.x + 6, pt.y + 6]];
      const dry = (f: maplibregl.MapGeoJSONFeature) => f.properties?.brunnel === "bridge" || f.properties?.brunnel === "tunnel";
      if (m.queryRenderedFeatures(box, { layers: ids.roads }).some(dry)) wet = false;
    }
    if (wet !== inWater.current) {
      inWater.current = wet;
      const icon = runnerMarker.current!.getElement().firstElementChild as HTMLElement;
      icon.classList.toggle("runner-icon--swim", wet);
      onWaterRef.current?.(wet);
    }
  }, [runner, route, follow]);

  // Den dämpade kameran (se CAMERA). Zoomar in mjukt och glider sedan efter löparen.
  useEffect(() => {
    const m = map.current;
    // Vid paus (trivia, peppning, simning) står kameran still. Den zoomar inte om när rundan
    // fortsätter, utan glider vidare därifrån.
    if (!m || !follow || !runnerPos.current) return;
    let raf = 0, last = 0, stopped = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = (now: number) => {
      if (stopped) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const target = runnerPos.current;
      if (target && dt > 0 && !easing.current) {
        const cam = m.project(m.getCenter());
        const run = m.project(target);
        const dx = run.x - cam.x, dy = run.y - cam.y;
        const d = Math.hypot(dx, dy);
        const minSide = Math.min(m.getContainer().clientWidth, m.getContainer().clientHeight);
        const dead = reduced ? CAMERA.REDUCED_DEAD_ZONE * minSide : CAMERA.DEAD_ZONE_PX;
        if (d > dead) {
          // Flytta bara den del som ligger utanför dödzonen, dämpat över tid.
          const catchUp = d > CAMERA.CATCH_UP_AT * minSide ? 3 : 1;
          const k = 1 - Math.exp((-dt * catchUp) / (reduced ? 0.5 : CAMERA.TAU_S));
          const f = ((d - dead) / d) * k;
          m.jumpTo({ center: m.unproject([cam.x + dx * f, cam.y + dy * f]) });
        }
      }
      raf = requestAnimationFrame(tick);
    };

    if (!following.current) {
      following.current = true;
      easing.current = true;
      m.easeTo({ center: runnerPos.current, zoom: followZoom, padding: { top: 70, bottom: bottomInset, left: 0, right: 0 }, duration: 900 });
      m.once("moveend", () => { easing.current = false; });
    }
    raf = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, [follow, followZoom, bottomInset]);

  // Visa hela rutten igen när rundan är slut.
  useEffect(() => {
    if (!overview || !route) return;
    ready.current?.then(() => {
      following.current = false;
      fitRoute(map.current!, route, bottomInset, 1200);
    });
  }, [overview, route, bottomInset]);

  return <div ref={el} className="map" />;
}

/** Passa in hela rutten och spöket i bild. */
function fitRoute(m: maplibregl.Map, route: GeneratedRoute, bottomInset: number, duration: number) {
  const all = [...route.line, ...route.ghost];
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const wide = window.innerWidth > 760;
  m.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
  m.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], {
    padding: { top: 80, bottom: 40 + bottomInset, left: wide ? 480 : 32, right: wide ? 60 : 32 }, duration,
  });
}

/** Visa eller tona ut djurets kontur (spöket) med en mjuk övergång på `ms` millisekunder. */
function showGhost(m: maplibregl.Map, visible: boolean, ms: number) {
  const transition = { duration: ms, delay: 0 };
  m.setPaintProperty("ghost-fill", "fill-opacity-transition", transition);
  m.setPaintProperty("ghost-line", "line-opacity-transition", transition);
  m.setPaintProperty("ghost-fill", "fill-opacity", visible ? GHOST_FILL_OPACITY : 0);
  m.setPaintProperty("ghost-line", "line-opacity", visible ? GHOST_LINE_OPACITY : 0);
}

/** En gnista nära `at`, slumpat inom `spreadPx` pixlar. */
function spark(m: maplibregl.Map, at: LngLat, born: number, spreadPx: number): Sparkle {
  const p = m.project(at);
  const a = Math.random() * Math.PI * 2, r = Math.random() * spreadPx;
  const q = m.unproject([p.x + Math.cos(a) * r, p.y + Math.sin(a) * r]);
  return {
    at: [q.lng, q.lat], born,
    size: 1.5 + Math.random() * 3.5,
    color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
  };
}

interface MeasuredSegment extends Segment { cum: number[]; len: number }

function withLengths(segments: Segment[]): MeasuredSegment[] {
  return segments.map((s) => {
    const cum = [0];
    for (let i = 1; i < s.coordinates.length; i++) cum.push(cum[i - 1] + haversine(s.coordinates[i - 1], s.coordinates[i]));
    return { ...s, cum, len: cum[cum.length - 1] };
  });
}

/** Rutten fram till `dist` meter, plus spetsens position. */
function partialRoute(segs: MeasuredSegment[], dist: number) {
  const features: GeoJSON.Feature[] = [];
  let left = dist;
  let head: LngLat | null = null;
  for (const s of segs) {
    if (left <= 0) break;
    let coords = s.coordinates;
    if (left < s.len) {
      let i = 1;
      while (i < s.cum.length && s.cum[i] < left) i++;
      const a = s.coordinates[i - 1], b = s.coordinates[i];
      const t = (left - s.cum[i - 1]) / (s.cum[i] - s.cum[i - 1] || 1);
      const tip: LngLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      coords = [...s.coordinates.slice(0, i), tip];
    }
    if (coords.length >= 2) features.push({ type: "Feature", properties: { kind: s.kind }, geometry: { type: "LineString", coordinates: coords } });
    head = coords[coords.length - 1];
    left -= s.len;
  }
  return { fc: { type: "FeatureCollection" as const, features }, head };
}
