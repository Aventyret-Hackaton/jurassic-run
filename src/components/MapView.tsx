import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { RouteEvent } from "../lib/events";
import type { GeneratedRoute, Segment } from "../lib/generate";
import { haversine, type LngLat } from "../lib/shape";

const STYLE = "https://tiles.openfreemap.org/styles/dark";
const empty = { type: "FeatureCollection" as const, features: [] };

const DRAW_MS = 3200; // hur länge neonrutten ritas fram
const SPARKLE_LIFE = 750;
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
}

interface Sparkle { at: LngLat; born: number; size: number; color: string }

export function MapView({ center, route, runner, events, passedKm, onDrawn, bottomInset = 0 }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const ready = useRef<Promise<void> | null>(null);
  const runnerMarker = useRef<maplibregl.Marker | null>(null);
  const homeMarker = useRef<maplibregl.Marker | null>(null);
  const onDrawnRef = useRef(onDrawn);
  onDrawnRef.current = onDrawn;

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
      m.addLayer({ id: "ghost-fill", type: "fill", source: "ghost", paint: { "fill-color": "#9b2cf0", "fill-opacity": 0.14 } });
      m.addLayer({ id: "ghost-line", type: "line", source: "ghost", paint: { "line-color": "#22e6ff", "line-opacity": 0.5, "line-width": 1.2, "line-dasharray": [2, 3] } });
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

      const all = [...route.line, ...route.ghost];
      const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
      const wide = window.innerWidth > 760;
      m.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], {
        padding: { top: 80, bottom: 40 + bottomInset, left: wide ? 480 : 32, right: wide ? 60 : 32 }, duration: 1200,
      });

      set("ghost", { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [route.ghost] } });

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const segs = withLengths(route.segments);
      const total = segs.reduce((s, x) => s + x.len, 0);
      if (reduced || total === 0) {
        set("route", partialRoute(segs, total).fc);
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

  // Löparen
  useEffect(() => {
    const m = map.current!;
    if (!runner) { runnerMarker.current?.remove(); runnerMarker.current = null; return; }
    if (!runnerMarker.current) {
      const div = document.createElement("div");
      div.className = "runner-marker";
      div.textContent = route?.animal.emoji ?? "🏃";
      runnerMarker.current = new maplibregl.Marker({ element: div }).setLngLat(runner).addTo(m);
    } else runnerMarker.current.setLngLat(runner);
  }, [runner, route]);

  return <div ref={el} className="map" />;
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
