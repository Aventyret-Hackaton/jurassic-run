import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimalArt, animalBg } from "./components/AnimalArt";
import { ChuckOnDodo } from "./components/ChuckOnDodo";
import { FinalReport } from "./components/FinalReport";
import { PepTalk } from "./components/PepTalk";
import { StartIntro } from "./components/StartIntro";
import { SwimNotice } from "./components/SwimNotice";
import { TriviaOverlay } from "./components/TriviaOverlay";
import { Logo } from "./components/Logo";
import { MapView } from "./components/MapView";
import { ANIMALS, type Animal } from "./data/animals";
import { CITIES } from "./data/cities";
import { chuckFact, coachLines, START_LINES, type CoachLine } from "./lib/coach";
import { fetchEvents, type RouteEvent } from "./lib/events";
import { generateRoute, type GeneratedRoute } from "./lib/generate";
import { pepLines, pepStops, type Pep } from "./lib/pep";
import type { LngLat } from "./lib/shape";
import { requestMotionPermission, useShake } from "./lib/shake";
import { getSilhouette } from "./lib/silhouettes";
import { useRunner } from "./lib/useRunner";
import { pickSwimLine } from "./lib/swim";
import { currentWeather, type Weather } from "./lib/weather";

/** Wizardens steg. "run" är kartvyn med rutt, löpning och slutrapport. */
type Step = "start" | "where" | "animal" | "run";
type Phase = "generating" | "drawing" | "ready" | "done";

interface Place { at: LngLat; label: string }

/** Ett stopp under löpningen: en trivia eller en peppning från Chuck. */
interface Stop { key: string; kind: "trivia" | "pep" | "swim"; i: number; km: number }

/** Minsta avstånd (km) mellan två simstopp, så att bryggor och små vikar inte ger ett stopp var tionde meter. */
const SWIM_GAP_KM = 0.3;
/** Så här många pixlar per sekund ska kartan glida förbi när den följer löparen. */
const FOLLOW_PX_PER_SEC = 110;

/** Städerna i fråga 1 (Stockholm finns kvar i CITIES för ?city=stockholm). */
const WIZARD_CITIES = CITIES.filter((c) => c.name !== "Stockholm");
const HERE_LABEL = "Där du är";
/** Spellista att springa till. Sätt VITE_SPOTIFY_PLAYLIST_URL i .env.local för en egen lista. */
const SPOTIFY_URL = import.meta.env.VITE_SPOTIFY_PLAYLIST_URL || "https://open.spotify.com/playlist/3x1oOTAOLiGQHkC4X1Get2?si=3ce0e0eec69f402e&pt=e64f5f1b148e611130771ee122110a83";

function initialPlace(): Place | null {
  const q = new URLSearchParams(location.search);
  const lat = parseFloat(q.get("lat") ?? ""), lng = parseFloat(q.get("lng") ?? "");
  if (!isNaN(lat) && !isNaN(lng)) return { at: [lng, lat], label: "Simulerad plats" };
  const city = CITIES.find((c) => c.name.toLowerCase() === q.get("city")?.toLowerCase());
  return city ? { at: city.at, label: city.name } : null;
}

