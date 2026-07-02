import { createLogger } from '@/lib/logger';
import { isGenerationCacheEnabled } from './config';
import { readDbCache, writeDbCache } from './db';
import { readJsonCache, writeJsonCache } from './json-store';
import type { GenerationArtifactType, GenerationCacheRecord } from './types';
import type { ImageGenerationResult } from '@/lib/media/types';

export type { GenerationArtifactType, GenerationCacheWriteInput } from './types';
export { resolveCourseId } from './course-id';
export { isGenerationCacheEnabled, getGenerationCacheJsonDir, getDatabaseUrl } from './config';
export { closeGenerationCachePool } from './db';

const log = createLogger('GenerationCache');

/**
 * Read order: bundled JSON files first, then Postgres.
 */
export async function readGenerationCache(
  courseId: string,
  artifactType: GenerationArtifactType,
  artifactKey: string,
): Promise<GenerationCacheRecord | null> {
  const fromJson = await readJsonCache(courseId, artifactType, artifactKey);
  if (fromJson) {
    log.debug(`JSON cache hit: ${courseId}/${artifactType}/${artifactKey}`);
    return fromJson;
  }

  const fromDb = await readDbCache(courseId, artifactType, artifactKey);
  if (fromDb) {
    log.debug(`DB cache hit: ${courseId}/${artifactType}/${artifactKey}`);
  }
  return fromDb;
}

export async function writeGenerationCache(input: {
  courseId: string;
  artifactType: GenerationArtifactType;
  artifactKey: string;
  payloadJson: Record<string, unknown>;
  payloadBlob?: Buffer | null;
  mimeType?: string | null;
  courseTitle?: string | null;
}): Promise<void> {
  await Promise.all([
    writeDbCache(input),
    writeJsonCache(input),
  ]);
}

/**
 * Route-level cache helper.
 * Skips cache when disabled or courseId is missing.
 */
export async function withGenerationCache<T extends Record<string, unknown>>(options: {
  courseId: string | undefined;
  artifactType: GenerationArtifactType;
  artifactKey: string;
  courseTitle?: string | null;
  generate: () => Promise<T>;
  toCachePayload?: (result: T) => {
    payloadJson: Record<string, unknown>;
    payloadBlob?: Buffer | null;
    mimeType?: string | null;
  };
}): Promise<T> {
  const { courseId, artifactType, artifactKey, generate, toCachePayload, courseTitle } = options;

  if (!isGenerationCacheEnabled() || !courseId) {
    return generate();
  }

  const cached = await readGenerationCache(courseId, artifactType, artifactKey);
  if (cached?.payloadJson) {
    return cached.payloadJson as T;
  }

  const result = await generate();

  const cachePayload = toCachePayload
    ? toCachePayload(result)
    : { payloadJson: result as Record<string, unknown> };

  void writeGenerationCache({
    courseId,
    artifactType,
    artifactKey,
    courseTitle,
    ...cachePayload,
  }).catch((error) => {
    log.warn(`Async cache write failed [${courseId}/${artifactType}/${artifactKey}]:`, error);
  });

  return result;
}

/** Extract base64 audio from a TTS API success payload and return BYTEA + json. */
export function ttsCachePayload(result: {
  audioId: string;
  base64: string;
  format: string;
}): {
  payloadJson: Record<string, unknown>;
  payloadBlob: Buffer;
  mimeType: string;
} {
  return {
    payloadJson: result,
    payloadBlob: Buffer.from(result.base64, 'base64'),
    mimeType: `audio/${result.format}`,
  };
}

/** Store image base64 in BYTEA when present. */
export function imageCachePayload(result: { result: ImageGenerationResult }): {
  payloadJson: Record<string, unknown>;
  payloadBlob?: Buffer | null;
  mimeType?: string | null;
} {
  const base64 = result.result.base64;
  return {
    payloadJson: result as Record<string, unknown>,
    payloadBlob: base64 ? Buffer.from(base64, 'base64') : null,
    mimeType: base64 ? 'image/png' : null,
  };
}
