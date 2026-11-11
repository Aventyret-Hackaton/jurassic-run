/**
 * Coach Chuck. Fungerar alltid med mallar + api.chucknorris.io.
 * Finns ANTHROPIC_API_KEY på servern byts mallraderna ut mot Claude-repliker.
 */
import type { RouteEvent } from "./events";

const TEMPLATES: Record<string, string[]> = {
  quake: ["En jordbävning! Nej då, det var bara dina steg.", "Marken skakade här en gång. Den hade hört att Chuck var på väg."],
  crime: ["Ett fängelse. Chuck har suttit inne en gång. Fängelset bad om ursäkt.", "Här straffades man förr. Idag straffas bara dina vader.", "Brott lönar sig aldrig. Löpning gör det."],
  war: ["En befästning! Byggd för att stoppa fienden. Den hade inte stoppat Chuck.", "Kanoner, murar, vallgravar. Chuck tycker att det verkar mesigt.", "Krig är hemskt. Intervaller är värre."],
  prehistoric: ["Förhistoria! Någon här slutade träna för väldigt länge sedan.", "Fornlämning. Det blir du också om du stannar.", "De byggde det här utan gym. Inga ursäkter."],
  cemetery: ["Kyrkogård. Lugnt här. Spring förbi innan de får idéer.", "Alla här har slutat springa. Gör inte samma misstag."],
  beasts: ["Djur bakom galler. Chuck släpper ut dem bara genom att titta.", "Djuren här är rädda. Inte för dig. För Chuck."],
  disaster: ["Ett skeppsvrak. Havet förlorade mot Chuck en gång. Det minns det fortfarande.", "Katastrof! Fast inte lika stor som din löpstil."],
  grave: ["En legend vilar här. Legender vilar. Du springer.", "Vila i frid? Vila är för de svaga.", "Hen slutade springa. Gör inte samma misstag."],
  death: ["Här tog livet slut för en kändis. Ditt pass tar inte slut förrän Chuck säger det.", "Döden kom hit en gång. Den sprang inte lika fort som du.", "Respekt. Spring vidare. Fortare."],
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
  const fallback = events.map((e) => ({ km: e.km, line: pick(TEMPLATES[e.type] ?? TEMPLATES.war) }));
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