export default function App() {
  const [step, setStep] = useState<Step>("start");
  const [place, setPlace] = useState<Place | null>(initialPlace);
  const [locating, setLocating] = useState(false);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [phase, setPhase] = useState<Phase>("generating");
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [route, setRoute] = useState<GeneratedRoute | null>(null);
  const [events, setEvents] = useState<RouteEvent[]>([]);
  const [lines, setLines] = useState<CoachLine[]>([]);
  const [intro, setIntro] = useState(START_LINES[0]);
  const [weather, setWeather] = useState<(Weather | null)[]>([]);
  const [peps, setPeps] = useState<Pep[]>([]);
  /** Stoppet som visas just nu, och nycklarna för de stopp som redan visats. */
  const [active, setActive] = useState<Stop | null>(null);
  const seen = useRef(new Set<string>());
  /** Simning: repliken som visas, var förra simstoppet var och vilka repliker som använts. */
  const [swimLine, setSwimLine] = useState("");
  const lastSwimKm = useRef(-Infinity);
  const usedSwimLines = useRef(new Set<number>());
  /** Introt på startskärmen spelas bara första gången. */
  const introPlayed = useRef(false);
  const [duration, setDuration] = useState(30);
  const runner = useRunner(phase === "ready" || phase === "done" ? route?.line ?? null : null, duration);

  // Vädret för städerna i platsväljaren (en gång).
  useEffect(() => {
    currentWeather(WIZARD_CITIES.map((c) => c.at)).then(setWeather).catch(() => setWeather([]));
  }, []);

  const stops = useMemo<Stop[]>(() => [
    ...events.map((e, i) => ({ key: `t${i}`, kind: "trivia" as const, i, km: e.km })),
    ...peps.map((p, i) => ({ key: `p${i}`, kind: "pep" as const, i, km: p.km })),
  ].sort((a, b) => a.km - b.km), [events, peps]);

  // Pausa och visa trivia eller peppning när löparen når nästa stopp.
  useEffect(() => {
    if (phase !== "ready" || active !== null) return;
    const next = stops.find((s) => !seen.current.has(s.key) && s.km <= runner.km);
    if (next) { runner.pause(); seen.current.add(next.key); setActive(next); }
  }, [runner.km, stops, phase, active, runner]);

  useEffect(() => {
    if (runner.progress >= 1 && phase === "ready" && active === null) setPhase("done");
  }, [runner.progress, phase, active]);

  /** Spola: stopp före den nya positionen räknas som visade, de efter visas igen. */
  const seek = (p: number) => {
    const km = p * runner.totalKm;
    seen.current = new Set(stops.flatMap((s) => (s.km < km ? [s.key] : [])));
    lastSwimKm.current = -Infinity;
    runner.seek(p);
  };
  const resume = () => { setActive(null); if (runner.progress < 1) runner.play(); };
  const runAgain = () => { seen.current = new Set(); lastSwimKm.current = -Infinity; runner.seek(0); setPhase("ready"); };

  /** Kartan säger till när löparen går ut i vatten. Då pausar rundan och Chuck säger sitt. */
  const onWaterChange = (wet: boolean) => {
    if (!wet || !runner.playing || phase !== "ready" || active !== null) return;
    if (runner.km - lastSwimKm.current < SWIM_GAP_KM) return;
    runner.pause();
    lastSwimKm.current = runner.km;
    setSwimLine(pickSwimLine(usedSwimLines.current));
    setActive({ key: `s${runner.km.toFixed(2)}`, kind: "swim", i: 0, km: runner.km });
  };

  // Zoomnivå när kartan följer löparen: snabb uppspelning ger mindre inzoomning,
  // så att kartan hinner rita och man ser vart löparen är på väg.
  const followZoom = (() => {
    if (!route) return 15;
    const metersPerSec = route.distance / duration;
    const metersPerPx = metersPerSec / FOLLOW_PX_PER_SEC;
    const lat = route.line[0][1];
    const z = Math.log2((156543 * Math.cos((lat * Math.PI) / 180)) / metersPerPx);
    return Math.min(16.5, Math.max(12.5, z));
  })();

  const pickHere = () => {
    requestMotionPermission();
    setError(""); setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); setPlace({ at: [p.coords.longitude, p.coords.latitude], label: HERE_LABEL }); setStep("animal"); },
      (e) => { setLocating(false); setError(`Chuck hittar dig inte: ${e.message}. Välj en stad i stället.`); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const pickCity = (c: { name: string; at: LngLat }) => { requestMotionPermission(); setError(""); setPlace({ at: c.at, label: c.name }); setStep("animal"); };

  const surprise = () => {
    const pool = ANIMALS.filter((a) => getSilhouette(a.id) && a.id !== animal?.id);
    setAnimal(pool[Math.floor(Math.random() * pool.length)]);
  };

  // Skaka telefonen i djurvalet = "Överraska mig". Kortet gungar till som kvitto.
  const [shook, setShook] = useState(false);
  const canShake = useShake(step === "animal", () => {
    surprise();
    setShook(true);
    setTimeout(() => setShook(false), 500);
  });

  const generate = async () => {
    if (!animal || !place) return;
    setStep("run"); setPhase("generating"); setError(""); setLog([]); setRoute(null); setEvents([]); setLines([]);
    try {
      const r = await generateRoute({ animal, mode: "foot", origin: place.at, onProgress: (m) => setLog((l) => [...l, m]) });
      setLog((l) => [...l, "Letar trivia längs rutten i Wikidata…"]);
      const ev = await fetchEvents(r.line);
      setLog((l) => [...l, `${ev.length} trivia hittade. Coach Chuck förbereder sig…`]);
      const [c, joke] = await Promise.all([coachLines(animal.name, ev), chuckFact()]);
      seen.current = new Set(); setActive(null);
      setEvents(ev); setLines(c.lines); setIntro(joke);
      const totalKm = r.distance / 1000;
      setPeps(pepLines(pepStops(totalKm, ev.map((e) => e.km)), totalKm, animal.name));
      lastSwimKm.current = -Infinity; usedSwimLines.current = new Set();
      setRoute(r); setPhase("drawing");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("animal");
    }
  };

  const restart = () => { setRoute(null); setEvents([]); setPeps([]); setLines([]); setActive(null); setStep("where"); };

  /** Chucks kommentar till en trivia: närmaste rad på samma km. */
  const lineFor = (e: RouteEvent) =>
    lines.reduce<CoachLine | null>((best, l) => (!best || Math.abs(l.km - e.km) < Math.abs(best.km - e.km) ? l : best), null)?.line ?? intro;

  const mapCenter: LngLat = place?.at ?? CITIES[0].at;
  const shown = step === "run" && (phase === "ready" || phase === "done");

  return (
    <div className="app">
      <MapView
        center={mapCenter}
        route={step === "run" ? route : null}
        runner={shown ? runner.position : null}
        events={shown ? events : []}
        passedKm={runner.km}
        onDrawn={() => setPhase((p) => (p === "drawing" ? "ready" : p))}
        bottomInset={260}
        follow={step === "run" && phase === "ready" && runner.playing}
        followZoom={followZoom}
        overview={step === "run" && phase === "done"}
        onWaterChange={onWaterChange}
      />

      {/* ---------- Startskärm ---------- */}
      {step === "start" && (
        <StartIntro
          playIntro={!introPlayed.current}
          onStart={() => { requestMotionPermission(); introPlayed.current = true; setStep("where"); }}
        />
      )}

      {/* ---------- Fråga 1: var ---------- */}
      {step === "where" && (
        <main className="screen" key="where">
          <TopBar step={1} onBack={() => setStep("start")} />
          <Coach question="Var vill du springa, soldat?" headshot />
          <div className="choices">
            <button className="choice choice--here" onClick={pickHere} disabled={locating}>
              <span className="choice-icon">📍</span>
              <span>{locating ? "Letar efter dig…" : HERE_LABEL}</span>
            </button>
            {WIZARD_CITIES.map((c, i) => (
              <button key={c.name} className={`choice ${place?.label === c.name ? "on" : ""}`} onClick={() => pickCity(c)}>
                <span>{c.name}</span>
                {weather[i] && (
                  <span className="choice-weather" title={weather[i]!.label}>
                    <span aria-hidden>{weather[i]!.icon}</span> {weather[i]!.temp}° <small>{weather[i]!.wind} m/s</small>
                  </span>
                )}
                <span className="choice-arrow" aria-hidden>›</span>
              </button>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
        </main>
      )}

      {/* ---------- Fråga 2: vilket djur ---------- */}
      {step === "animal" && (
        <main className="screen screen--animal" key="animal">
          <TopBar step={2} onBack={() => setStep("where")} />
          <Coach question="Vilket djur vill du springa?" note={place ? `Start: ${place.label}` : undefined} />
          <div className="animal-grid">
            <button className={`animal-card animal-card--surprise ${shook ? "shaken" : ""}`} onClick={surprise} style={{ "--panel": "#22e6ff" } as React.CSSProperties}>
              <span className="animal-panel" aria-hidden />
              <span className="surprise-mark" aria-hidden>?</span>
              <span className="animal-caption">
                <span className="animal-name">Överraska mig</span>
                <span className="animal-km">{canShake ? "Tryck eller skaka 📳" : "Chuck väljer"}</span>
              </span>
            </button>
            {ANIMALS.map((a) => {
              const ok = !!getSilhouette(a.id);
              return (
                <button
                  key={a.id}
                  className={`animal-card ${animal?.id === a.id ? "on" : ""}`}
                  disabled={!ok}
                  onClick={() => setAnimal(a)}
                  style={{ "--panel": animalBg(a.id) } as React.CSSProperties}
                >
                  <span className="animal-panel" aria-hidden />
                  <AnimalArt id={a.id} fallback={a.emoji} />
                  <span className="animal-caption">
                    <span className="animal-name">{a.name}</span>
                    <span className="animal-km">{ok ? `${a.baseKm} km` : "silhuett saknas"}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {animal && (
            <div className="sheet sheet--pick" key={animal.id}>
              <div className="pick-head">
                <AnimalArt id={animal.id} fallback={animal.emoji} className="pick-art" />
                <div>
                  <strong>{animal.name}</strong>
                  <em>{animal.scientific}</em>
                  <span className="pick-meta">{animal.baseKm} km · utdöd {animal.extinct}</span>
                </div>
              </div>
              <p className="pick-fact">{animal.fact}</p>
              {error && <p className="error">{error}</p>}
              <button className="btn-neon" onClick={generate}>Rita min runda</button>
            </div>
          )}
        </main>
      )}

      {/* ---------- Karta: generering, neonritning, löpning ---------- */}
      {step === "run" && (
        <>
          <header className="map-top">
            <Logo compact />
            <button className="btn-ghost" onClick={restart}>Ny runda</button>
          </header>

          {phase === "generating" && (
            <div className="generating">
              <ChuckOnDodo size={150} className="bob" />
              <p className="generating-title">Chuck ritar din {animal?.name.toLowerCase()}…</p>
              <ul className="log">{log.slice(-4).map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          )}

          {phase === "drawing" && <p className="drawing-hint">✨ Neonritning pågår ✨</p>}

          {route && shown && (
            <section className="sheet sheet--run">
              <a className="spotify" href={SPOTIFY_URL} target="_blank" rel="noreferrer">
                <span className="spotify-icon" aria-hidden>🎧</span>
                <span><strong>Soundtrack: Utdöda hits</strong><small>Öppna spellistan i Spotify</small></span>
                <span className="choice-arrow" aria-hidden>›</span>
              </a>
              <div className="stats">
                <div className="stat stat--accent"><span className="big">{Math.round(route.accuracy * 100)}%</span><span>Silhouette Accuracy</span></div>
                <div className="stat"><span className="big">{(route.distance / 1000).toFixed(1)}</span><span>km</span></div>
                <div className="stat"><span className="big">{events.length}</span><span>trivia</span></div>
              </div>

              {(phase === "ready" || phase === "done") && (
                <>
                  <button className="btn-neon" onClick={runner.playing ? runner.pause : runner.play}>
                    {runner.playing ? "❚❚ Pausa" : runner.progress > 0 ? "▶ Fortsätt" : "▶ Spring!"}
                  </button>
                  <input className="progress" type="range" min={0} max={1000} value={runner.progress * 1000} onChange={(e) => seek(+e.target.value / 1000)} aria-label="Position i rundan" />
                  <div className="run-meta">
                    <span>{runner.km.toFixed(1)} / {runner.totalKm.toFixed(1)} km</span>
                    <label>
                      Uppspelning {duration} s
                      <input type="range" min={5} max={180} value={duration} onChange={(e) => setDuration(+e.target.value)} />
                    </label>
                  </div>
                </>
              )}

            </section>
          )}

          {active?.kind === "trivia" && events[active.i] && (
            <TriviaOverlay
              event={events[active.i]}
              index={active.i}
              total={events.length}
              coachLine={lineFor(events[active.i])}
              onContinue={resume}
            />
          )}

          {active?.kind === "swim" && (
            <SwimNotice line={swimLine} km={active.km} onJump={resume} />
          )}

          {active?.kind === "pep" && peps[active.i] && (
            <PepTalk line={peps[active.i].line} km={peps[active.i].km} onThanks={resume} />
          )}

          {phase === "done" && active === null && route && animal && (
            <FinalReport
              route={route}
              animal={animal}
              km={runner.totalKm}
              trivia={events.length}
              wisdom={intro}
              onAgain={runAgain}
              onNew={restart}
            />
          )}
        </>
      )}
    </div>
  );
}

function TopBar({ step, onBack }: { step: number; onBack: () => void }) {
  return (
    <header className="topbar">
      <button className="back" onClick={onBack} aria-label="Tillbaka">‹</button>
      <Logo compact />
      <span className="step-count">{step}/2</span>
    </header>
  );
}

function Coach({ question, note, headshot }: { question: string; note?: string; headshot?: boolean }) {
  return (
    <div className="coach-ask">
      {headshot ? (
        // Närbild: bara Chucks huvud, och dronten tittar upp i hörnet.
        <div className="coach-head">
          <ChuckOnDodo crop="head" size={190} className="bob" />
          <ChuckOnDodo crop="dodo" size={92} className="coach-head-dodo" />
        </div>
      ) : (
        <ChuckOnDodo size={150} className="bob" />
      )}
      <div className="speech">
        <p>{question}</p>
        {note && <small>{note}</small>}
      </div>
    </div>
  );
}
