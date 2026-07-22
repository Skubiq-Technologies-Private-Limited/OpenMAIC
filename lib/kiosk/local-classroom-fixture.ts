/**
 * LOCAL TEST ONLY — bypasses `GET /api/classroom` when enabled.
 *
 * 1. Set `USE_LOCAL_KIOSK_FIXTURE` below to `true`, OR
 *    build with `NEXT_PUBLIC_KIOSK_LOCAL_FIXTURE=true`
 * 2. Replace the import with your course JSON (same shape as `data/classrooms/*.json`),
 *    or copy a file from `data/classrooms/` into `lib/kiosk/fixtures/` for local use.
 */
import courseJson from './fixtures/sample-classroom.json';

/** Flip to `true` for quick local UI testing without Flutter / test server. */
export const USE_LOCAL_KIOSK_FIXTURE =
  process.env.NEXT_PUBLIC_KIOSK_LOCAL_FIXTURE === 'true';

/** Swap the import above to point at a different course file. */
export const localKioskClassroomJson = courseJson;
