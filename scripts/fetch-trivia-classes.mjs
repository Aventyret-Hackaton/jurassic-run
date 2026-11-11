#!/usr/bin/env node
/**
 * Hämtar alla Wikidata-underklasser till triviakategorierna och sparar dem i
 * src/data/triviaClasses.json som { "Q123": "war", ... }.
 *
 * Appen klassar sedan platser lokalt på deras direkta "instans av" (P31).
 * En SPARQL-fråga med P279* i appen tar ca 40 s, så klassningen görs i förväg.
 *
 * Kör: npm run trivia-classes
 * Ändra kategorierna i CATEGORIES nedan och kör skriptet igen.
 */
import { writeFile } from "node:fs/promises";

/** Kategori → rotklasser i Wikidata. Den första kategorin som matchar vinner. */
const CATEGORIES = {
  crime: ["Q40357", "Q2151479", "Q243778"], // fängelse, avrättningsplats, galge
  war: ["Q57821", "Q23413", "Q91122", "Q575759", "Q2772772", "Q1241568"], // befästning, slott, bunker, krigsmonument, militärmuseum, krigskyrkogård
  prehistoric: ["Q9096832", "Q164240", "Q815241", "Q34023", "Q1970365", "Q839954"], // fossilplats, megalit, runsten, gravhög, naturhistoriskt museum, fornlämning
  cemetery: ["Q39614", "Q381885", "Q173387", "Q162875"], // kyrkogård, grav, gravplats, mausoleum
  beasts: ["Q43501", "Q2281788"], // djurpark, akvarium
  disaster: ["Q852190"], // skeppsvrak
};

const UA = "jurassic-run-hackathon/0.1 (trivia classes script)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function subclasses(root) {
  const query = `SELECT DISTINCT ?s WHERE { ?s wdt:P279* wd:${root} }`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/sparql-results+json", "User-Agent": UA },
    });
    if (res.ok) return (await res.json()).results.bindings.map((b) => b.s.value.split("/").pop());
    console.warn(`  ${root}: HTTP ${res.status}, försök ${attempt}/5`);
    await sleep(attempt * 4000);
  }
  throw new Error(`Kunde inte hämta underklasser till ${root}`);
}

const out = {};
for (const [cat, roots] of Object.entries(CATEGORIES)) {
  for (const root of roots) {
    const subs = await subclasses(root);
    let added = 0;
    for (const q of subs) if (!out[q]) { out[q] = cat; added++; }
    console.log(`${cat.padEnd(12)} ${root.padEnd(10)} ${subs.length} underklasser (${added} nya)`);
    await sleep(1500);
  }
}

const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => +a.slice(1) - +b.slice(1)));
await writeFile(new URL("../src/data/triviaClasses.json", import.meta.url), JSON.stringify(sorted) + "\n");
console.log(`\nSparat ${Object.keys(sorted).length} klasser i src/data/triviaClasses.json`);
