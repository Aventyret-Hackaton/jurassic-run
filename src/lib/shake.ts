/**
 * Skaka telefonen → gör något (t.ex. "Överraska mig"). Bygger på webbläsarens
 * `devicemotion`. Saknas sensor eller nekas behörighet händer ingenting – klick
 * fungerar alltid som vanligt.
 */
import { useEffect, useRef, useState } from "react";

export interface ShakeOptions {
  /** Hur kraftig rörelsen (m/s², utan tyngdkraft) måste vara för att räknas som ett ryck. */
  threshold?: number;
  /** Antal ryck som krävs … */
  hits?: number;
  /** … inom så här många millisekunder. */
  windowMs?: number;
  /** Paus efter en skakning, så att en lång skakning inte triggar flera gånger. */
  cooldownMs?: number;
}

/**
 * Ren skakdetektor: mata in rörelsens styrka och tidpunkt, få `true` när det är en skakning.
 * Separat från DOM:en så att den går att testa.
 */
export function createShakeDetector({ threshold = 13, hits = 3, windowMs = 700, cooldownMs = 1200 }: ShakeOptions = {}) {
  let peaks: number[] = [];
  let lastShake = -Infinity;
  let above = false;
  return (magnitude: number, t: number): boolean => {
    if (t - lastShake < cooldownMs) return false;
    // Räkna bara när styrkan går ÖVER tröskeln, inte varje mätning medan den ligger kvar där.
    const isAbove = magnitude >= threshold;
    if (isAbove && !above) peaks.push(t);
    above = isAbove;
    peaks = peaks.filter((p) => t - p <= windowMs);
    if (peaks.length >= hits) {
      peaks = [];
      lastShake = t;
      return true;
    }
    return false;
  };
}

const GRAVITY = 9.81;

/** Rörelsens styrka i m/s² utan tyngdkraft, eller null om sensorn inte ger något. */
export function motionMagnitude(e: Pick<DeviceMotionEvent, "acceleration" | "accelerationIncludingGravity">): number | null {
  const a = e.acceleration;
  if (a && a.x != null && a.y != null && a.z != null) return Math.hypot(a.x, a.y, a.z);
  const g = e.accelerationIncludingGravity;
  if (g && g.x != null && g.y != null && g.z != null) return Math.abs(Math.hypot(g.x, g.y, g.z) - GRAVITY);
  return null;
}

type MotionPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * iPhone kräver att man ber om lov att läsa rörelsesensorn, och det måste ske direkt i
 * en tryckning/klick. Anropa från en klickhanterare; gör ingenting på andra enheter.
 */
export function requestMotionPermission(): void {
  const D = typeof DeviceMotionEvent !== "undefined" ? (DeviceMotionEvent as unknown as MotionPermission) : null;
  if (D?.requestPermission) D.requestPermission().catch(() => { /* nekad – klick fungerar ändå */ });
}

/**
 * Anropar `onShake` när telefonen skakas, så länge `active` är sant.
 * Returnerar true när sensorn faktiskt levererar data (för att kunna visa en ledtråd).
 */
export function useShake(active: boolean, onShake: () => void, options?: ShakeOptions): boolean {
  const [available, setAvailable] = useState(false);
  const cb = useRef(onShake);
  cb.current = onShake;

  useEffect(() => {
    if (!active || typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;
    const detect = createShakeDetector(options);
    let seen = false;
    const onMotion = (e: DeviceMotionEvent) => {
      const m = motionMagnitude(e);
      if (m == null) return;
      if (!seen) { seen = true; setAvailable(true); }
      if (detect(m, e.timeStamp || performance.now())) {
        navigator.vibrate?.(60);
        cb.current();
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
    // options är ett konfigurationsobjekt som inte ändras under en session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return available;
}
