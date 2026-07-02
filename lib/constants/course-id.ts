/**
 * Course / classroom id validation (URL segment + storage key).
 * Allows PDF-style names e.g. `chapter-8-forces.pdf`.
 */
export const COURSE_ID_PATTERN = /^[a-zA-Z0-9_.-]+$/;

const MAX_COURSE_ID_LENGTH = 200;

export function isValidCourseId(id: string): boolean {
  if (!id || id.length > MAX_COURSE_ID_LENGTH) return false;
  if (id.includes('..') || id.includes('/') || id.includes('\\')) return false;
  return COURSE_ID_PATTERN.test(id);
}
