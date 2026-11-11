/**
 * De 17 utdöda djuren. `baseKm` är rundans längd till fots (djuret bestämmer längden).
 * I billäge multipliceras den med CAR_FACTOR.
 *
 * `phylopic` är namnet som skriptet `npm run silhouettes` söker efter på PhyloPic.
 */
export interface Animal {
  id: string;
  name: string;
  scientific: string;
  phylopic: string;
  /** Kort fakta på svenska (max ca två rader i vyn). */
  fact: string;
  /** Visningstext, t.ex. "1844" eller "66 milj. år sedan". */
  extinct: string;
  /** Ungefär hur många år sedan djuret dog ut (för slutrapporten). */
  extinctYearsAgo: number;
  baseKm: number;
  emoji: string;
}

export const CAR_FACTOR = 10;

export const ANIMALS: Animal[] = [
  { id: "mammoth", name: "Ullhårig mammut", scientific: "Mammuthus primigenius", phylopic: "mammuthus primigenius", fact: "Ullig jätte från istiden med upp till fyra meter långa betar. De sista levde på Wrangelön.", extinct: "4 000 år sedan", extinctYearsAgo: 4000, baseKm: 25, emoji: "🦣" },
  { id: "dodo", name: "Dront", scientific: "Raphus cucullatus", phylopic: "raphus cucullatus", fact: "Flygoförmögen duva från Mauritius, nästan en meter hög. Försvann inom 100 år efter att människan kom.", extinct: "1600-talet", extinctYearsAgo: 360, baseKm: 8, emoji: "🦤" },
  { id: "trex", name: "Tyrannosaurus", scientific: "Tyrannosaurus rex", phylopic: "tyrannosaurus rex", fact: "Ett av de största rovdjuren någonsin – tolv meter långt med världens kraftigaste bett.", extinct: "66 milj. år sedan", extinctYearsAgo: 66_000_000, baseKm: 30, emoji: "🦖" },
  { id: "stegosaurus", name: "Stegosaurus", scientific: "Stegosaurus", phylopic: "stegosaurus", fact: "Växtätare med stora benplattor längs ryggen och taggar på svansen. Hjärnan var stor som en valnöt.", extinct: "~150 milj. år sedan", extinctYearsAgo: 150_000_000, baseKm: 30, emoji: "🦕" },
  { id: "triceratops", name: "Triceratops", scientific: "Triceratops", phylopic: "triceratops", fact: "Växtätare med tre horn och en stor nackkrage. Levde samtidigt som T. rex.", extinct: "66 milj. år sedan", extinctYearsAgo: 66_000_000, baseKm: 25, emoji: "🦕" },
  { id: "smilodon", name: "Sabeltandad tiger", scientific: "Smilodon fatalis", phylopic: "smilodon fatalis", fact: "Kraftigt kattdjur med upp till 28 cm långa hörntänder. Jagade stora djur i Amerika.", extinct: "~10 000 år sedan", extinctYearsAgo: 10_000, baseKm: 18, emoji: "🐯" },
  { id: "thylacine", name: "Pungvarg", scientific: "Thylacinus cynocephalus", phylopic: "thylacinus cynocephalus", fact: "Randigt pungdjur som liknade en varg. Den sista dog på ett zoo i Tasmanien 1936.", extinct: "1936", extinctYearsAgo: 90, baseKm: 15, emoji: "🐺" },
  { id: "moa", name: "Jättemoa", scientific: "Dinornis robustus", phylopic: "dinornis robustus", fact: "Nyzeeländsk fågel som kunde bli 3,6 meter hög. Utrotades snabbt efter att maorierna kom.", extinct: "1400-talet", extinctYearsAgo: 580, baseKm: 14, emoji: "🐦" },
  { id: "great-auk", name: "Garfågel", scientific: "Pinguinus impennis", phylopic: "pinguinus impennis", fact: "Flygoförmögen havsfågel i Nordatlanten, ofta kallad nordens pingvin. Jagades till utrotning.", extinct: "1844", extinctYearsAgo: 182, baseKm: 10, emoji: "🐧" },
  { id: "sea-cow", name: "Stellers sjöko", scientific: "Hydrodamalis gigas", phylopic: "hydrodamalis gigas", fact: "Upp till nio meter lång sjöko i Berings hav. Utrotad bara 27 år efter att den upptäcktes.", extinct: "1768", extinctYearsAgo: 258, baseKm: 20, emoji: "🐋" },
  { id: "woolly-rhino", name: "Ullhårig noshörning", scientific: "Coelodonta antiquitatis", phylopic: "coelodonta antiquitatis", fact: "Noshörning med tjock päls och ett nästan meterlångt horn. Levde i Europa och Asien under istiden.", extinct: "~14 000 år sedan", extinctYearsAgo: 14_000, baseKm: 20, emoji: "🦏" },
  { id: "aurochs", name: "Uroxe", scientific: "Bos primigenius", phylopic: "bos primigenius", fact: "Vild stamfader till dagens kor, upp till 1,8 m i mankhöjd. Den sista dog i Polen 1627.", extinct: "1627", extinctYearsAgo: 399, baseKm: 18, emoji: "🐂" },
  { id: "quagga", name: "Quagga", scientific: "Equus quagga quagga", phylopic: "equus quagga quagga", fact: "Sydafrikansk zebra med ränder bara på framkroppen. Den sista dog på ett zoo i Amsterdam 1883.", extinct: "1883", extinctYearsAgo: 143, baseKm: 16, emoji: "🦓" },
  { id: "megatherium", name: "Jättesengångare", scientific: "Megatherium americanum", phylopic: "megatherium americanum", fact: "Marklevande sengångare stor som en elefant. Kunde resa sig på bakbenen för att nå löv.", extinct: "~12 000 år sedan", extinctYearsAgo: 12_000, baseKm: 20, emoji: "🦥" },
  { id: "brachiosaurus", name: "Brachiosaurus", scientific: "Brachiosaurus altithorax", phylopic: "brachiosaurus altithorax", fact: "Långhalsad växtätare som kunde bli 13 meter hög – kunde titta in genom ett fönster på fjärde våningen.", extinct: "~150 milj. år sedan", extinctYearsAgo: 150_000_000, baseKm: 40, emoji: "🦕" },
  { id: "elephant-bird", name: "Elefantfågel", scientific: "Aepyornis maximus", phylopic: "aepyornis maximus", fact: "Världens tyngsta fågel, upp till 700 kg, från Madagaskar. Äggen rymde över åtta liter.", extinct: "~1 000 år sedan", extinctYearsAgo: 1000, baseKm: 14, emoji: "🥚" },
  { id: "glyptodon", name: "Glyptodon", scientific: "Glyptodon", phylopic: "glyptodon", fact: "Jättebälta stor som en småbil, skyddad av ett skal av hundratals benplattor.", extinct: "~10 000 år sedan", extinctYearsAgo: 10_000, baseKm: 12, emoji: "🐢" },
];
