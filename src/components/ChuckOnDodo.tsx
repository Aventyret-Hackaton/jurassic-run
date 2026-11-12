/**
 * Coach Chuck rider på en dront. Egen tecknad figur i 80-talsstil
 * (pannband, pilotglasögon, jeansväst) – ingen bild på den riktiga personen.
 */
const O = "#1a1033"; // konturfärg

/**
 * Utsnitt av samma teckning: hela figuren, bara Chucks huvud, eller bara drontens huvud.
 * [x, y, bredd, höjd] i SVG-koordinater.
 */
const CROPS = {
  full: { box: [0, 0, 240, 230], label: "Coach Chuck rider på en dront" },
  head: { box: [46, 6, 80, 58], label: "Coach Chuck" },
  dodo: { box: [144, 62, 86, 62], label: "Dronten" },
} as const;

export type ChuckCrop = keyof typeof CROPS;

export function ChuckOnDodo({ size = 180, className = "", crop = "full" }: { size?: number; className?: string; crop?: ChuckCrop }) {
  const { box, label } = CROPS[crop];
  return (
    <svg
      className={`chuck ${crop !== "full" ? "chuck--crop" : ""} ${className}`}
      width={size}
      height={size * (box[3] / box[2])}
      viewBox={box.join(" ")}
      role="img"
      aria-label={label}
    >
      <g stroke={O} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* ---------- Dronten ---------- */}
        <g className="chuck-dodo">
          {/* ben */}
          <g className="chuck-legs">
            <g className="chuck-leg chuck-leg--back" style={{ transformOrigin: "92px 184px" }}>
              <path d="M92 184 L88 214" strokeWidth="11" />
              <path d="M92 184 L88 214" stroke="#f2c14e" strokeWidth="6" />
              <path d="M74 218 L88 214 L100 219 M88 214 L86 222" strokeWidth="4" />
            </g>
            <g className="chuck-leg chuck-leg--front" style={{ transformOrigin: "128px 184px" }}>
              <path d="M128 184 L132 214" strokeWidth="11" />
              <path d="M128 184 L132 214" stroke="#f2c14e" strokeWidth="6" />
              <path d="M120 219 L132 214 L146 218 M132 214 L134 222" strokeWidth="4" />
            </g>
          </g>
          {/* stjärtfjädrar */}
          <circle cx="44" cy="118" r="12" fill="#f4ecd8" />
          <circle cx="34" cy="133" r="10" fill="#f4ecd8" />
          <circle cx="46" cy="144" r="10" fill="#f4ecd8" />
          {/* kropp */}
          <ellipse cx="100" cy="148" rx="60" ry="46" fill="#7d86b3" />
          <ellipse cx="114" cy="164" rx="34" ry="22" fill="#a7b0d6" stroke="none" />
          <path d="M84 134 C98 122 124 126 132 142 C124 152 112 160 96 158 C102 150 98 142 84 134 Z" fill="#5f6898" />
          {/* hals och huvud */}
          <path d="M136 122 C150 112 152 96 160 86 L184 96 C178 114 168 132 150 148 Z" fill="#7d86b3" />
          <circle cx="172" cy="88" r="22" fill="#7d86b3" />
          <ellipse cx="181" cy="90" rx="12" ry="10" fill="#c9cbe0" stroke="none" />
          {/* näbb */}
          <path d="M186 79 C206 76 226 88 224 104 C222 116 212 118 206 110 C202 104 196 104 188 104 Z" fill="#f2c14e" />
          <path d="M217 96 C227 100 227 113 215 115 C214 109 214 102 217 96 Z" fill="#d98b2b" />
          <path d="M196 86 L206 87" strokeWidth="2" />
          {/* öga */}
          <circle cx="176" cy="85" r="6.5" fill="#fff" />
          <circle cx="178" cy="86" r="2.8" fill={O} stroke="none" />
          <path d="M166 76 L185 81" strokeWidth="3.5" />
        </g>

        {/* ---------- Coach Chuck ---------- */}
        <ChuckRiderShape />
      </g>

      {/* gnistor */}
      <g className="chuck-sparkles" fill="#fff">
        <path d="M206 30 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" />
        <path d="M30 60 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#22e6ff" />
        <path d="M150 20 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ff2fb3" />
      </g>
    </svg>
  );
}

