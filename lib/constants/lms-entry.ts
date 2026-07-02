/**
 * LMS entry configuration.
 *
 * Chapter PDF (parsed once, cached under generation-cache/{courseId}/pdf_parse/):
 *   Place at `{LMS_PDF_DIR}/{courseId}` when the URL id is the full filename
 *   (e.g. `/lms/chapter-forces.pdf` → `data/lms-pdfs/chapter-forces.pdf`).
 *   Or `{LMS_PDF_DIR}/{courseId}.pdf` when the URL id has no `.pdf` suffix.
 *   Or set `LMS_PDF_DEFAULT` in `.env.local` to use one PDF for every course id.
 *
 * Routes:
 *   /lms/{courseId}     — build course (confirm → prompt + PDF + generation)
 *   /course/{courseId}  — playback only (external LMS links here)
 *   /classroom/{courseId} — full classroom UI (loads snapshot or IndexedDB)
 */
import {
  buildOfflineCourseRequirement,
  type OfflineCourseRequirementParams,
} from '@/lib/constants/offline-course-requirement';
import type { GenerationSessionState } from '@/app/generation-preview/types';
import { isValidCourseId } from '@/lib/constants/course-id';
import { nanoid } from 'nanoid';

export function isValidLmsCourseId(id: string): boolean {
  return isValidCourseId(id);
}

export interface LmsBuildConfig {
  chapterTitle: string;
  language: string;
  languageScript?: string;
  technicalTermsLanguage?: string;
  audience: string;
  durationMinutes: string;
  interactiveMode: boolean;
  webSearch: boolean;
  pdfRequired: boolean;
}

function isEnvTrue(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === 'true';
}

/** Read LMS build settings from env (client + server). */
export function getLmsBuildConfig(): LmsBuildConfig {
  return {
    chapterTitle: process.env.NEXT_PUBLIC_LMS_CHAPTER_TITLE?.trim() || 'Sample Chapter',
    language: process.env.NEXT_PUBLIC_LMS_LANGUAGE?.trim() || 'Kannada',
    languageScript: process.env.NEXT_PUBLIC_LMS_LANGUAGE_SCRIPT?.trim() || undefined,
    technicalTermsLanguage:
      process.env.NEXT_PUBLIC_LMS_TECHNICAL_TERMS_LANGUAGE?.trim() || undefined,
    audience: process.env.NEXT_PUBLIC_LMS_AUDIENCE?.trim() || 'Karnataka Class 8',
    durationMinutes: process.env.NEXT_PUBLIC_LMS_DURATION_MINUTES?.trim() || '20–25',
    interactiveMode: process.env.NEXT_PUBLIC_LMS_INTERACTIVE_MODE?.trim() !== 'false',
    webSearch: false,
    pdfRequired: isEnvTrue('LMS_PDF_REQUIRED'),
  };
}

export function getLmsRequirementParams(): OfflineCourseRequirementParams {
  const cfg = getLmsBuildConfig();
  const params: OfflineCourseRequirementParams = {
    chapterTitle: cfg.chapterTitle,
    language: cfg.language,
    audience: cfg.audience,
    durationMinutes: cfg.durationMinutes,
  };
  if (cfg.languageScript) params.languageScript = cfg.languageScript;
  if (cfg.technicalTermsLanguage) params.technicalTermsLanguage = cfg.technicalTermsLanguage;
  const notes = process.env.NEXT_PUBLIC_LMS_ADDITIONAL_NOTES?.trim();
  if (notes) params.additionalNotes = notes;
  return params;
}

/** Full generation prompt from env (language, chapter, audience, etc.). */
export function getLmsCourseRequirement(): string {
  return buildOfflineCourseRequirement(getLmsRequirementParams());
}

/** Session for `/lms/[courseId]` → generation-preview (pre-assigned stage/course id). */
export function buildLmsGenerationSession(courseId: string): GenerationSessionState {
  const cfg = getLmsBuildConfig();
  return {
    sessionId: nanoid(),
    courseId,
    requirements: {
      requirement: getLmsCourseRequirement(),
      webSearch: cfg.webSearch,
      interactiveMode: cfg.interactiveMode,
    },
    pdfText: '',
    pdfImages: [],
    imageStorageIds: [],
    sceneOutlines: null,
    currentStep: 'generating',
    previewPhase: 'preparing',
  };
}
