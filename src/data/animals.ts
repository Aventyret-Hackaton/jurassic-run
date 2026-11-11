/**
 * De 20 utdöda djuren. `baseKm` är rundans längd till fots (djuret bestämmer längden).
 * I billäge multipliceras den med CAR_FACTOR.
 *
 * `phylopic` är namnet som skriptet `npm run silhouettes` söker efter på PhyloPic.
 * `wiki` är artikeltiteln på engelska Wikipedia (fakta hämtas live).
 */
export interface Animal {
  id: string;
  name: string;
  scientific: string;
  wiki: string;
  phylopic: string;
  /** Visningstext, t.ex. "1844" eller "66 milj. år sedan". */
  extinct: string;
  /** Ungefär hur många år sedan djuret dog ut (för slutrapporten). */
  extinctYearsAgo: number;
  baseKm: number;
  emoji: string;
}

export const CAR_FACTOR = 10;

export const ANIMALS: Animal[] = [
  { id: "mammoth", name: "Ullhårig mammut", scientific: "Mammuthus primigenius", wiki: "Woolly mammoth", phylopic: "mammuthus primigenius", extinct: "4 000 år sedan", extinctYearsAgo: 4000, baseKm: 25, emoji: "🦣" },
  { id: "dodo", name: "Dront", scientific: "Raphus cucullatus", wiki: "Dodo", phylopic: "raphus cucullatus", extinct: "1600-talet", extinctYearsAgo: 360, baseKm: 8, emoji: "🦤" },
  { id: "trex", name: "Tyrannosaurus", scientific: "Tyrannosaurus rex", wiki: "Tyrannosaurus", phylopic: "tyrannosaurus rex", extinct: "66 milj. år sedan", extinctYearsAgo: 66_000_000, baseKm: 30, emoji: "🦖" },
  { id: "stegosaurus", name: "Stegosaurus", scientific: "Stegosaurus", wiki: "Stegosaurus", phylopic: "stegosaurus", extinct: "~150 milj. år sedan", extinctYearsAgo: 150_000_000, baseKm: 30, emoji: "🦕" },
  { id: "triceratops", name: "Triceratops", scientific: "Triceratops", wiki: "Triceratops", phylopic: "triceratops", extinct: "66 milj. år sedan", extinctYearsAgo: 66_000_000, baseKm: 25, emoji: "🦕" },
  { id: "smilodon", name: "Sabeltandad tiger", scientific: "Smilodon fatalis", wiki: "Smilodon", phylopic: "smilodon fatalis", extinct: "~10 000 år sedan", extinctYearsAgo: 10_000, baseKm: 18, emoji: "🐯" },
  { id: "thylacine", name: "Pungvarg", scientific: "Thylacinus cynocephalus", wiki: "Thylacine", phylopic: "thylacinus cynocephalus", extinct: "1936", extinctYearsAgo: 90, baseKm: 15, emoji: "🐺" },
  { id: "irish-elk", name: "Jättehjort", scientific: "Megaloceros giganteus", wiki: "Irish elk", phylopic: "megaloceros giganteus", extinct: "~7 700 år sedan", extinctYearsAgo: 7700, baseKm: 22, emoji: "🦌" },
  { id: "moa", name: "Jättemoa", scientific: "Dinornis robustus", wiki: "Dinornis", phylopic: "dinornis robustus", extinct: "1400-talet", extinctYearsAgo: 580, baseKm: 14, emoji: "🐦" },
  { id: "great-auk", name: "Garfågel", scientific: "Pinguinus impennis", wiki: "Great auk", phylopic: "pinguinus impennis", extinct: "1844", extinctYearsAgo: 182, baseKm: 10, emoji: "🐧" },
  { id: "sea-cow", name: "Stellers sjöko", scientific: "Hydrodamalis gigas", wiki: "Steller's sea cow", phylopic: "hydrodamalis gigas", extinct: "1768", extinctYearsAgo: 258, baseKm: 20, emoji: "🐋" },
  { id: "passenger-pigeon", name: "Vandringsduva", scientific: "Ectopistes migratorius", wiki: "Passenger pigeon", phylopic: "ectopistes migratorius", extinct: "1914", extinctYearsAgo: 112, baseKm: 8, emoji: "🕊️" },
  { id: "woolly-rhino", name: "Ullhårig noshörning", scientific: "Coelodonta antiquitatis", wiki: "Woolly rhinoceros", phylopic: "coelodonta antiquitatis", extinct: "~14 000 år sedan", extinctYearsAgo: 14_000, baseKm: 20, emoji: "🦏" },
  { id: "aurochs", name: "Uroxe", scientific: "Bos primigenius", wiki: "Aurochs", phylopic: "bos primigenius", extinct: "1627", extinctYearsAgo: 399, baseKm: 18, emoji: "🐂" },
  { id: "quagga", name: "Quagga", scientific: "Equus quagga quagga", wiki: "Quagga", phylopic: "equus quagga quagga", extinct: "1883", extinctYearsAgo: 143, baseKm: 16, emoji: "🦓" },
  { id: "megatherium", name: "Jättesengångare", scientific: "Megatherium americanum", wiki: "Megatherium", phylopic: "megatherium americanum", extinct: "~12 000 år sedan", extinctYearsAgo: 12_000, baseKm: 20, emoji: "🦥" },
  { id: "brachiosaurus", name: "Brachiosaurus", scientific: "Brachiosaurus altithorax", wiki: "Brachiosaurus", phylopic: "brachiosaurus altithorax", extinct: "~150 milj. år sedan", extinctYearsAgo: 150_000_000, baseKm: 40, emoji: "🦕" },
  { id: "trilobite", name: "Trilobit", scientific: "Trilobita", wiki: "Trilobite", phylopic: "trilobita", extinct: "252 milj. år sedan", extinctYearsAgo: 252_000_000, baseKm: 6, emoji: "🪲" },
  { id: "elephant-bird", name: "Elefantfågel", scientific: "Aepyornis maximus", wiki: "Aepyornis", phylopic: "aepyornis maximus", extinct: "~1 000 år sedan", extinctYearsAgo: 1000, baseKm: 14, emoji: "🥚" },
  { id: "glyptodon", name: "Glyptodon", scientific: "Glyptodon", wiki: "Glyptodon", phylopic: "glyptodon", extinct: "~10 000 år sedan", extinctYearsAgo: 10_000, baseKm: 12, emoji: "🐢" },
];
