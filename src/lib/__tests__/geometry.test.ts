import { describe, expect, it } from "vitest";
import { HANDMADE } from "../../data/handmade";
import { silhouetteAccuracy } from "../accuracy";
import { makeProjection, normalize, perimeter, toWaypoints, transform, type Pt } from "../shape";

const mammoth = normalize(HANDMADE.mammoth);

describe("shape", () => {
  it("normaliserar till omkrets 1", () => {
    expect(perimeter(mammoth)).toBeCloseTo(1, 6);
  });

  it("projektionen går fram och tillbaka", () => {
    const p = makeProjection([18.07, 59.33]);
    const back = p.toMeters(p.toLngLat([1234, -5678]));
    expect(back[0]).toBeCloseTo(1234, 3);
    expect(back[1]).toBeCloseTo(-5678, 3);
  });

  it("waypoints respekterar maxantal och avstånd", () => {
    const shape = transform(mammoth, { scale: 25_000, rotationDeg: 0, offset: [0, 0] });
    const wps = toWaypoints(shape, 250, 1000, 48);
    expect(wps.length).toBeLessThanOrEqual(48);
    expect(wps.length).toBeGreaterThan(15);
  });
});

describe("silhouetteAccuracy", () => {
  const shape = transform(mammoth, { scale: 25_000, rotationDeg: 0, offset: [0, 0] });
  const closed: Pt[] = [...shape, shape[0]];

  it("är 100 % när rutten är formen", () => {
    expect(silhouetteAccuracy(closed, shape)).toBeGreaterThan(0.99);
  });

  it("sjunker när rutten förskjuts", () => {
    const shifted = closed.map(([x, y]) => [x + 300, y] as Pt);
    const a = silhouetteAccuracy(shifted, shape);
    expect(a).toBeLessThan(0.99);
    expect(a).toBeGreaterThan(0.3);
  });

  it("straffar en halv rutt", () => {
    const half = closed.slice(0, Math.floor(closed.length / 2));
    expect(silhouetteAccuracy(half, shape)).toBeLessThan(silhouetteAccuracy(closed, shape) - 0.2);
  });
});
