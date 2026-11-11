/**
 * Jurassic Run-logotypen i 80-talsstil: krom-blockbokstäver i en båge,
 * "Run" i röd penselskrift och neonblixtar på sidorna.
 */
import { useEffect, useState } from "react";

const WORD = "JURASSIC".split("");

/** Blixtens form: x och y från 0 till 1. x = 0 vid "Run", x = 1 vid skärmkanten. */
const BOLT: [number, number][] = [
  [0, 0.08], [0.06, 0.2], [0.1, 0.12], [0.17, 0.34], [0.22, 0.26], [0.3, 0.48], [0.36, 0.4],
  [0.45, 0.62], [0.5, 0.55], [0.6, 0.76], [0.66, 0.68], [0.76, 0.86], [0.83, 0.8], [0.92, 0.96], [1, 0.92],
];
/** En gren som delar sig från huvudblixten (startar vid punkt 7). */
const FORK: [number, number][] = [[0.45, 0.62], [0.48, 0.78], [0.44, 0.86], [0.5, 1]];

/** Samma som font-size på .logo-run-wrap: clamp(56px, 18vw, 130px). */
export const runEm = (vw: number) => Math.min(130, Math.max(56, vw * 0.18));

/**
 * Två neonblixtar från "Run" ut till skärmens kanter. Ritas i riktiga pixlar
 * (ingen utsträckt SVG). Höjden och linjens tjocklek växer med skärmens bredd.
 */
function Bolts() {
  const [vw, setVw] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const em = runEm(vw);
  const w = Math.max(40, vw / 2 - em * 0.9);
  const h = Math.min(220, Math.max(56, vw * 0.13));
  const core = Math.min(4.5, Math.max(2.2, vw * 0.0026));
  const scale = (shape: [number, number][]) => shape.map(([t, y]) => [t * w, y * h] as const);
  const lengthOf = (pts: (readonly [number, number])[]) => pts.slice(1).reduce((s, [x, y], i) => s + Math.hypot(x - pts[i][0], y - pts[i][1]), 0);
  const main = scale(BOLT), fork = scale(FORK);
  const toPoints = (pts: (readonly [number, number])[], mirror: boolean) => pts.map(([x, y]) => `${(mirror ? w - x : x).toFixed(1)},${y.toFixed(1)}`).join(" ");
  const dash = (len: number) => ({ strokeDasharray: len, strokeDashoffset: len });
  const mainLen = lengthOf(main), forkLen = lengthOf(fork);
  return (
    <>
      {[true, false].map((left) => (
        <svg
          key={String(left)}
          className={`logo-bolt logo-bolt--${left ? "l" : "r"}`}
          width={w} height={h} viewBox={`0 0 ${w} ${h}`}
          style={{ ["--core" as string]: `${core}px` }}
        >
          {/* Glöden är breda, halvgenomskinliga linjer under den skarpa linjen. */}
          {[main, fork].map((pts, i) => {
            const style = dash(i ? forkLen : mainLen);
            const cls = i ? " bolt-fork" : "";
            return (
              <g key={i}>
                <polyline className={`bolt-halo${cls}`} points={toPoints(pts, left)} style={style} />
                <polyline className={`bolt-glow${cls}`} points={toPoints(pts, left)} style={style} />
                <polyline className={`bolt-core${cls}`} points={toPoints(pts, left)} style={style} />
              </g>
            );
          })}
        </svg>
      ))}
    </>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  const mid = (WORD.length - 1) / 2;
  return (
    <div className={`logo ${compact ? "logo--compact" : ""}`} role="img" aria-label="Jurassic Run">
      {!compact && <div className="logo-top" aria-hidden>Coach Norris presents</div>}
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
        {!compact && <Bolts />}
        <span className="logo-run">Run</span>
        {!compact && <span className="logo-spark logo-spark--l" />}
        {!compact && <span className="logo-spark logo-spark--r" />}
      </div>
      {!compact && <div className="logo-tag">Run like there's no tomorrow</div>}
    </div>
  );
}
