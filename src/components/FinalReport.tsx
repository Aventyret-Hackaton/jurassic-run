import type { Animal } from "../data/animals";
import type { GeneratedRoute } from "../lib/generate";
import { AnimalArt } from "./AnimalArt";
import { ChuckOnDodo } from "./ChuckOnDodo";
import { NeonConfetti } from "./NeonConfetti";

interface Props {
  route: GeneratedRoute;
  animal: Animal;
  km: number;
  trivia: number;
  wisdom: string;
  onAgain: () => void;
  onNew: () => void;
}

/** Slutrapporten som egen modal med neonkonfetti. */
export function FinalReport({ route, animal, km, trivia, wisdom, onAgain, onNew }: Props) {
  const accuracy = Math.round(route.accuracy * 100);
  return (
    <div className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <NeonConfetti />
      <div className="report-card">
        <p className="report-kicker">Game over · Mission complete</p>
        <h2 id="report-title" className="report-title">
          {["RUNDAN", "KLAR!"].map((w) => (
            <span key={w} className="report-word">{w.split("").map((ch, i) => <span key={i} className="report-chrome">{ch}</span>)}</span>
          ))}
        </h2>

        <div className="report-hero">
          <AnimalArt id={animal.id} fallback={animal.emoji} className="report-art" />
          <div>
            <span className="report-animal">{animal.name}</span>
            <span className="report-place">i {route.country}</span>
          </div>
        </div>

        <div className="report-grid">
          <Tile big={`${accuracy}%`} label="Silhouette Accuracy" accent grade={grade(accuracy)} />
          <Tile big={km.toFixed(1)} label="kilometer" />
          <Tile big={Math.round(km * 65).toLocaleString("sv-SE")} label="kcal brända" />
          <Tile big={String(trivia)} label="trivia upplevda" />
        </div>

        <ul className="report-facts">
          <li><span>⏱</span><span>I verkligheten tar rundan ca <strong>{formatDuration(km)}</strong>.</span></li>
          <li><span>💀</span><span>{animal.name} har varit utdöd i <strong>{animal.extinctYearsAgo.toLocaleString("sv-SE")} år</strong>. Du har en bit kvar.</span></li>
        </ul>

        <div className="report-chuck">
          <ChuckOnDodo size={90} className="bob" />
          <div className="speech speech--left"><p>{wisdom}</p><small>Chucks visdomsord</small></div>
        </div>

        <div className="report-actions">
          <button className="btn-ghost" onClick={onAgain}>Spring igen</button>
          <button className="btn-neon" onClick={onNew}>Ny runda</button>
        </div>
      </div>
    </div>
  );
}

function Tile({ big, label, accent, grade }: { big: string; label: string; accent?: boolean; grade?: string }) {
  return (
    <div className={`report-tile ${accent ? "report-tile--accent" : ""}`}>
      {grade && <span className="report-grade">{grade}</span>}
      <span className="report-big">{big}</span>
      <span className="report-label">{label}</span>
    </div>
  );
}

/** Betyg som i ett arkadspel. */
function grade(acc: number) {
  return acc >= 90 ? "S" : acc >= 80 ? "A" : acc >= 70 ? "B" : acc >= 55 ? "C" : "D";
}

function formatDuration(km: number) {
  const hours = km / 10;
  const h = Math.floor(hours), m = Math.round((hours - h) * 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}
