/**
 * Röstkommandon via webbläsarens Web Speech API (Chrome, Edge, Safari).
 * Saknas stöd, eller nekar användaren mikrofonen, händer ingenting – knappar
 * och tangentbord fungerar alltid som vanligt.
 */
import { useEffect, useRef, useState } from "react";

/**
 * Taligenkänningen hör sällan "Tack Chuck" rätt (ofta blir det "tack tack"), så vi är
 * generösa: något av de här orden var som helst i det som sägs räcker för att gå vidare.
 */
const GO_WORDS = /(^|\s)(tack|tackar|ok|okej|okey|okay|chuck|chuk|chock|chack|tjack|tjuck|schack|shack|jack|check)(?=\s|$)/;

export function isThanksChuck(transcript: string): boolean {
  const t = transcript.toLowerCase().replace(/[.,!?;:"'’]/g, " ").replace(/\s+/g, " ").trim();
  return GO_WORDS.test(t);
}

// Minimal typning – Web Speech API finns inte i TypeScripts DOM-typer.
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

function recognitionCtor(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Nekad mikrofon → fråga inte igen under sessionen. */
let micDenied = false;

/**
 * Lyssnar så länge `active` är sant och anropar `onThanks` när användaren säger "Tack Chuck!".
 * Returnerar true medan mikrofonen faktiskt lyssnar (för att kunna visa en ledtråd).
 */
export function useThanksChuck(active: boolean, onThanks: () => void): boolean {
  const [listening, setListening] = useState(false);
  const cb = useRef(onThanks);
  cb.current = onThanks;

  useEffect(() => {
    const Ctor = recognitionCtor();
    // Kräver stöd i webbläsaren och https/localhost; mikrofonen frågas bara om en gång.
    if (!active || !Ctor || !window.isSecureContext || micDenied) return;

    let stopped = false;
    let fired = false;
    const rec = new Ctor();
    rec.lang = "sv-SE";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!fired && isThanksChuck(e.results[i][0].transcript)) {
          fired = true;
          stopped = true;
          rec.abort();
          cb.current();
          return;
        }
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
        micDenied = true;
        stopped = true;
      }
    };
    // Webbläsaren avslutar efter en stunds tystnad – starta om så länge modalen är öppen.
    rec.onend = () => {
      setListening(false);
      if (!stopped) setTimeout(() => { if (!stopped) try { rec.start(); } catch { /* redan igång */ } }, 250);
    };

    try { rec.start(); } catch { /* ignoreras */ }
    return () => {
      stopped = true;
      rec.onend = null;
      rec.abort();
      setListening(false);
    };
  }, [active]);

  return listening;
}
