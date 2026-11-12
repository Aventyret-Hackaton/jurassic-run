import { ChuckSwimming } from "./ChuckSwimming";

/**
 * Rundan går ut i vatten. Chuck säger något stöddigt om att simma, och rundan
 * står still tills löparen trycker "Hoppa i!".
 */
export function SwimNotice({ line, km, onJump }: { line: string; km: number; onJump: () => void }) {
  return (
    <div className="pep swim" role="dialog" aria-modal="true" aria-label="Coach Chuck: dags att simma">
      <div className="pep-inner">
        <div className="speech pep-speech">
          <small>km {km.toFixed(1)} · Vatten framför dig!</small>
          <p>{line}</p>
        </div>
        <ChuckSwimming size={250} className="pep-chuck" />
        <button className="btn-neon pep-btn swim-btn" onClick={onJump} autoFocus>Hoppa i! 🌊</button>
      </div>
    </div>
  );
}
