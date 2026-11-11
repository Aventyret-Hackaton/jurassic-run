/**
 * Coach Chuck. Fungerar alltid med mallar + api.chucknorris.io.
 * Finns ANTHROPIC_API_KEY på servern byts mallraderna ut mot Claude-repliker.
 */
import type { RouteEvent } from "./events";

const TEMPLATES: Record<string, string[]> = {
  quake: ["En jordbävning! Nej då, det var bara dina steg.", "Marken skakade här en gång. Den hade hört att Chuck var på väg."],
  place: ["Sevärdhet! Titta snabbt. Chuck har redan sett den. Två gånger.", "Turister stannar här. Du är ingen turist. Du är en maskin.", "Den här platsen är känd. Snart är du också det."],
  grave: ["En legend vilar här. Legender vilar. Du springer.", "Vila i frid? Vila är för de svaga.", "Hen slutade springa. Gör inte samma misstag."],
  fossil: ["Fossil! Det där är vad som händer om du stannar.", "Någon här slutade träna för 100 miljoner år sedan."],
  stat: ["Statistiken säger att du borde springa fortare.", "Siffror ljuger inte. Det gör dina ben."],
  country: ["Ny gräns! Passet? Chuck Norris ÄR passet.", "Landsgräns passerad. Den passerade dig inte."],
};

export const START_LINES = [
  "Spring som om det inte fanns någon morgondag. För det finns det inte.",
  "Uppvärmning är för dinosaurier. Och de är utdöda.",
];

const SAFE_JOKE_CATEGORIES = ["animal", "dev", "fashion", "food", "movie", "music", "science", "sport", "travel"];

export interface CoachLine { km: number; line: string }

export async function chuckFact(): Promise<string> {
  try {
    // Bara snälla kategorier (inte "explicit", "religion" eller "political").
    const r = await fetch(`https://api.chucknorris.io/jokes/random?category=${pick(SAFE_JOKE_CATEGORIES)}`);
    return (await r.json()).value as string;
  } catch {
    return "Chuck Norris behöver inget internet. Internet behöver Chuck Norris.";
  }
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export async function coachLines(animal: string, events: RouteEvent[]): Promise<{ lines: CoachLine[]; source: string }> {
  const fallback = events.map((e) => ({ km: e.km, line: pick(TEMPLATES[e.type] ?? TEMPLATES.place) }));
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ animal, events: events.map(({ km, type, title, text }) => ({ km: +km.toFixed(1), type, text: `${title}: ${text}` })) }),
    });
    const data = await res.json();
    if (data.source === "claude" && data.lines?.length) return data;
  } catch { /* mallcoachen tar över */ }
  return { lines: fallback, source: "templates" };
}
