'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isValidLmsCourseId } from '@/lib/constants/lms-entry';
import { createLogger } from '@/lib/logger';

const log = createLogger('Course');

/**
 * Playback-only entry: `/course/[courseId]`
 *
 * For external LMS UIs — opens an already-generated course with no prompt,
 * PDF, or generation flow. Requires `data/classrooms/{courseId}.json`
 * (written when generation completes).
 *
 * Build / first-time generation: use `/lms/[courseId]` instead.
 */
export default function CoursePlaybackEntryPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string | undefined;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      setError('Missing course id');
      return;
    }

    if (!isValidLmsCourseId(courseId)) {
      setError('Invalid course id');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/classroom?id=${encodeURIComponent(courseId)}`);
        const json = await res.json().catch(() => ({}));

        const classroom = json.classroom;
        const ready =
          res.ok &&
          json.success &&
          classroom?.generationComplete &&
          Array.isArray(classroom.scenes) &&
          classroom.scenes.length > 0;

        if (ready) {
          if (!cancelled) {
            router.replace(`/classroom/${courseId}`);
          }
          return;
        }

        if (!cancelled) {
          setError(
            res.status === 404
              ? `Course "${courseId}" has not been generated yet. Run /lms/${courseId} once to build it.`
              : json.error || `Course "${courseId}" is not ready for playback.`,
          );
        }
      } catch (err) {
        log.error('Course playback entry failed:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load course');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, router]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <p className="text-destructive text-sm text-center max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <p className="text-muted-foreground text-sm">Opening course…</p>
    </div>
  );
}
