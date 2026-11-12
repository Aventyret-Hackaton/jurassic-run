import { useId } from "react";
import { ChuckOnDodo, ChuckRiderShape, INK_STROKE } from "./ChuckOnDodo";
import { COMIC_ANIMALS, INK } from "./comicAnimals";

/**
 * Coach Chuck rider på det valda djuret (serietidningsteckningen i comicAnimals.tsx).
 * SEATS är punkten på djurets rygg där Chuck sitter, i djurteckningens koordinater
 * (viewBox 0 -6 204 152, marken vid y ≈ 138). Justera här om Chuck sitter snett.
 * Dronten och djur utan sittplats använder den vanliga ChuckOnDodo.
 */
const SEATS: Record<string, [number, number]> = {
  mammoth: [85, 47],
  trex: [86, 59],
  stegosaurus: [100, 60],
  triceratops: [80, 60],
  smilodon: [80, 62],
  thylacine: [88, 66],
  moa: [85, 52],
  "great-auk": [86, 38],
  "sea-cow": [100, 55],
  "woolly-rhino": [88, 47],
  aurochs: [88, 56],
  quagga: [88, 64],
  megatherium: [80, 40],
  brachiosaurus: [92, 68],
  "elephant-bird": [80, 42],
  glyptodon: [95, 42],
};

/** Chucks storlek i förhållande till djuret. */
const SCALE = 0.8;

export function ChuckOnAnimal({ id, size = 180, className = "" }: { id: string; size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const comic = COMIC_ANIMALS[id];
  const seat = SEATS[id];
  if (!comic || !seat) return <ChuckOnDodo size={size} className={className} />;

  const [sx, sy] = seat;
  // Chuck-teckningens säte är (100, 104) och huvudet börjar vid y ≈ 10.
  const top = sy - 104 * SCALE + 6 * SCALE;
  const box = [-12, top, 228, 146 - top];
  const fx = { hatch: `url(#h${uid})`, hex: `url(#x${uid})` };
  return (
    <svg className={`chuck ${className}`} width={size} height={size * (box[3] / box[2])} viewBox={box.join(" ")} role="img" aria-label="Coach Chuck rider">
      <defs>
        <pattern id={`h${uid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={INK} strokeWidth="2" />
        </pattern>
        <pattern id={`x${uid}`} width="16" height="14" patternUnits="userSpaceOnUse">
          <path d="M4 0 L12 0 L16 7 L12 14 L4 14 L0 7 Z" fill="none" stroke={INK} strokeWidth="1.6" />
        </pattern>
      </defs>
      {/* chuck-dodo: samma klass som dronten, så att bob/gallop-animationerna gäller djuret också */}
      <g className="chuck-dodo">{comic.draw(fx)}</g>
      <g transform={`translate(${sx - 100 * SCALE} ${sy - 104 * SCALE}) scale(${SCALE})`}>
        {/* tjockare kontur så att den ser lika tjock ut som djurets efter nedskalningen */}
        <g {...INK_STROKE} strokeWidth={3 / SCALE}>
          <ChuckRiderShape />
        </g>
      </g>
    </svg>
  );
}
