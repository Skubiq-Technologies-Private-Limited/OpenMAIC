'use client';

import { useStageStore } from '@/lib/store/stage';
import { createLogger } from '@/lib/logger';

const log = createLogger('LMS');

/**
 * Persist a finished classroom to server-side storage (`data/classrooms/{id}.json`)
 * so `/classroom/{id}` can hydrate without generation on any device.
 */
export async function persistClassroomSnapshot(): Promise<boolean> {
  const { stage, scenes, outlines, generationComplete } = useStageStore.getState();
  if (!stage?.id || !generationComplete || scenes.length === 0) {
    return false;
  }

  try {
    const res = await fetch('/api/classroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage,
        scenes,
        outlines,
        generationComplete: true,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      log.warn('Classroom snapshot persist failed:', data.error ?? res.statusText);
      return false;
    }

    log.info(`Classroom snapshot persisted: ${stage.id}`);
    return true;
  } catch (error) {
    log.warn('Classroom snapshot persist error:', error);
    return false;
  }
}
