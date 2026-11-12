import { useState } from "react";
import { createPortal } from "react-dom";
import { ChuckOnDodo } from "./ChuckOnDodo";
import { Logo } from "./Logo";

/**
 * Startskärmen. Första gången rider Chuck in på dronten i full fart,
 * sladdar till stopp i ett dammoln, blixten slår ner och logotypen smäller in.
 * Ett tryck var som helst hoppar över introt.
 */
export function StartIntro({ playIntro, onStart }: { playIntro: boolean; onStart: () => void }) {
  const [intro, setIntro] = useState(playIntro);
  return (
    <main className={`screen screen--start ${intro ? "intro" : ""}`} onClick={() => setIntro(false)}>
      {/* Portal till body: skak-animationens transform på <main> gör annars att
          position: fixed räknas mot <main> i stället för hela fönstret. */}
      {intro && createPortal(<div className="intro-flash" aria-hidden />, document.body)}
      <div className="intro-logo"><Logo /></div>
      <div className="intro-rider">
        {intro && <div className="intro-dust" aria-hidden><span /><span /><span /><span /><span /></div>}
        <ChuckOnDodo size={200} className={intro ? "running" : "bob"} />
        <div className="speech intro-speech"><p>Redo, rekryt?</p></div>
      </div>
      <div className="intro-cta">
        <button className="btn-neon btn-start" onClick={onStart}>Starta</button>
        <p className="fineprint">En helt onödig löparapp. Rutterna formas som utdöda djur.</p>
      </div>
    </main>
  );
}
