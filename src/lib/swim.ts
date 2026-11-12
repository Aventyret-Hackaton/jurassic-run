/** Chucks stöddiga repliker när rundan går ut i vatten. */
export const SWIM_LINES = [
  "Vatten? Chuck simmade över Atlanten en gång. Han blev inte ens blöt.",
  "Broar är för mesar. Hoppa i, rekryt!",
  "Hajarna här har hört att du är på väg. De har redan flyttat.",
  "Chuck Norris simmar inte. Han trycker undan vattnet.",
  "Det där är ingen sjö. Det är en pöl som är rädd för dig.",
  "Dronten kunde inte simma. Därför är den utdöd. Var inte en dront.",
  "Ingen våtdräkt? Bra. Våtdräkter är för fiskar med ångest.",
  "Crawl, bröstsim eller Chuck-sim? Chuck-sim är crawl, fast argare.",
];

/** En slumpad replik som inte har använts än på den här rundan (om det går). */
export function pickSwimLine(used: Set<number>, rnd = Math.random): string {
  const free = SWIM_LINES.map((_, i) => i).filter((i) => !used.has(i));
  const pool = free.length ? free : SWIM_LINES.map((_, i) => i);
  const i = pool[Math.floor(rnd() * pool.length)];
  used.add(i);
  return SWIM_LINES[i];
}
