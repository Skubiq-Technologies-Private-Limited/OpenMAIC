import type { SceneOutline } from '@/lib/types/generation';

export const OUTLINE_CACHE_ARTIFACT_KEY = 'default';

export interface CachedOutlineResult {
  outlines: SceneOutline[];
  languageDirective: string;
  courseTitle?: string;
  taskEngineMode: boolean;
}

/** SSE encoder helper: replay a cached outline bundle as if it were streamed live. */
export function encodeOutlineCacheSseEvents(
  payload: CachedOutlineResult,
): string[] {
  const events: string[] = [];

  events.push(
    JSON.stringify({ type: 'languageDirective', data: payload.languageDirective }),
  );

  if (payload.courseTitle) {
    events.push(JSON.stringify({ type: 'courseTitle', data: payload.courseTitle }));
  }

  payload.outlines.forEach((outline, index) => {
    events.push(JSON.stringify({ type: 'outline', data: outline, index }));
  });

  events.push(
    JSON.stringify({
      type: 'done',
      outlines: payload.outlines,
      languageDirective: payload.languageDirective,
      courseTitle: payload.courseTitle,
      taskEngineMode: payload.taskEngineMode,
    }),
  );

  return events;
}
