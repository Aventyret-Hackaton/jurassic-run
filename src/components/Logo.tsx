/**
 * Jurassic Run-logotypen i 80-talsstil: krom-blockbokstäver i en båge,
 * "Run" i röd penselskrift och neonblixtar på sidorna.
 */
const WORD = "JURASSIC".split("");

export function Logo({ compact = false }: { compact?: boolean }) {
  const mid = (WORD.length - 1) / 2;
  return (
    <div className={`logo ${compact ? "logo--compact" : ""}`} role="img" aria-label="Jurassic Run">
      {!compact && <div className="logo-top" aria-hidden>Äventyret presents</div>}
      <div className="logo-arc" aria-hidden>
        {WORD.map((ch, i) => {
          const d = i - mid;
          return (
            <span
              key={i}
              className="logo-chrome"
              data-ch={ch}
              style={{ transform: `translateY(${(d * d * (compact ? 0.9 : 1.6)).toFixed(1)}px) rotate(${(d * 3.2).toFixed(1)}deg)` }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div className="logo-run-wrap" aria-hidden>
        {!compact && (
          <svg className="logo-bolt" viewBox="0 0 400 90" preserveAspectRatio="none">
            <defs>
              <filter id="bolt-glow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="2.4" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <polyline filter="url(#bolt-glow)" points="140,22 118,30 104,26 86,44 70,40 52,58 40,54 26,72 14,70 4,88" />
            <polyline filter="url(#bolt-glow)" points="260,22 282,30 296,26 314,44 330,40 348,58 360,54 374,72 386,70 396,88" />
          </svg>
        )}
        <span className="logo-run">Run</span>
        {!compact && <span className="logo-spark logo-spark--l" />}
        {!compact && <span className="logo-spark logo-spark--r" />}
      </div>
      {!compact && <div className="logo-tag">Run like there's no tomorrow</div>}
    </div>
  );
}
