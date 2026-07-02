/**
 * Sarvam AI TTS helpers (Bulbul model).
 * @see https://docs.sarvam.ai/api-reference-docs/text-to-speech/convert
 */

export const SARVAM_TTS_PROVIDER_ID = 'sarvam-tts' as const;

export const SARVAM_DEFAULT_BASE_URL = 'https://api.sarvam.ai';

/** Bulbul v3 speakers (lowercase, case-sensitive on the API). */
export const SARVAM_V3_SPEAKER_IDS = [
  'shubh',
  'aditya',
  'ritu',
  'priya',
  'neha',
  'rahul',
  'pooja',
  'rohan',
  'simran',
  'kavya',
  'amit',
  'dev',
  'ishita',
  'shreya',
  'ratan',
  'varun',
  'manan',
  'sumit',
  'roopa',
  'kabir',
  'aayan',
  'ashutosh',
  'advait',
  'anand',
  'tanya',
  'tarun',
  'sunny',
  'mani',
  'gokul',
  'vijay',
  'shruti',
  'suhani',
  'mohit',
  'kavitha',
  'rehan',
  'soham',
  'rupali',
] as const;

/** Bulbul v2 speakers. */
export const SARVAM_V2_SPEAKER_IDS = [
  'anushka',
  'manisha',
  'vidya',
  'arya',
  'abhilash',
  'karun',
  'hitesh',
] as const;

const SARVAM_LANGUAGE_MAP: Record<string, string> = {
  hi: 'hi-IN',
  en: 'en-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  pa: 'pa-IN',
  od: 'od-IN',
  or: 'od-IN',
};

/** Match language names inside natural-language directives (e.g. outline languageDirective). */
const SARVAM_LANGUAGE_NAMES: Record<string, string> = {
  kannada: 'kn-IN',
  hindi: 'hi-IN',
  english: 'en-IN',
  bengali: 'bn-IN',
  tamil: 'ta-IN',
  telugu: 'te-IN',
  gujarati: 'gu-IN',
  malayalam: 'ml-IN',
  marathi: 'mr-IN',
  punjabi: 'pa-IN',
  odia: 'od-IN',
  oriya: 'od-IN',
};

/** Map OpenMAIC locale / course language codes to Sarvam BCP-47 target_language_code. */
export function mapLanguageToSarvamTarget(language?: string): string | undefined {
  if (!language?.trim()) return undefined;
  const normalized = language.trim();

  const parenMatch = normalized.match(/\(([a-z]{2}-[A-Z]{2})\)/);
  if (parenMatch) return parenMatch[1];

  const direct = SARVAM_LANGUAGE_MAP[normalized.toLowerCase()];
  if (direct) return direct;
  if (/^[a-z]{2}-[A-Z]{2}$/.test(normalized)) return normalized;

  const lower = normalized.toLowerCase();
  for (const [name, code] of Object.entries(SARVAM_LANGUAGE_NAMES)) {
    if (lower.includes(name)) return code;
  }

  return undefined;
}
