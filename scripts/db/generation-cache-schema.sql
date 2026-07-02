-- OpenMAIC generation cache schema
-- Run once against your Postgres database, e.g.:
--   psql "$DATABASE_URL" -f scripts/db/generation-cache-schema.sql

CREATE TABLE IF NOT EXISTS courses (
  id          TEXT PRIMARY KEY,
  title       TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_generation_artifacts (
  course_id      TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  artifact_type  TEXT NOT NULL,
  artifact_key   TEXT NOT NULL,
  payload_json   JSONB NOT NULL,
  payload_blob   BYTEA,
  mime_type      TEXT,
  byte_size      BIGINT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, artifact_type, artifact_key)
);

CREATE INDEX IF NOT EXISTS idx_cga_course_type
  ON course_generation_artifacts (course_id, artifact_type);
