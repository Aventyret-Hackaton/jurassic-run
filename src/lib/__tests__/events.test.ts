import { describe, expect, it } from "vitest";
import { nearestOnLine, pickEvents, type RouteEvent } from "../events";
import { haversine, type LngLat } from "../shape";

// En rak linje österut i Göteborg, ca 1,2 km lång.
const line: LngLat[] = [[11.95, 57.7], [11.96, 57.7], [11.97, 57.7]];
const cumKm = [0];
for (let i = 1; i < line.length; i++) cumKm.push(cumKm[i - 1] + haversine(line[i - 1], line[i]) / 1000);

describe("nearestOnLine", () => {
  it("räknar avståndet mot segmentet, inte bara mot hörnen", () => {
    // 100 m norr om mitten av första segmentet
    const p: LngLat = [11.955, 57.7 + 100 / 110_540];
    const r = nearestOnLine(line, { cumKm }, p);
    expect(r.distM).toBeCloseTo(100, 0);
    expect(r.km).toBeCloseTo(cumKm[1] / 2, 2);
  });

  it("ger långt avstånd för punkter långt bort", () => {
    const r = nearestOnLine(line, { cumKm }, [11.96, 57.71]);
    expect(r.distM).toBeGreaterThan(1000);
  });
});

describe("pickEvents", () => {
  const ev = (km: number, rank: number): RouteEvent => ({ km, rank, type: "place", title: `${km}`, text: "", at: [0, 0], distM: 0 });

  it("väljer de mest kända, med minsta avstånd mellan dem, i ordning längs rutten", () => {
    const picked = pickEvents([ev(1, 5), ev(1.2, 50), ev(3, 10), ev(5, 1)], 2, 0.8);
    expect(picked.map((e) => e.km)).toEqual([1.2, 3]);
  });
});
