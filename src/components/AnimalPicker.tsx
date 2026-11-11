import { ANIMALS, CAR_FACTOR, type Animal } from "../data/animals";
import type { Mode } from "../lib/generate";
import { getSilhouette, outlineToSvgPath } from "../lib/silhouettes";

interface Props { selected: Animal | null; mode: Mode; onSelect: (a: Animal) => void }

export function AnimalPicker({ selected, mode, onSelect }: Props) {
  return (
    <div className="animal-grid">
      {ANIMALS.map((a) => {
        const sil = getSilhouette(a.id);
        const km = a.baseKm * (mode === "car" ? CAR_FACTOR : 1);
        return (
          <button
            key={a.id}
            className={`animal ${selected?.id === a.id ? "selected" : ""}`}
            disabled={!sil}
            onClick={() => onSelect(a)}
            title={sil ? `${a.name} – ${km} km` : `${a.name}: silhuett saknas (kör npm run silhouettes)`}
          >
            <svg viewBox="0 0 100 100" className="animal-svg">
              {sil ? <path d={outlineToSvgPath(sil.outline)} /> : <text x="50" y="62" textAnchor="middle" fontSize="40">{a.emoji}</text>}
            </svg>
            <span className="animal-name">{a.name}</span>
            <span className="animal-km">{sil ? `${km} km` : "saknas"}</span>
          </button>
        );
      })}
    </div>
  );
}
