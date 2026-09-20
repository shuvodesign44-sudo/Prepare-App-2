// Browser-only live speech coaching: interim transcription (where supported)
// plus filler-word and pace heuristics. Nothing here leaves the device.

const FILLERS = [
  "um",
  "uh",
  "erm",
  "er",
  "ah",
  "hmm",
  "like",
  "actually",
  "basically",
  "literally",
  "you know",
  "i mean",
  "sort of",
  "kind of",
  "mane",
  "mane je",
  "ei je",
  "thik ache",
];

export interface LiveSpeechStats {
  words: number;
  fillers: number;
  fillerWords: string[];
}

export function analyseSpeech(text: string): LiveSpeechStats {
  const lower = ` ${text.toLowerCase().replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ")} `;
  const words = lower.trim() ? lower.trim().split(" ").length : 0;
  const found: string[] = [];
  let fillers = 0;
  for (const filler of FILLERS) {
    const matches = lower.split(` ${filler} `).length - 1;
    if (matches > 0) {
      fillers += matches;
      found.push(filler);
    }
  }
  return { words, fillers, fillerWords: found.slice(0, 4) };
}

type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: (() => void) | null;
};

export function isLiveTranscriptSupported() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Streams a rolling transcript of the current utterance. Returns null when unsupported. */
export function startLiveTranscript(
  onText: (text: string) => void,
  lang = "en-US",
): { stop: () => void } | null {
  if (!isLiveTranscriptSupported()) return null;
  const w = window as unknown as Record<string, new () => RecognitionLike>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;

  let finalText = "";
  recognition.onresult = (event: unknown) => {
    const results = (event as { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> })
      .results;
    let interim = "";
    for (let i = 0; i < results.length; i += 1) {
      const result = results[i];
      const text = result[0]?.transcript ?? "";
      if (result.isFinal) finalText += ` ${text}`;
      else interim += ` ${text}`;
    }
    onText(`${finalText} ${interim}`.trim());
  };
  recognition.onerror = () => {};

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    },
  };
}
