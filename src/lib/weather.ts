/** Aktuellt väder från Open-Meteo för flera platser i ett anrop (visas i platsväljaren). */
import type { LngLat } from "./shape";

export interface Weather { temp: number; wind: number; icon: string; label: string }

export async function currentWeather(points: LngLat[]): Promise<(Weather | null)[]> {
  if (!points.length) return [];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${points.map((p) => p[1].toFixed(3)).join(",")}&longitude=${points.map((p) => p[0].toFixed(3)).join(",")}&current=temperature_2m,weather_code,wind_speed_10m&wind_speed_unit=ms`;
  const data = await (await fetch(url)).json();
  const arr = Array.isArray(data) ? data : [data];
  return points.map((_, i) => {
    const c = arr[i]?.current;
    if (!c) return null;
    const [icon, label] = describe(c.weather_code);
    return { temp: Math.round(c.temperature_2m), wind: Math.round(c.wind_speed_10m), icon, label };
  });
}

/** WMO-väderkod → ikon och text. */
function describe(code: number): [string, string] {
  if (code === 0) return ["☀️", "Klart"];
  if (code <= 2) return ["🌤️", "Lätt molnigt"];
  if (code === 3) return ["☁️", "Mulet"];
  if (code === 45 || code === 48) return ["🌫️", "Dimma"];
  if (code >= 51 && code <= 67) return ["🌧️", "Regn"];
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ["🌨️", "Snö"];
  if (code >= 80 && code <= 82) return ["🌦️", "Skurar"];
  if (code >= 95) return ["⛈️", "Åska"];
  return ["🌡️", "Väder"];
}
