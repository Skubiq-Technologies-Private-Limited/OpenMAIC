import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isValidClassroomId } from '@/lib/server/classroom-storage';
import { describeLmsPdfLocation, parseLmsPdfForCourse } from '@/lib/server/lms-pdf';
import { createLogger } from '@/lib/logger';

const log = createLogger('LMS Parse PDF');

function isEnvTrue(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === 'true';
}

export async function POST(req: NextRequest) {
  let courseId: string | undefined;
  try {
    const body = await req.json();
    courseId = typeof body.courseId === 'string' ? body.courseId.trim() : undefined;

    if (!courseId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'courseId is required');
    }
    if (!isValidClassroomId(courseId)) {
      return apiError('INVALID_REQUEST', 400, 'Invalid courseId');
    }

    const parsed = await parseLmsPdfForCourse(courseId);
    if (!parsed) {
      if (isEnvTrue('LMS_PDF_REQUIRED')) {
        return apiError(
          'MISSING_REQUIRED_FIELD',
          404,
          `No PDF configured for course "${courseId}". ${describeLmsPdfLocation(courseId)}`,
        );
      }
      return apiSuccess({
        data: null,
        message: `No PDF configured. ${describeLmsPdfLocation(courseId)}`,
      });
    }

    return apiSuccess({ data: parsed, cached: false });
  } catch (error) {
    log.error(`LMS PDF parse failed [courseId=${courseId ?? 'unknown'}]:`, error);
    return apiError(
      'PARSE_FAILED',
      500,
      error instanceof Error ? error.message : 'PDF parsing failed',
    );
  }
}