/** Coach Chuck själv (utan dront). Ritas inuti en grupp med tuschkonturen (stroke) satt. Sätet är vid (100, 104). */
export function ChuckRiderShape() {
  return (
    <g className="chuck-rider">
      {/* pannbandets flaggor */}
      <path className="chuck-band-tail" d="M83 27 C72 25 62 29 50 24 C58 34 70 34 82 31 Z" fill="#ff2a4f" />
      <path className="chuck-band-tail" d="M83 30 C74 34 66 41 54 40 C62 46 74 41 84 34 Z" fill="#ff2a4f" />
      {/* ben och stövel */}
      <path d="M80 100 C92 98 120 104 130 112 C134 118 130 124 126 126 L124 142 L108 142 L110 124 C98 120 86 118 80 112 Z" fill="#3a62b8" />
      <path d="M104 140 L126 140 C134 140 140 146 140 153 L102 153 Z" fill="#6b3a1e" />
      {/* bål: flanellskjorta och jeansväst */}
      <path d="M76 106 C72 86 74 66 82 58 L116 58 C122 66 124 86 120 106 Z" fill="#d6283c" />
      <path d="M96 62 L96 102 M102 62 L102 102 M90 74 L108 74 M90 90 L108 90" stroke="#8f1426" strokeWidth="1.6" />
      <path d="M78 104 C76 86 78 68 84 60 L93 60 L91 104 Z" fill="#4a73c9" />
      <path d="M120 104 C122 86 120 68 114 60 L105 60 L107 104 Z" fill="#4a73c9" />
      <rect x="77" y="100" width="44" height="8" rx="2" fill="#3a2414" />
      <rect x="94" y="99.5" width="10" height="9" rx="1.5" fill="#ffd23f" strokeWidth="2" />
      {/* ärmar och korslagda armar */}
      <path d="M80 62 C68 68 64 84 70 94 L86 92 Z" fill="#d6283c" />
      <path d="M118 62 C130 68 134 84 128 94 L112 92 Z" fill="#d6283c" />
      <path d="M68 86 C80 79 114 79 130 85 C132 92 127 98 120 96 C106 92 90 92 77 97 C70 99 66 92 68 86 Z" fill="#e9b38a" />
      <path d="M82 83 C96 90 110 90 122 85" strokeWidth="2" />
      {/* hals och huvud */}
      <rect x="92" y="50" width="14" height="10" fill="#e9b38a" />
      <ellipse cx="99" cy="36" rx="17" ry="19" fill="#e9b38a" />
      <path d="M82 34 C80 16 92 10 100 10 C112 10 120 18 116 34 C112 26 106 24 99 24 C90 24 86 28 82 34 Z" fill="#7a3e1d" />
      <path d="M84 41 C85 53 91 61 99 63 C107 61 113 53 114 41 C110 47 106 49 99 49 C92 49 88 47 84 41 Z" fill="#b0602e" />
      <path d="M90 47 C94 43 104 43 108 47 C104 49 94 49 90 47 Z" fill="#8a4521" strokeWidth="2" />
      <path d="M95 54 Q100 56 105 52" strokeWidth="1.8" fill="none" />
      {/* pilotglasögon */}
      <path d="M85 31 L97 31 C97 38 94 41 90 41 C86 41 85 37 85 31 Z" fill={O} strokeWidth="2" />
      <path d="M101 31 L113 31 C113 37 112 41 108 41 C104 41 101 38 101 31 Z" fill={O} strokeWidth="2" />
      <path d="M97 32 L101 32" strokeWidth="2" />
      <path d="M88 33 L92 37" stroke="#ff2fb3" strokeWidth="1.6" />
      <path d="M104 33 L108 37" stroke="#22e6ff" strokeWidth="1.6" />
      {/* pannband */}
      <path d="M82 25 C92 21 106 21 117 25 L116 31 C106 28 92 28 83 31 Z" fill="#ff2a4f" />
    </g>
  );
}

/** Tuschkonturen som både dronten och Chuck ritas med. */
export const INK_STROKE = { stroke: O, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
