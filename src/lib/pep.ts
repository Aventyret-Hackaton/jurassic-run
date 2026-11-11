/**
 * Chucks peppningar under löpningen. De placeras i de största luckorna
 * mellan trivia-punkterna, så att de aldrig kommer i anslutning till en trivia.
 */

/** Minsta avstånd (km) mellan en peppning och en trivia, start eller mål. */
export const PEP_BUFFER_KM = 0.5;
/** Ungefär en peppning per så här många km, som mest MAX_PEPS. */
export const KM_PER_PEP = 3;
export const MAX_PEPS = 4;

export interface Pep { km: number; line: string }

/** Var peppningarna ska ligga: mitt i de största luckorna mellan trivia. */
export function pepStops(totalKm: number, triviaKm: number[], buffer = PEP_BUFFER_KM): number[] {
  const want = Math.min(MAX_PEPS, Math.max(1, Math.round(totalKm / KM_PER_PEP)));
  const marks = [0, ...[...triviaKm].sort((a, b) => a - b), totalKm];
  const gaps = marks.slice(1).map((end, i) => ({ start: marks[i], end, len: end - marks[i] }));
  return gaps
    .filter((g) => g.len >= 2 * buffer)
    .sort((a, b) => b.len - a.len)
    .slice(0, want)
    .map((g) => +(g.start + g.len / 2).toFixed(3))
    .sort((a, b) => a - b);
}

interface Ctx { km: number; totalKm: number; animal: string }

/** Repliker. En funktion som returnerar null passar inte just nu. */
const LINES: ((c: Ctx) => string | null)[] = [
  (c) => `Du har sprungit ${c.km.toFixed(1)} km. Dina ben ringde mig och klagade. Jag sa åt dem att hålla tyst.`,
  (c) => `${(c.totalKm - c.km).toFixed(1)} km kvar. Det är ingenting. Jag springer längre än så i sömnen.`,
  (c) => (c.km / c.totalKm > 0.4 && c.km / c.totalKm < 0.6 ? `Halvvägs! En ${c.animal.toLowerCase()} hade gett upp här. Därför är den utdöd.` : null),
  () => "Smärta är bara svaghet som lämnar kroppen. Den lämnar dig nu. Snabbt.",
  () => "Jag är stolt över dig. Säg det inte till någon.",
  () => "Du springer som en legend. En långsam legend. Men en legend.",
  () => "Andas in. Andas ut. Spring. Upprepa tills jag säger stopp. Jag säger aldrig stopp.",
  () => "Dronten tror på dig. Och dronten tror inte på någon.",
  (c) => (c.km / c.totalKm > 0.7 ? "Sista biten! Mållinjen är rädd för dig. Visa den varför." : null),
  () => "Svett är bara fett som gråter. Låt det gråta.",
];

/** En replik per peppning, utan upprepningar. */
export function pepLines(kms: number[], totalKm: number, animal: string, rnd = Math.random): Pep[] {
  const used = new Set<number>();
  return kms.map((km) => {
    const ctx = { km, totalKm, animal };
    const options = LINES.map((f, i) => [i, f(ctx)] as const).filter(([i, l]) => l && !used.has(i));
    const [i, line] = options[Math.floor(rnd() * options.length)] ?? [-1, "Spring!"];
    used.add(i);
    return { km, line: line! };
  });
}
