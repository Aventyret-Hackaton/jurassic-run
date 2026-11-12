import { describe, expect, it } from "vitest";
import { createShakeDetector, motionMagnitude } from "../shake";

/** Simulerar en serie mätningar var 50:e ms och returnerar tidpunkterna då det blev en skakning. */
function run(values: number[], detect = createShakeDetector()) {
  return values.flatMap((m, i) => (detect(m, i * 50) ? [i * 50] : []));
}

describe("createShakeDetector", () => {
  it("triggar på tre kraftiga ryck i snabb följd", () => {
    expect(run([0, 20, 0, 20, 0, 20, 0])).toEqual([250]);
  });

  it("räknar inte samma ryck flera gånger medan det ligger över tröskeln", () => {
    expect(run([20, 20, 20, 20, 20, 20])).toEqual([]);
  });

  it("ignorerar svaga rörelser, som att gå med telefonen", () => {
    expect(run([0, 6, 0, 8, 0, 7, 0, 9, 0])).toEqual([]);
  });

  it("ignorerar ryck som är för utspridda i tid", () => {
    // Ryck var 400:e ms → bara två inom 700 ms-fönstret.
    const detect = createShakeDetector();
    expect([0, 400, 800, 1200].map((t) => detect(20, t) || detect(0, t + 10))).toEqual([false, false, false, false]);
  });

  it("pausar efter en skakning så att den inte triggar flera gånger", () => {
    const long = Array.from({ length: 20 }, (_, i) => (i % 2 ? 20 : 0)); // 1 s skakning
    expect(run(long)).toHaveLength(1);
  });
});

describe("motionMagnitude", () => {
  it("använder acceleration utan tyngdkraft när den finns", () => {
    expect(motionMagnitude({ acceleration: { x: 3, y: 4, z: 0 }, accelerationIncludingGravity: null } as any)).toBe(5);
  });
  it("drar av tyngdkraften annars", () => {
    expect(motionMagnitude({ acceleration: null, accelerationIncludingGravity: { x: 0, y: 0, z: 9.81 } } as any)).toBeCloseTo(0);
  });
  it("returnerar null när sensorn inte ger något", () => {
    expect(motionMagnitude({ acceleration: { x: null, y: null, z: null }, accelerationIncludingGravity: null } as any)).toBeNull();
  });
});
