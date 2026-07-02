import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isValidClassroomId, readClassroom } from '@/lib/server/classroom-storage';
import {
  getLmsBuildConfig,
  getLmsCourseRequirement,
  getLmsRequirementParams,
} from '@/lib/constants/lms-entry';
import { getLmsPdfDir, getLmsPdfPreview } from '@/lib/server/lms-pdf';
import { isGenerationCacheEnabled } from '@/lib/server/generation-cache';
import { createLogger } from '@/lib/logger';

const log = createLogger('LMS Build Preview');

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function GET(req: NextRequest) {
  let courseId: string | undefined;
  try {
    courseId = req.nextUrl.searchParams.get('courseId')?.trim() || undefined;
    if (!courseId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'courseId is required');
    }
    if (!isValidClassroomId(courseId)) {
      return apiError('INVALID_REQUEST', 400, 'Invalid courseId');
    }

    const existing = await readClassroom(courseId);
    const alreadyGenerated =
      !!existing?.generationComplete &&
      Array.isArray(existing.scenes) &&
      existing.scenes.length > 0;

    const config = getLmsBuildConfig();
    const pdf = await getLmsPdfPreview(courseId);
    const pdfProvider = process.env.LMS_PDF_PROVIDER?.trim() || 'unpdf';

    return apiSuccess({
      courseId,
      alreadyGenerated,
      existingCourseTitle: existing?.stage?.name ?? null,
      sceneCount: existing?.scenes?.length ?? 0,
      config,
      requirement: getLmsCourseRequirement(),
      requirementParams: getLmsRequirementParams(),
      pdf: {
        ...pdf,
        fileSizeLabel: pdf.fileSizeBytes != null ? formatBytes(pdf.fileSizeBytes) : null,
        pdfDir: getLmsPdfDir(),
        provider: pdfProvider,
      },
      generationCacheEnabled: isGenerationCacheEnabled(),
    });
  } catch (error) {
    log.error(`LMS build preview failed [courseId=${courseId ?? 'unknown'}]:`, error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Failed to load build preview',
    );
  }
}
