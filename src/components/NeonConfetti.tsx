import { useEffect, useRef } from "react";

const COLORS = ["#ff2fb3", "#22e6ff", "#ffe45c", "#ff8a3d", "#9b2cf0", "#ffffff"];
type Shape = "rect" | "star" | "tri" | "bolt";
const SHAPES: Shape[] = ["rect", "rect", "star", "tri", "bolt"];

interface P { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; color: string; shape: Shape; wob: number }

/** Neonkonfetti i 80-talsstil: glödande rektanglar, stjärnor, trianglar och blixtar. */
export function NeonConfetti({ durationMs = 3500 }: { durationMs?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    addEventListener("resize", resize);

    const parts: P[] = [];
    const add = (x: number, y: number, vx: number, vy: number) => parts.push({
      x, y, vx, vy, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.3,
      size: 6 + Math.random() * 8, color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)], wob: Math.random() * 6.3,
    });
    // Två kanoner från nederkanten
    const cannon = (fromLeft: boolean) => {
      for (let i = 0; i < 70; i++) {
        const a = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.6;
        const v = 11 + Math.random() * 9;
        add(fromLeft ? 0 : innerWidth, innerHeight, Math.cos(a) * v, Math.sin(a) * v);
      }
    };
    cannon(true); cannon(false);

    const start = performance.now();
    let raf = 0, last = start;
    const tick = (now: number) => {
      const dt = Math.min(2, (now - last) / 16.7);
      last = now;
      if (now - start < durationMs && Math.random() < 0.7) add(Math.random() * innerWidth, -20, (Math.random() - 0.5) * 2, 2 + Math.random() * 2);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += 0.22 * dt; p.vx *= 0.99; p.vy *= 0.99;
        p.wob += 0.1 * dt;
        p.x += (p.vx + Math.sin(p.wob) * 0.8) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y > innerHeight + 40) { parts.splice(i, 1); continue; }
        draw(ctx, p);
      }
      if (parts.length || now - start < durationMs) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); };
  }, [durationMs]);

  return <canvas ref={ref} className="confetti" aria-hidden />;
}

function draw(ctx: CanvasRenderingContext2D, p: P) {
  const s = p.size;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(p.wob))); // fladder
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  if (p.shape === "rect") ctx.rect(-s / 2, -s / 4, s, s / 2);
  else if (p.shape === "tri") { ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.lineTo(-s / 2, s / 2); ctx.closePath(); }
  else if (p.shape === "star") {
    for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.18 : s * 0.6; const a = (i * Math.PI) / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath();
  } else {
    ctx.lineWidth = 2.5; ctx.lineJoin = "round";
    ctx.moveTo(-s / 2, -s / 2); ctx.lineTo(s / 6, -s / 10); ctx.lineTo(-s / 6, s / 10); ctx.lineTo(s / 2, s / 2);
    ctx.stroke(); ctx.restore(); return;
  }
  ctx.fill();
  ctx.restore();
}
