import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';
import type { GenerationArtifactType, GenerationCacheRecord } from './types';
import { getGenerationCacheJsonDir } from './config';

const log = createLogger('GenerationCacheJSON');

interface JsonCacheEnvelope {
  payloadJson: Record<string, unknown>;
  payloadBlobBase64?: string;
  mimeType?: string | null;
}

function jsonFilePath(
  courseId: string,
  artifactType: GenerationArtifactType,
  artifactKey: string,
): string {
  const safeKey = artifactKey.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(
    getGenerationCacheJsonDir(),
    courseId,
    artifactType,
    `${safeKey}.json`,
  );
}

export async function readJsonCache(
  courseId: string,
  artifactType: GenerationArtifactType,
  artifactKey: string,
): Promise<GenerationCacheRecord | null> {
  const filePath = jsonFilePath(courseId, artifactType, artifactKey);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const envelope = JSON.parse(raw) as JsonCacheEnvelope;
    if (!envelope?.payloadJson || typeof envelope.payloadJson !== 'object') return null;

    const payloadBlob = envelope.payloadBlobBase64
      ? Buffer.from(envelope.payloadBlobBase64, 'base64')
      : null;

    return {
      payloadJson: envelope.payloadJson,
      payloadBlob,
      mimeType: envelope.mimeType ?? null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    log.warn(`Failed to read JSON cache ${filePath}:`, error);
    return null;
  }
}

export async function writeJsonCache(input: {
  courseId: string;
  artifactType: GenerationArtifactType;
  artifactKey: string;
  payloadJson: Record<string, unknown>;
  payloadBlob?: Buffer | null;
  mimeType?: string | null;
}): Promise<void> {
  const filePath = jsonFilePath(input.courseId, input.artifactType, input.artifactKey);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const envelope: JsonCacheEnvelope = {
    payloadJson: input.payloadJson,
    mimeType: input.mimeType ?? null,
    ...(input.payloadBlob
      ? { payloadBlobBase64: input.payloadBlob.toString('base64') }
      : {}),
  };

  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(envelope), 'utf-8');
  await fs.rename(tempPath, filePath);
}
