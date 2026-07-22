import path from 'path';
import { CLASSROOMS_DIR } from '@/lib/server/classroom-storage';
import { getGenerationCacheJsonDir } from '@/lib/server/generation-cache/config';

const ALLOWED_SUBDIRS = new Set(['media', 'audio', 'tts']);

export interface ClassroomMediaPathResolution {
  filePath: string;
  resolvedBase: string;
  fallback?: { filePath: string; resolvedBase: string };
}

export function isAllowedClassroomMediaSubdir(subDir: string): boolean {
  return ALLOWED_SUBDIRS.has(subDir);
}

/**
 * Resolve a classroom-media file on disk.
 *
 * - `media/` and `audio/` → `{classrooms}/{courseId}/...`
 * - `tts/` → `{classrooms}/{courseId}/tts/...`, then `{generation-cache}/{courseId}/tts/...`
 */
export function resolveClassroomMediaFilePath(
  classroomId: string,
  pathSegments: string[],
): ClassroomMediaPathResolution | null {
  const subDir = pathSegments[0];
  if (!isAllowedClassroomMediaSubdir(subDir)) return null;

  const primary = {
    filePath: path.join(CLASSROOMS_DIR, classroomId, ...pathSegments),
    resolvedBase: path.resolve(CLASSROOMS_DIR, classroomId),
  };

  if (subDir !== 'tts') return primary;

  return {
    ...primary,
    fallback: {
      filePath: path.join(getGenerationCacheJsonDir(), classroomId, ...pathSegments),
      resolvedBase: path.resolve(getGenerationCacheJsonDir(), classroomId),
    },
  };
}
