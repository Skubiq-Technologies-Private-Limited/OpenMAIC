import { isKioskFolderMode } from '@/lib/kiosk/config';
import {
  blobFromKioskTtsCache,
  isKioskTtsCacheEnvelope,
  type KioskTtsCacheEnvelope,
} from '@/lib/kiosk/tts-cache';
import { createLogger } from '@/lib/logger';

const log = createLogger('Kiosk TTS');

const blobUrlCache = new Map<string, string>();

/** True when `audioUrl` points at a folder-served generation-cache TTS JSON file. */
export function isKioskTtsCacheUrl(audioUrl: string): boolean {
  if (!isKioskFolderMode()) return false;
  try {
    const path = audioUrl.startsWith('http')
      ? new URL(audioUrl).pathname
      : audioUrl.split('?')[0] ?? audioUrl;
    return /\/tts\/[^/]+\.json$/i.test(path);
  } catch {
    return /\/tts\/[^/]+\.json$/i.test(audioUrl);
  }
}

/**
 * Fetch a TTS cache JSON file and return a blob URL suitable for `HTMLAudioElement`.
 * Results are memoized for the session to avoid re-parsing the same clip.
 */
export async function resolveKioskTtsPlaybackUrl(audioUrl: string): Promise<string | null> {
  const cached = blobUrlCache.get(audioUrl);
  if (cached) return cached;

  try {
    const res = await fetch(audioUrl);
    if (!res.ok) {
      log.warn(`TTS cache fetch failed (${res.status}): ${audioUrl}`);
      return null;
    }

    const json = (await res.json()) as unknown;
    if (!isKioskTtsCacheEnvelope(json)) {
      log.warn(`Invalid TTS cache envelope: ${audioUrl}`);
      return null;
    }

    const blob = blobFromKioskTtsCache(json as KioskTtsCacheEnvelope);
    if (!blob) {
      log.warn(`TTS cache envelope had no audio payload: ${audioUrl}`);
      return null;
    }

    const blobUrl = URL.createObjectURL(blob);
    blobUrlCache.set(audioUrl, blobUrl);
    return blobUrl;
  } catch (err) {
    log.warn(`TTS cache resolve failed for ${audioUrl}:`, err);
    return null;
  }
}

/** Test helper */
export function clearKioskTtsPlaybackCacheForTests(): void {
  for (const url of blobUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  blobUrlCache.clear();
}
