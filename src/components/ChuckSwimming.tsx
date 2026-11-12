/**
 * Coach Chuck simmar crawl, med en dront som flyter bredvid.
 * Samma tecknade stil och samma huvud som i ChuckOnDodo.
 */
const O = "#1a1033"; // konturfärg

export function ChuckSwimming({ size = 200, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`chuck chuck-swim ${className}`}
      width={size}
      height={size * (170 / 240)}
      viewBox="0 0 240 170"
      role="img"
      aria-label="Coach Chuck simmar"
    >
      <g stroke={O} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* vattnet bakom */}
        <path className="swim-wave swim-wave--back" d="M-20 96 Q-5 88 10 96 T40 96 T70 96 T100 96 T130 96 T160 96 T190 96 T220 96 T250 96 T280 96 V170 H-20 Z" fill="#4fb6e6" />

        {/* axlar (blöt flanellskjorta) och armen fram i vattnet */}
        <path d="M94 104 C96 90 108 84 120 84 C132 84 144 90 146 104 Z" fill="#d6283c" />
        <path d="M100 100 C86 98 74 100 62 104" stroke={O} strokeWidth="13" fill="none" />
        <path d="M100 100 C86 98 74 100 62 104" stroke="#e9b38a" strokeWidth="8" fill="none" />

        {/* huvudet: samma som när han rider, flyttat ner i vattnet */}
        <g transform="translate(21 30)">
          <path className="chuck-band-tail" d="M83 27 C72 25 62 29 50 24 C58 34 70 34 82 31 Z" fill="#ff2a4f" />
          <path className="chuck-band-tail" d="M83 30 C74 34 66 41 54 40 C62 46 74 41 84 34 Z" fill="#ff2a4f" />
          <ellipse cx="99" cy="36" rx="17" ry="19" fill="#e9b38a" />
          <path d="M82 34 C80 16 92 10 100 10 C112 10 120 18 116 34 C112 26 106 24 99 24 C90 24 86 28 82 34 Z" fill="#7a3e1d" />
          <path d="M84 41 C85 53 91 61 99 63 C107 61 113 53 114 41 C110 47 106 49 99 49 C92 49 88 47 84 41 Z" fill="#b0602e" />
          <path d="M90 47 C94 43 104 43 108 47 C104 49 94 49 90 47 Z" fill="#8a4521" strokeWidth="2" />
          <path d="M95 54 Q100 57 105 52" strokeWidth="1.8" fill="none" />
          <path d="M85 31 L97 31 C97 38 94 41 90 41 C86 41 85 37 85 31 Z" fill={O} strokeWidth="2" />
          <path d="M101 31 L113 31 C113 37 112 41 108 41 C104 41 101 38 101 31 Z" fill={O} strokeWidth="2" />
          <path d="M97 32 L101 32" strokeWidth="2" />
          <path d="M88 33 L92 37" stroke="#ff2fb3" strokeWidth="1.6" />
          <path d="M104 33 L108 37" stroke="#22e6ff" strokeWidth="1.6" />
          <path d="M82 25 C92 21 106 21 117 25 L116 31 C106 28 92 28 83 31 Z" fill="#ff2a4f" />
        </g>

        {/* armen som drar ett crawltag ovanför vattnet */}
        <g className="swim-arm" style={{ transformOrigin: "138px 92px" }}>
          <path d="M138 92 C152 76 160 58 168 42" stroke={O} strokeWidth="14" fill="none" />
          <path d="M138 92 C152 76 160 58 168 42" stroke="#e9b38a" strokeWidth="9" fill="none" />
          <circle cx="170" cy="38" r="9" fill="#e9b38a" />
          <path d="M165 34 L175 34 M164 39 L175 39" strokeWidth="1.6" />
        </g>

        {/* en dront som flyter bredvid */}
        <g className="swim-dodo">
          <circle cx="200" cy="96" r="13" fill="#7d86b3" />
          <ellipse cx="205" cy="97" rx="7" ry="6" fill="#c9cbe0" stroke="none" />
          <path d="M209 90 C220 88 228 95 226 103 C224 108 218 108 215 104 C213 101 210 101 207 101 Z" fill="#f2c14e" />
          <circle cx="202" cy="92" r="3.5" fill="#fff" />
          <circle cx="203" cy="92" r="1.6" fill={O} stroke="none" />
        </g>

        {/* vattnet framför och skumkrönen */}
        <path className="swim-wave swim-wave--front" d="M-20 108 Q-5 100 10 108 T40 108 T70 108 T100 108 T130 108 T160 108 T190 108 T220 108 T250 108 T280 108 V170 H-20 Z" fill="#2a7fb0" />
        <path className="swim-wave swim-wave--front" d="M-10 108 Q5 100 20 108 M50 108 Q65 100 80 108 M110 108 Q125 100 140 108 M170 108 Q185 100 200 108" stroke="#fff" strokeWidth="2.5" fill="none" />
        <path d="M20 132 Q32 128 44 132 M140 140 Q152 136 164 140 M80 150 Q92 146 104 150" stroke="#9fd8ff" strokeWidth="2" fill="none" />
      </g>

      {/* stänk */}
      <g className="swim-splash" fill="#fff">
        <circle cx="182" cy="30" r="3" />
        <circle cx="190" cy="44" r="2.2" fill="#9fd8ff" />
        <circle cx="158" cy="26" r="2" />
        <circle cx="176" cy="18" r="1.6" fill="#9fd8ff" />
        <circle cx="64" cy="94" r="2.4" />
        <circle cx="52" cy="98" r="1.8" fill="#9fd8ff" />
      </g>
    </svg>
  );
}
