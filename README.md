# Jurassic Run 🦖

*Run like there's no tomorrow!*

Jurassic Run är en helt onödig löparapp (PWA) som genererar springrundor formade som utdöda djur. Välj ett av 17 utdöda djur, och appen ritar upp en rutt längs riktiga vägar i djurets silhuett, nära där du står. Hur väl rutten liknar djuret visas som **Silhouette Accuracy**.

Under den simulerade löpningen hämtas verklig data från öppna API:er om platserna du passerar: kungagravar, jordbävningar, extremväder, fossilfynd och märklig statistik. En Chuck Norris-inspirerad coach kommenterar allt, och rundan avslutas med en absurd slutrapport.

Byggt under ett hackathon på Äventyret, med tekniken *Data från ett öppet API*.

**Stack:** React (Vite) · MapLibre GL · Turf.js · OpenRouteService · Vercel

## Kom igång

```bash
npm install
cp .env.example .env.local   # fyll i nycklar (valfritt)
npm run silhouettes          # hämtar och spårar djurens silhuetter från PhyloPic
npm run dev                  # http://localhost:5173
```

Appen funkar utan nycklar:

- **Ruttning:** Utan `ORS_API_KEY` används OSRM:s publika demoservrar. Med nyckel används OpenRouteService.
- **Coach:** Utan `ANTHROPIC_API_KEY` används mallcoachen plus skämt från api.chucknorris.io.

`/api/*` körs som Vercel-funktioner både lokalt (via en Vite-plugin) och på Vercel. Nycklarna stannar alltid på servern.

**Simulera en plats:** välj en stad i appen, eller använd `?city=new york` eller `?lat=40.71&lng=-74.00` i URL:en.

## Silhuetter

Fyra djur har handritade reservkonturer (mammut, dront, T. rex, stegosaurus), så appen går att demo:a direkt. `npm run silhouettes` hämtar riktiga silhuetter för alla 17 från PhyloPic, spårar konturen och sparar den i `src/data/silhouettes.json`.

- **Granska:** Titta på bilderna i `silhouettes/cache/`. Djuret ska helst vara sett från sidan.
- **Byt bild:** Lägg en egen PNG (svart silhuett, transparent bakgrund) i `silhouettes/raw/<id>.png`, eller ange en PhyloPic-bilds UUID i `silhouettes/sources.json`. Kör sedan skriptet igen, t.ex. `npm run silhouettes -- dodo`.
- **Licens:** Kontrollera licensen per bild. Credit visas i appen.

## Så funkar ruttgenereringen

Allt finns i `src/lib/generate.ts`:

1. **Kandidater:** Silhuetten skalas så att omkretsen blir djurets längd (×10 i billäge). 20 placeringar skapas med slumpad rotation (±25°), skala (±20 %) och position. Någon del av konturen hamnar alltid nära användaren.
2. **Landfilter (lokalt, gratis):** Waypoints kontrolleras mot Natural Earth 1:10m (`public/data/`). De ska ligga i samma land och inte i en sjö. Kuststäder får fler omgångar med lite lägre krav.
3. **Ruttning:** De 3 bästa kandidaterna ruttas via `/api/route`, ett anrop vardera med max 50 waypoints, och svaren cachas.
4. **Kontroll:** Rutter som går in i ett annat land kastas. Omvägar som är längre än 2,5 gånger fågelvägen blir raka terrängsträckor om de ligger på land.
5. **Val:** Rutten med högst **Silhouette Accuracy** vinner (`src/lib/accuracy.ts`, ändra `ACCURACY_TOLERANCE` för snällare eller strängare betyg).

## Struktur

```
api/route.ts           Ruttning (ORS → OSRM-reserv), nyckeln stannar på servern
api/coach.ts           Claude-coach (valfri)
src/data/animals.ts    De 17 djuren
src/lib/generate.ts    Silhuett → rutt
src/lib/events.ts      Händelser längs rutten (USGS, Open-Meteo – lägg till fler här)
src/lib/coach.ts       Coach Chuck
src/App.tsx            UI
scripts/fetch-silhouettes.mjs
```

## Deploy

Importera repot i Vercel (Framework: Vite). Lägg `ORS_API_KEY`, `ANTHROPIC_API_KEY` och `CLAUDE_MODEL` under **Settings → Environment Variables**.

## Att göra

- **Person B:** fler händelsekällor i `src/lib/events.ts` (Wikidata-gravar, GBIF-fossil, World Bank, landsgränser) och achievements.
- **Person C:** design och coachbubblor, Chuck-figuren, slutrapporten.
- **Person A:** finjustera auto-fit och terrängsträckor, och spara en New York-rutt som reserv för demon.
