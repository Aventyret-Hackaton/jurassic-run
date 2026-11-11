import { describe, expect, it } from "vitest";
import { isThanksChuck } from "../voice";

describe("isThanksChuck", () => {
  it.each(["Tack Chuck!", "tack tack", "Tack", "ok", "Okej!", "okay", "shack", "Chuck", "tack tjack", "nej tack", "OK då"])("godtar %s", (t) => {
    expect(isThanksChuck(t)).toBe(true);
  });
  it.each(["", "spring vidare", "tacksam", "jackan", "oktober", "schackmatt"])("ignorerar %s", (t) => {
    expect(isThanksChuck(t)).toBe(false);
  });
});
