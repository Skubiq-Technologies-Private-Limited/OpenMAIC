/**
 * Resolve the course / classroom id from an API request body.
 * Accepts classroomId, stageId, or courseId (first non-empty wins).
 */
export function resolveCourseId(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const record = body as Record<string, unknown>;
  for (const key of ['classroomId', 'stageId', 'courseId'] as const) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}
