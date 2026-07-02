import { Pool } from 'pg';
import { createLogger } from '@/lib/logger';
import type {
  GenerationArtifactType,
  GenerationCacheRecord,
  GenerationCacheWriteInput,
} from './types';
import { getDatabaseUrl } from './config';

const log = createLogger('GenerationCacheDB');

let pool: Pool | null = null;
let poolInitFailed = false;

function getPool(): Pool | null {
  if (poolInitFailed) return null;
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  if (!pool) {
    try {
      pool = new Pool({ connectionString: databaseUrl });
      pool.on('error', (error) => {
        log.error('Postgres pool error:', error);
      });
    } catch (error) {
      poolInitFailed = true;
      log.error('Failed to create Postgres pool:', error);
      return null;
    }
  }

  return pool;
}

export async function readDbCache(
  courseId: string,
  artifactType: GenerationArtifactType,
  artifactKey: string,
): Promise<GenerationCacheRecord | null> {
  const client = getPool();
  if (!client) return null;

  try {
    const result = await client.query<{
      payload_json: Record<string, unknown>;
      payload_blob: Buffer | null;
      mime_type: string | null;
    }>(
      `SELECT payload_json, payload_blob, mime_type
       FROM course_generation_artifacts
       WHERE course_id = $1 AND artifact_type = $2 AND artifact_key = $3`,
      [courseId, artifactType, artifactKey],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      payloadJson: row.payload_json,
      payloadBlob: row.payload_blob,
      mimeType: row.mime_type,
    };
  } catch (error) {
    log.warn(
      `DB cache read failed [course=${courseId}, type=${artifactType}, key=${artifactKey}]:`,
      error,
    );
    return null;
  }
}

export async function writeDbCache(input: GenerationCacheWriteInput): Promise<void> {
  const client = getPool();
  if (!client) return;

  const byteSize = input.payloadBlob?.byteLength ?? null;

  try {
    await client.query(
      `INSERT INTO courses (id, title, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (id) DO UPDATE
         SET title = COALESCE(EXCLUDED.title, courses.title),
             updated_at = now()`,
      [input.courseId, input.courseTitle ?? null],
    );

    await client.query(
      `INSERT INTO course_generation_artifacts (
         course_id, artifact_type, artifact_key,
         payload_json, payload_blob, mime_type, byte_size
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (course_id, artifact_type, artifact_key) DO UPDATE
         SET payload_json = EXCLUDED.payload_json,
             payload_blob = EXCLUDED.payload_blob,
             mime_type = EXCLUDED.mime_type,
             byte_size = EXCLUDED.byte_size,
             created_at = now()`,
      [
        input.courseId,
        input.artifactType,
        input.artifactKey,
        input.payloadJson,
        input.payloadBlob ?? null,
        input.mimeType ?? null,
        byteSize,
      ],
    );
  } catch (error) {
    log.warn(
      `DB cache write failed [course=${input.courseId}, type=${input.artifactType}, key=${input.artifactKey}]:`,
      error,
    );
  }
}

/** Close the pool — used in tests. */
export async function closeGenerationCachePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
  poolInitFailed = false;
}
