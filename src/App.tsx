import { useEffect, useMemo, useState } from "react";
import { AnimalPicker } from "./components/AnimalPicker";
import { ChuckAvatar } from "./components/ChuckAvatar";
import { MapView } from "./components/MapView";
import type { Animal } from "./data/animals";
import { CITIES } from "./data/cities";
import { chuckFact, coachLines, START_LINES, type CoachLine } from "./lib/coach";
import { fetchEvents, type RouteEvent } from "./lib/events";
import { generateRoute, type GeneratedRoute, type Mode } from "./lib/generate";
import type { LngLat } from "./lib/shape";
import { getSilhouette } from "./lib/silhouettes";
import { useRunner } from "./lib/useRunner";

type Phase = "setup" | "generating" | "ready" | "done";

function initialLocation(): { at: LngLat; label: string } {
  const q = new URLSearchParams(location.search);
  const lat = parseFloat(q.get("lat") ?? ""), lng = parseFloat(q.get("lng") ?? "");
  if (!isNaN(lat) && !isNaN(lng)) return { at: [lng, lat], label: "Simulerad plats" };
  const city = CITIES.find((c) => c.name.toLowerCase() === q.get("city")?.toLowerCase()) ?? CITIES[0];
  return { at: city.at, label: city.name };
}

export default function App() {
  const [loc, setLoc] = useState(initialLocation);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [fact, setFact] = useState<string>("");
  const [mode, setMode] = useState<Mode>("foot");
  const [phase, setPhase] = useState<Phase>("setup");
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [route, setRoute] = useState<GeneratedRoute | null>(null);
  const [events, setEvents] = useState<RouteEvent[]>([]);
  const [lines, setLines] = useState<CoachLine[]>([]);
  const [coachSource, setCoachSource] = useState("");
  const [intro, setIntro] = useState(START_LINES[0]);
  const [duration, setDuration] = useState(30);
  const runner = useRunner(route?.line ?? null, duration);

  // Fakta från Wikipedia när ett djur väljs.
  useEffect(() => {
    if (!animal) return;
    setFact("");
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(animal.wiki)}`)
      .then((r) => r.json())
      .then((d) => setFact(d.extract ?? ""))
      .catch(() => setFact(""));
  }, [animal]);

  useEffect(() => { if (runner.progress >= 1 && phase === "ready") setPhase("done"); }, [runner.progress, phase]);

  const useMyPosition = () => {
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ at: [p.coords.longitude, p.coords.latitude], label: "Min position" }),
      (e) => setError(`Kunde inte hämta position: ${e.message}`),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const generate = async () => {
    if (!animal) return;
    setPhase("generating"); setError(""); setLog([]); setRoute(null); setEvents([]); setLines([]);
    try {
      const r = await generateRoute({ animal, mode, origin: loc.at, onProgress: (m) => setLog((l) => [...l, m]) });
      setRoute(r);
      setLog((l) => [...l, "Hämtar händelser längs rutten…"]);
      const ev = await fetchEvents(r.line, mode);
      setEvents(ev);
      setLog((l) => [...l, `${ev.length} händelser hittade. Coach Chuck förbereder sig…`]);
      const [c, joke] = await Promise.all([coachLines(animal.name, ev), chuckFact()]);
      setLines(c.lines); setCoachSource(c.source); setIntro(joke);
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("setup");
    }
  };

  const currentLine = useMemo(() => {
    const passed = lines.filter((l) => l.km <= runner.km);
    return passed.length ? passed[passed.length - 1].line : intro;
  }, [lines, runner.km, intro]);
  const currentEvent = useMemo(() => events.filter((e) => e.km <= runner.km).at(-1), [events, runner.km]);

  return (
    <div className="app">
      <MapView center={loc.at} route={route} runner={runner.position} events={events} passedKm={runner.km} />

      <aside className="panel">
        <header className="brand">
          <h1>Jurassic Run</h1>
          <p>Run like there's no tomorrow! 🦖</p>
        </header>

        {(phase === "setup" || phase === "generating") && (
          <>
            <section>
              <h2>1. Var står du?</h2>
              <div className="chips">
                {CITIES.map((c) => (
                  <button key={c.name} className={`chip ${loc.label === c.name ? "on" : ""}`} onClick={() => setLoc({ at: c.at, label: c.name })}>{c.name}</button>
                ))}
                <button className={`chip ${loc.label === "Min position" ? "on" : ""}`} onClick={useMyPosition}>📍 Min position</button>
              </div>
            </section>

            <section>
              <h2>2. Färdsätt</h2>
              <div className="toggle">
                <button className={mode === "foot" ? "on" : ""} onClick={() => setMode("foot")}>🏃 Gång</button>
                <button className={mode === "car" ? "on" : ""} onClick={() => setMode("car")}>🚗 Bil (×10)</button>
              </div>
            </section>

            <section>
              <h2>3. Välj ett utdött djur</h2>
              <AnimalPicker selected={animal} mode={mode} onSelect={setAnimal} />
              {animal && (
                <div className="fact">
                  <strong>{animal.name}</strong> <em>{animal.scientific}</em>
                  <span className="extinct">Utdöd: {animal.extinct}</span>
                  {fact && <p>{fact}</p>}
                  {getSilhouette(animal.id)?.credit && <small>Silhuett: {getSilhouette(animal.id)?.credit} ({getSilhouette(animal.id)?.license})</small>}
                </div>
              )}
            </section>

            <button className="primary" disabled={!animal || phase === "generating"} onClick={generate}>
              {phase === "generating" ? "Genererar…" : "Generera runda"}
            </button>
            {log.length > 0 && <ul className="log">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>}
            {error && <p className="error">{error}</p>}
          </>
        )}

        {route && phase !== "setup" && phase !== "generating" && (
          <>
            <section className="stats">
              <div className="accuracy">
                <span className="big">{Math.round(route.accuracy * 100)} %</span>
                <span>Silhouette Accuracy</span>
              </div>
              <div><span className="big">{(route.distance / 1000).toFixed(1)}</span><span>km</span></div>
              <div><span className="big">{events.length}</span><span>händelser</span></div>
            </section>

            <section>
              <div className="controls">
                <button className="primary" onClick={runner.playing ? runner.pause : runner.play}>
                  {runner.playing ? "⏸ Pausa" : runner.progress > 0 && runner.progress < 1 ? "▶ Fortsätt" : "▶ Spring!"}
                </button>
                <label>
                  Hela rundan på <strong>{duration} s</strong>
                  <input type="range" min={5} max={180} value={duration} onChange={(e) => setDuration(+e.target.value)} />
                </label>
              </div>
              <input className="progress" type="range" min={0} max={1000} value={runner.progress * 1000} onChange={(e) => runner.seek(+e.target.value / 1000)} />
              <p className="km">{runner.km.toFixed(1)} / {runner.totalKm.toFixed(1)} km</p>
            </section>

            {phase === "done" && (
              <section className="report">
                <h2>Slutrapport</h2>
                <ul>
                  <li>Distans: {runner.totalKm.toFixed(1)} km i {route.country}</li>
                  <li>Silhouette Accuracy: {Math.round(route.accuracy * 100)} %</li>
                  <li>Kalorier: {Math.round(runner.totalKm * (mode === "car" ? 3 : 65))} kcal{mode === "car" ? " (mest bensin)" : ""}</li>
                  <li>Händelser passerade: {events.length}</li>
                  <li>{animal?.name} har varit utdöd i {animal?.extinctYearsAgo.toLocaleString("sv-SE")} år. Din runda tog {formatDuration(runner.totalKm, mode)}.</li>
                </ul>
                <button onClick={() => { setPhase("setup"); setRoute(null); setEvents([]); }}>Ny runda</button>
              </section>
            )}
          </>
        )}
      </aside>

      {(phase === "ready" || phase === "done") && (
        <div className="coach">
          <ChuckAvatar />
          <div className="bubble">
            {currentEvent && runner.progress > 0 && <small>{currentEvent.title} – {currentEvent.text}</small>}
            <p>{currentLine}</p>
            <small className="muted">Coach Chuck · {coachSource === "claude" ? "Claude" : "mallar"}</small>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(km: number, mode: Mode) {
  const hours = km / (mode === "car" ? 50 : 10);
  const h = Math.floor(hours), m = Math.round((hours - h) * 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}
