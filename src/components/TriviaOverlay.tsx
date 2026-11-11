import { useEffect, useState } from "react";
import { wikiSummary, type RouteEvent } from "../lib/events";
import { ChuckOnDodo } from "./ChuckOnDodo";

const BADGE: Record<string, { icon: string; label: string }> = {
  place: { icon: "🏛️", label: "Sevärdhet" },
  grave: { icon: "🪦", label: "Kändisgrav" },
  quake: { icon: "🌋", label: "Jordbävning" },
  fossil: { icon: "🦴", label: "Fossil" },
  stat: { icon: "📊", label: "Statistik" },
  country: { icon: "🛂", label: "Gräns" },
};

interface Props {
  event: RouteEvent;
  index: number;
  total: number;
  coachLine: string;
  onContinue: () => void;
}

/** Helskärm när löparen når en trivia-punkt. Rundan står still tills man trycker "Fortsätt spring". */
export function TriviaOverlay({ event, index, total, coachLine, onContinue }: Props) {
  const [more, setMore] = useState<Awaited<ReturnType<typeof wikiSummary>>>(null);
  const [loading, setLoading] = useState(!!event.wiki);

  useEffect(() => {
    let alive = true;
    setMore(null);
    setLoading(!!event.wiki);
    wikiSummary(event.wiki).then((s) => { if (alive) { setMore(s); setLoading(false); } });
    return () => { alive = false; };
  }, [event]);

  const badge = BADGE[event.type] ?? BADGE.place;
  return (
    <div className="trivia" role="dialog" aria-modal="true" aria-labelledby="trivia-title">
      <div className="trivia-inner">
        <div className="trivia-badge">
          <span>{badge.icon} {badge.label}</span>
          <span>km {event.km.toFixed(1)} · {index + 1}/{total}</span>
        </div>

        {more?.image && <img className="trivia-img" src={more.image} alt="" />}
        <h2 id="trivia-title" className="trivia-title">{event.title}</h2>
        <p className="trivia-text">{event.text}</p>
        {loading && <p className="trivia-more trivia-more--loading">Chuck slår upp det i Wikipedia…</p>}
        {more?.extract && <p className="trivia-more">{more.extract}</p>}
        <small className="trivia-dist">
          {Math.round(event.distM)} m från rutten
          {event.wiki && " · Källa: Wikidata"}{more?.url && <> · <a href={more.url} target="_blank" rel="noreferrer">Wikipedia</a></>}
          {event.type === "quake" && " · Källa: USGS"}
        </small>

        <div className="trivia-coach">
          <ChuckOnDodo size={96} className="bob" />
          <div className="speech speech--left"><p>{coachLine}</p></div>
        </div>

        <button className="btn-neon" onClick={onContinue} autoFocus>Fortsätt spring ▶</button>
      </div>
    </div>
  );
}
