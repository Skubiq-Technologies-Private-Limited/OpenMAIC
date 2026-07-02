#!/usr/bin/env node
/**
 * Export generation-cache rows from Postgres into JSON files that the app
 * reads before querying the database.
 *
 * Output layout (matches lib/server/generation-cache/json-store.ts):
 *   {outDir}/{courseId}/{artifactType}/{artifactKey}.json
 *
 * Usage:
 *   node scripts/export-generation-cache.mjs --id <classroomId>
 *   node scripts/export-generation-cache.mjs --all
 *   node scripts/export-generation-cache.mjs --id abc123 --out ./data/generation-cache
 *
 * Requires DATABASE_URL (env or .env.local).
 */

import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  try {
    const raw = readFileSync(envPath, 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local optional
  }
}

function parseArgs(argv) {
  const options = {
    courseId: undefined,
    all: false,
    outDir: path.join(process.cwd(), 'data', 'generation-cache'),
    databaseUrl: undefined,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--id' || arg === '-i') {
      options.courseId = argv[++i];
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--out' || arg === '-o') {
      options.outDir = path.resolve(argv[++i]);
    } else if (arg === '--database-url') {
      options.databaseUrl = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Export Postgres generation cache to JSON files.

Options:
  --id, -i <classroomId>   Export one course (classroom id)
  --all                    Export every course in the database
  --out, -o <dir>          Output directory (default: ./data/generation-cache)
  --database-url <url>     Override DATABASE_URL
  --help, -h               Show this help

Examples:
  node scripts/export-generation-cache.mjs --id abc123
  node scripts/export-generation-cache.mjs --all --out ./bundles/cache
`);
}

function safeArtifactKey(artifactKey) {
  return artifactKey.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function jsonFilePath(outDir, courseId, artifactType, artifactKey) {
  return path.join(outDir, courseId, artifactType, `${safeArtifactKey(artifactKey)}.json`);
}

function rowToEnvelope(row) {
  const envelope = {
    payloadJson: row.payload_json,
    mimeType: row.mime_type ?? null,
  };

  if (row.payload_blob && row.payload_blob.length > 0) {
    envelope.payloadBlobBase64 = Buffer.from(row.payload_blob).toString('base64');
  }

  return envelope;
}

async function writeEnvelopeAtomic(filePath, envelope) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(envelope), 'utf-8');
  await fs.rename(tempPath, filePath);
}

async function exportCourse(pool, courseId, outDir) {
  const result = await pool.query(
    `SELECT artifact_type, artifact_key, payload_json, payload_blob, mime_type
     FROM course_generation_artifacts
     WHERE course_id = $1
     ORDER BY artifact_type, artifact_key`,
    [courseId],
  );

  if (result.rows.length === 0) {
    console.warn(`No artifacts found for course "${courseId}".`);
    return 0;
  }

  let written = 0;
  for (const row of result.rows) {
    const filePath = jsonFilePath(outDir, courseId, row.artifact_type, row.artifact_key);
    await writeEnvelopeAtomic(filePath, rowToEnvelope(row));
    written++;
  }

  return written;
}

async function listCourseIds(pool) {
  const result = await pool.query(
    `SELECT DISTINCT course_id
     FROM course_generation_artifacts
     ORDER BY course_id`,
  );
  return result.rows.map((row) => row.course_id);
}

async function main() {
  loadEnvLocal();
  const options = parseArgs(process.argv.slice(2));

  if (!options.all && !options.courseId) {
    console.error('Provide --id <classroomId> or --all.');
    printHelp();
    process.exit(1);
  }

  const databaseUrl = options.databaseUrl || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set. Add it to .env.local or pass --database-url.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const courseIds = options.all ? await listCourseIds(pool) : [options.courseId];

    if (courseIds.length === 0) {
      console.log('No courses found in course_generation_artifacts.');
      return;
    }

    let totalFiles = 0;
    for (const courseId of courseIds) {
      const count = await exportCourse(pool, courseId, options.outDir);
      totalFiles += count;
      console.log(`Exported ${count} artifact(s) for "${courseId}" → ${options.outDir}`);
    }

    console.log(`Done. ${totalFiles} JSON file(s) written. The app reads these before Postgres.`);
  } finally {
    await pool.end();
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  main().catch((error) => {
    console.error('Export failed:', error);
    process.exit(1);
  });
}
