'use client';

import type { Scene } from '@/lib/types/stage';
import type { SpeechAction } from '@/lib/types/action';
import { generateAndStoreTTS } from '@/lib/hooks/use-scene-generator';
import {
  audioExistsBulk,
  isManagedTtsActive,
  resolveSpeechAudioId,
} from '@/lib/audio/regenerate-speech-tts';
import { createLogger } from '@/lib/logger';

const log = createLogger('LMS TTS Hydrate');

/**
 * For finished courses loaded from a server snapshot (or replay after IndexedDB
 * was cleared): pull missing narration audio from the generation cache via
 * `/api/generate/tts` and store in IndexedDB. Cache hits avoid synthesis cost.
 */
export async function hydrateCachedTtsForPlayback(
  scenes: Scene[],
  options: { stageId: string; languageDirective?: string },
): Promise<void> {
  if (!isManagedTtsActive()) return;

  const lines: Array<{ audioId: string; text: string }> = [];

  for (const scene of scenes) {
    for (const action of scene.actions ?? []) {
      if (action.type !== 'speech' || !(action as SpeechAction).text) continue;
      const speech = action as SpeechAction;
      const audioId = resolveSpeechAudioId(scene.order, speech);
      lines.push({ audioId, text: speech.text });
    }
  }

  if (lines.length === 0) return;

  const have = await audioExistsBulk(lines.map((l) => l.audioId));
  const missing = lines.filter((l) => !have.has(l.audioId));
  if (missing.length === 0) return;

  log.info(
    `Hydrating ${missing.length} TTS clip(s) for playback [stage=${options.stageId}]`,
  );

  for (const { audioId, text } of missing) {
    try {
      await generateAndStoreTTS(
        audioId,
        text,
        options.languageDirective,
        undefined,
        undefined,
        options.stageId,
      );
    } catch (err) {
      log.warn(`TTS hydrate failed for ${audioId}:`, err);
    }
  }
}
