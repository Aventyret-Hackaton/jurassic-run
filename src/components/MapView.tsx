import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { RouteEvent } from "../lib/events";
import type { GeneratedRoute } from "../lib/generate";
import type { LngLat } from "../lib/shape";

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const empty = { type: "FeatureCollection" as const, features: [] };

interface Props {
  center: LngLat;
  route: GeneratedRoute | null;
  runner: LngLat | null;
  events: RouteEvent[];
  passedKm: number;
}

export function MapView({ center, route, runner, events, passedKm }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const ready = useRef<Promise<void> | null>(null);
  const runnerMarker = useRef<maplibregl.Marker | null>(null);
  const homeMarker = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const m = new maplibregl.Map({ container: el.current!, style: STYLE, center, zoom: 11, attributionControl: { compact: true } });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current = m;
    ready.current = new Promise((res) => m.on("load", () => {
      m.addSource("ghost", { type: "geojson", data: empty });
      m.addSource("route", { type: "geojson", data: empty });
      m.addSource("events", { type: "geojson", data: empty });
      m.addLayer({ id: "ghost-fill", type: "fill", source: "ghost", paint: { "fill-color": "#f2b33d", "fill-opacity": 0.12 } });
      m.addLayer({ id: "ghost-line", type: "line", source: "ghost", paint: { "line-color": "#c98a12", "line-width": 1.5, "line-dasharray": [2, 2] } });
      m.addLayer({ id: "route-casing", type: "line", source: "route", filter: ["==", ["get", "kind"], "road"], layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#fff", "line-width": 7 } });
      m.addLayer({ id: "route-road", type: "line", source: "route", filter: ["==", ["get", "kind"], "road"], layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#1f5c3a", "line-width": 4 } });
      m.addLayer({ id: "route-terrain", type: "line", source: "route", filter: ["==", ["get", "kind"], "terrain"], paint: { "line-color": "#8a5a2b", "line-width": 3, "line-dasharray": [1.5, 1.5] } });
      m.addLayer({ id: "route-connector", type: "line", source: "route", filter: ["==", ["get", "kind"], "connector"], paint: { "line-color": "#7a7a7a", "line-width": 2, "line-dasharray": [0.5, 2] } });
      m.addLayer({ id: "events", type: "circle", source: "events", paint: {
        "circle-radius": 6, "circle-stroke-width": 2, "circle-stroke-color": "#fff",
        "circle-color": ["case", ["get", "passed"], "#d9480f", "#adb5bd"],
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

  // Rutt + spöke
  useEffect(() => {
    ready.current?.then(() => {
      const m = map.current!;
      (m.getSource("ghost") as GeoJSONSource).setData(route
        ? { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [route.ghost] } }
        : empty);
      (m.getSource("route") as GeoJSONSource).setData({
        type: "FeatureCollection",
        features: (route?.segments ?? []).map((s) => ({ type: "Feature", properties: { kind: s.kind }, geometry: { type: "LineString", coordinates: s.coordinates } })),
      });
      if (route) {
        const all = [...route.line, ...route.ghost];
        const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
        m.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: window.innerWidth > 760 ? { top: 60, bottom: 120, left: 440, right: 60 } : 40, duration: 1200 });
      }
    });
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
