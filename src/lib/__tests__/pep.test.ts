import { describe, expect, it } from "vitest";
import { PEP_BUFFER_KM, pepLines, pepStops } from "../pep";

describe("pepStops", () => {
  it("lägger peppningar mitt i de största luckorna mellan trivia", () => {
    // 9 km → 3 peppningar. Trivia vid 2, 3 och 7 km → luckor 0–2, 2–3, 3–7 (störst), 7–9.
    // De tre största luckorna är 3–7, 0–2 och 7–9.
    expect(pepStops(9, [2, 3, 7])).toEqual([1, 5, 8]);
  });

  it("håller alltid avstånd till trivia, start och mål", () => {
    const trivia = [0.9, 1.7, 2.4, 4.0, 6.2, 7.1];
    const stops = pepStops(9, trivia);
    expect(stops.length).toBeGreaterThan(0);
    for (const s of stops) {
      for (const t of [0, ...trivia, 9]) expect(Math.abs(s - t)).toBeGreaterThanOrEqual(PEP_BUFFER_KM);
    }
  });

  it("hoppar över luckor som är för små", () => {
    expect(pepStops(2, [0.6, 1.2])).toEqual([]);
  });
});

describe("pepLines", () => {
  it("upprepar inte repliker", () => {
    const lines = pepLines([1, 3, 5, 7], 8, "Dront").map((p) => p.line);
    expect(new Set(lines).size).toBe(4);
  });
});
