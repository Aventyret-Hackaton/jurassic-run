import { describe, expect, it } from "vitest";
import { pickSwimLine, SWIM_LINES } from "../swim";

describe("pickSwimLine", () => {
  it("upprepar inte repliker förrän alla är använda", () => {
    const used = new Set<number>();
    const lines = SWIM_LINES.map(() => pickSwimLine(used));
    expect(new Set(lines).size).toBe(SWIM_LINES.length);
  });

  it("börjar om när alla repliker är använda", () => {
    const used = new Set(SWIM_LINES.map((_, i) => i));
    expect(SWIM_LINES).toContain(pickSwimLine(used));
  });
});
