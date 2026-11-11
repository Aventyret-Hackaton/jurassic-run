import type { LngLat } from "../lib/shape";

export interface City { name: string; at: LngLat }

/** Förinställda platser för demon. Lägg till fler här. */
export const CITIES: City[] = [
  { name: "Stockholm", at: [18.0686, 59.3293] },
  { name: "Göteborg", at: [11.9746, 57.7089] },
  { name: "New York", at: [-73.9857, 40.7484] },
  { name: "London", at: [-0.1276, 51.5072] },
  { name: "Paris", at: [2.3522, 48.8566] },
  { name: "Tokyo", at: [139.6917, 35.6895] },
  { name: "Berlin", at: [13.405, 52.52] },
];
