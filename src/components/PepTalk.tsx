import { useThanksChuck } from "../lib/voice";
import { ChuckOnDodo } from "./ChuckOnDodo";

/**
 * Chuck kommer upp underifrån och peppar löparen. Rundan står still tills man tackar –
 * med knappen, tangentbordet eller genom att säga "Tack Chuck!" (där webbläsaren stöder det).
 */
export function PepTalk({ line, km, onThanks }: { line: string; km: number; onThanks: () => void }) {
  const listening = useThanksChuck(true, onThanks);
  return (
    <div className="pep" role="dialog" aria-modal="true" aria-label="Coach Chuck peppar">
      <div className="pep-inner">
        <div className="speech pep-speech">
          <small>km {km.toFixed(1)} · Coach Chuck</small>
          <p>{line}</p>
        </div>
        <ChuckOnDodo size={230} className="bob pep-chuck" />
        <button className="btn-neon pep-btn" onClick={onThanks} autoFocus>Tack, Chuck!</button>
        {listening && <small className="pep-mic" aria-live="polite">🎤 …eller säg det högt</small>}
      </div>
    </div>
  );
}
