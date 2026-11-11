import { useId } from "react";
import { getSilhouette, outlineToSvgPath } from "../lib/silhouettes";
import { COMIC_ANIMALS, INK } from "./comicAnimals";

/**
 * Djuret som frilagd serietidningsfigur (se comicAnimals.tsx).
 * Djur utan teckning visas som silhuett, och utan silhuett som emoji.
 */
export function AnimalArt({ id, fallback, className = "" }: { id: string; fallback?: string; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const comic = COMIC_ANIMALS[id];
  if (comic) {
    const fx = { hatch: `url(#h${uid})`, hex: `url(#x${uid})` };
    return (
      <svg viewBox="0 -6 204 152" className={`animal-art animal-art--comic ${className}`} aria-hidden>
        <defs>
          <pattern id={`h${uid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
            <line x1="0" y1="0" x2="0" y2="5" stroke={INK} strokeWidth="2" />
          </pattern>
          <pattern id={`x${uid}`} width="16" height="14" patternUnits="userSpaceOnUse">
            <path d="M4 0 L12 0 L16 7 L12 14 L4 14 L0 7 Z" fill="none" stroke={INK} strokeWidth="1.6" />
          </pattern>
        </defs>
        {comic.draw(fx)}
      </svg>
    );
  }

  const sil = getSilhouette(id);
  if (!sil) {
    return (
      <svg viewBox="0 0 100 100" className={`animal-art ${className}`}>
        <text x="50" y="64" textAnchor="middle" fontSize="44">{fallback ?? "?"}</text>
      </svg>
    );
  }
  const d = outlineToSvgPath(sil.outline, 100, 10);
  return (
    <svg viewBox="0 0 100 100" className={`animal-art ${className}`} aria-hidden>
      <path d={d} transform="translate(3.5 3.5)" fill="#22e6ff" opacity="0.85" />
      <path d={d} fill="#ff8a3d" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Kortets bakgrundsfärg för djuret. */
export const animalBg = (id: string) => COMIC_ANIMALS[id]?.bg ?? "#ffd23f";
