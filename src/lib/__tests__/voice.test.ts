import { describe, expect, it } from "vitest";
import { isThanksChuck } from "../voice";

describe("isThanksChuck", () => {
  it.each(["Tack Chuck!", "tack, chuck", "Tack tjack", "ja tack schack", "tack så chuck", "TACK JACK"])("godtar %s", (t) => {
    expect(isThanksChuck(t)).toBe(true);
  });
  it.each(["tack", "chuck", "tackar", "tacksam chuck", "nej tack", "spring vidare"])("ignorerar %s", (t) => {
    expect(isThanksChuck(t)).toBe(false);
  });
});
