import { useEffect, useMemo, useRef, useState } from "react";
import { haversine, type LngLat } from "./shape";

/** Spelar upp rundan: hela rutten på `durationSec` sekunder. */
export function useRunner(line: LngLat[] | null, durationSec: number) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const durRef = useRef(durationSec);
  durRef.current = durationSec;

  const cum = useMemo(() => {
    if (!line) return [0];
    const c = [0];
    for (let i = 1; i < line.length; i++) c.push(c[i - 1] + haversine(line[i - 1], line[i]));
    return c;
  }, [line]);

  useEffect(() => { setProgress(0); setPlaying(false); }, [line]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => {
        const n = Math.min(1, p + dt / durRef.current);
        if (n >= 1) setPlaying(false);
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const total = cum[cum.length - 1];
  const position = useMemo<LngLat | null>(() => {
    if (!line || line.length < 2) return null;
    const d = progress * total;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const t = (d - cum[lo]) / (cum[hi] - cum[lo] || 1);
    const a = line[lo], b = line[hi];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }, [line, cum, total, progress]);

  return {
    progress, playing, position, totalKm: total / 1000, km: (progress * total) / 1000,
    play: () => { if (progress >= 1) setProgress(0); setPlaying(true); },
    pause: () => setPlaying(false),
    seek: (p: number) => setProgress(p),
  };
}
