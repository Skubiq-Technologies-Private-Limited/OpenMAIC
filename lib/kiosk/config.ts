/**
 * Kiosk folder playback mode.
 *
 * When enabled, OpenMAIC loads courses from intercepted `/api/classroom` and
 * `/api/classroom-media/*` responses (served by a host shell such as Flutter)
 * without writing course blobs to IndexedDB.
 *
 * Set `NEXT_PUBLIC_KIOSK_FOLDER_MODE=true` at build time for kiosk bundles.
 */
export function isKioskFolderMode(): boolean {
  return process.env.NEXT_PUBLIC_KIOSK_FOLDER_MODE === 'true';
}

/** Relative URL for a file under `data/classrooms/{id}/` on the host filesystem. */
export function classroomMediaUrl(classroomId: string, subPath: string): string {
  const segments = subPath.split('/').map((s) => encodeURIComponent(s)).join('/');
  return `/api/classroom-media/${encodeURIComponent(classroomId)}/${segments}`;
}

/** Subfolder under `{courseId}/` for generation-cache TTS JSON files. */
export const KIOSK_TTS_SUBDIR = 'tts';

/** TTS cache files use the generation-cache JSON envelope (not raw mp3). */
export const KIOSK_TTS_CACHE_EXT = 'json';

/** Default image extension for generated slide media placeholders. */
export const KIOSK_DEFAULT_IMAGE_EXT = 'png';

/** Default video extension for generated slide media placeholders. */
export const KIOSK_DEFAULT_VIDEO_EXT = 'mp4';

/** @deprecated Use KIOSK_TTS_CACHE_EXT — kiosk TTS is JSON, not mp3. */
export const KIOSK_DEFAULT_AUDIO_EXT = KIOSK_TTS_CACHE_EXT;
