import { useEffect, useState } from "react";
import { wikiSummary, type RouteEvent } from "../lib/events";
import { ChuckOnDodo } from "./ChuckOnDodo";

const BADGE: Record<string, { icon: string; label: string }> = {
  crime: { icon: "⛓️", label: "Brott & straff" },
  war: { icon: "⚔️", label: "Krigshistoria" },
  prehistoric: { icon: "🦴", label: "Förhistoria" },
  cemetery: { icon: "⚰️", label: "Dödens rike" },
  beasts: { icon: "🦁", label: "Vilda djur" },
  disaster: { icon: "🌊", label: "Katastrof" },
  grave: { icon: "🪦", label: "Kändisgrav" },
  death: { icon: "💀", label: "Kändisdöd" },
  quake: { icon: "🌋", label: "Jordbävning" },
};

interface Props {
  event: RouteEvent;
  index: number;
  total: number;
  coachLine: string;
  onContinue: () => void;
}

/**
 * Helskärm när löparen når en trivia-punkt. Rundan står still tills man trycker
 * "Fortsätt spring". Knappen ligger alltid på samma plats i botten.
 */
export function TriviaOverlay({ event, index, total, coachLine, onContinue }: Props) {
  const [image, setImage] = useState<string | undefined>();

  // Bara bilden från Wikipedia. Texten håller vi kort.
  useEffect(() => {
    let alive = true;
    setImage(undefined);
    wikiSummary(event.wiki).then((s) => { if (alive) setImage(s?.image); });
    return () => { alive = false; };
  }, [event]);

  const badge = BADGE[event.type] ?? BADGE.war;
  return (
    <div className="trivia" role="dialog" aria-modal="true" aria-labelledby="trivia-title">
      <div className="trivia-scroll">
        <div className="trivia-inner">
          <div className="trivia-badge">
            <span>{badge.icon} {badge.label}</span>
            <span>km {event.km.toFixed(1)} · {index + 1}/{total}</span>
          </div>
          {image && <img className="trivia-img" src={image} alt="" />}
          <h2 id="trivia-title" className="trivia-title">{event.title}</h2>
          {event.text && <p className="trivia-text">{event.text}</p>}
          <div className="trivia-coach">
            <ChuckOnDodo size={96} className="bob" />
            <div className="speech speech--left"><p>{coachLine}</p></div>
          </div>
        </div>
      </div>
      <div className="trivia-footer">
        <button className="btn-neon" onClick={onContinue} autoFocus>Fortsätt spring ▶</button>
      </div>
    </div>
  );
}
