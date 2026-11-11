/** Coach Chuck – egen stiliserad figur (inte en bild på den riktiga personen). */
export function ChuckAvatar({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Coach Chuck">
      <circle cx="32" cy="32" r="31" fill="#f2b33d" />
      <path d="M16 30c0-12 7-19 16-19s16 7 16 19" fill="#7a4a21" />
      <ellipse cx="32" cy="33" rx="14" ry="15" fill="#e8b48a" />
      <rect x="15" y="22" width="34" height="6" rx="2" fill="#d9480f" />
      <path d="M47 25l8-3-2 6z" fill="#d9480f" />
      <path d="M19 36c1 14 7 20 13 20s12-6 13-20c-3 4-7 5-13 5s-10-1-13-5z" fill="#7a4a21" />
      <path d="M25 43c3 2 11 2 14 0" stroke="#e8b48a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M24 32h6M34 32h6" stroke="#2b2b2b" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
