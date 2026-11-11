/**
 * POST /api/coach
 * Body: { animal: string, events: { km: number, type: string, text: string }[] }
 * Svar: { lines: { km: number, line: string }[], source: "claude" | "none" }
 *
 * Ett enda Claude-anrop per runda. Utan ANTHROPIC_API_KEY svarar den med
 * source: "none" så att frontenden använder mallcoachen i stället.
 */
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM = `Du är Coach Chuck: en överdrivet självsäker, Chuck Norris-inspirerad löpcoach i appen Jurassic Run.
Användaren springer en runda formad som ett utdött djur. Du får en lista med verkliga händelser längs rutten.
Skriv EN kort, absurd och peppig kommentar (max 25 ord, svenska) per händelse. Var mörkt rolig men aldrig elak mot verkliga offer.
Svara ENDAST med JSON: [{"km": number, "line": string}]`;

export async function POST(request: Request): Promise<Response> {
  const { animal, events } = await request.json();
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ lines: [], source: "none" });

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-haiku-5-5",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify({ animal, events }) }],
    });
    const text = msg.content.find((c) => c.type === "text")?.text ?? "[]";
    const lines = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    return Response.json({ lines, source: "claude" });
  } catch (err) {
    console.error("coach", err);
    return Response.json({ lines: [], source: "none" });
  }
}
