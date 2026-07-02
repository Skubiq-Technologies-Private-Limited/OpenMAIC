/**
 * Offline-friendly course generation requirement prompts.
 *
 * Use on the home page requirement field (with chapter PDF attached).
 * Targets configurable language, objective quizzes, client-side interactives, and
 * optional short Veo clips (pre-generated for offline playback).
 */

import { TEXTBOOK_CARICATURE_IMAGE_DIRECTIVE } from '@/lib/constants/image-generation-style';

export interface OfflineCourseRequirementParams {
  /** Chapter or lesson title */
  chapterTitle: string;
  /** Instruction language, e.g. "English", "Kannada" */
  language: string;
  /** Optional script note, e.g. "Kannada script" */
  languageScript?: string;
  /** Target learners, e.g. "Karnataka Class 8" */
  audience?: string;
  /** Approximate lesson length, e.g. "20–25" */
  durationMinutes?: string;
  /** Optional extra constraints or chapter-specific notes */
  additionalNotes?: string;
  /**
   * When set, allows another language for technical terms only
   * (e.g. "English" when teaching in Kannada).
   */
  technicalTermsLanguage?: string;
}

/** @deprecated Use OfflineCourseRequirementParams */
export type OfflineKannadaCourseRequirementParams = Omit<
  OfflineCourseRequirementParams,
  'language'
> & { language?: string };

function languageLines(params: OfflineCourseRequirementParams): {
  head: string;
  closing: string;
} {
  const lang = params.language.trim() || 'English';
  const script = params.languageScript?.trim();
  const head = script
    ? `Teach entirely in ${lang} (${script}). All slide text, titles, explanations, and quiz questions must be in ${lang}.`
    : `Teach entirely in ${lang}. All slide text, titles, explanations, and quiz questions must be in ${lang}.`;

  const tech = params.technicalTermsLanguage?.trim();
  const closing = tech
    ? `Use clear, school-level ${lang}; ${tech} only for necessary technical terms.`
    : `Use clear, school-level ${lang} throughout.`;

  return { head, closing };
}

/**
 * Default requirement text for one-time generation and offline LMS distribution.
 * Attach the chapter PDF on the home page before submitting.
 */
export function buildOfflineCourseRequirement(params: OfflineCourseRequirementParams): string {
  const audience = params.audience ?? 'Karnataka Class 8';
  const duration = params.durationMinutes ?? '20–25';
  const extra = params.additionalNotes?.trim()
    ? `\n\nAdditional notes:\n${params.additionalNotes.trim()}`
    : '';
  const { head, closing } = languageLines(params);

  return `${head}

Topic: ${params.chapterTitle}
Audience: ${audience}
Duration: ~${duration} minutes
Source material: Follow the attached chapter PDF closely. Do not add topics outside the PDF. Do not use web search.

Scene types allowed:
- "slide" (main teaching)
- "quiz" (single/multiple choice only)
- At most 1–2 "interactive" scenes for concept visualization

Interactive widgets allowed ONLY:
- widgetType: "diagram" OR "simulation" (prefer these for offline)
- Do NOT use: code, game, visualization3d, procedural-skill unless essential

Interactive rules:
- Self-contained HTML widgets only (no external APIs, no web fetch)
- Sliders, clickable nodes, and simple animations inside the widget are welcome

AI-generated video (optional, use sparingly):
- At most ONE short video for the entire course, only if motion is essential and a diagram/simulation cannot convey it
- Use slide mediaGenerations with type "video" (Veo, max 8 seconds, aspectRatio "16:9")
- Prefer diagram or simulation widgets first; skip video if a static image or slide animation suffices
- Videos are pre-generated once and bundled for offline playback (large files — use only when necessary)

${TEXTBOOK_CARICATURE_IMAGE_DIRECTIVE}

Still forbidden:
- PBL / project-based scenes
- short_answer quiz questions
- Web search

Quizzes — offline-safe only:
- Every quiz scene must use quizConfig.questionTypes: ["single", "multiple"] only
- Never use short_answer or open-ended written questions
- Place one quiz every 3–4 slides (2–3 questions each)

Structure:
1. Intro slide (chapter goals and key ideas)
2. 6–10 slides covering the chapter section by section
3. Final recap quiz
4. ${closing}${extra}`;
}

/** Kannada-default wrapper (legacy). */
export function buildOfflineKannadaCourseRequirement(
  params: Omit<OfflineCourseRequirementParams, 'language'> & { language?: string },
): string {
  return buildOfflineCourseRequirement({
    ...params,
    language: params.language ?? 'Kannada',
    languageScript: params.languageScript ?? 'Kannada script',
    technicalTermsLanguage: params.technicalTermsLanguage ?? 'English',
  });
}

/** Placeholder template when chapter details are filled in manually. */
export const OFFLINE_KANNADA_COURSE_REQUIREMENT_TEMPLATE = buildOfflineKannadaCourseRequirement({
  chapterTitle: '[Chapter name]',
  audience: 'Karnataka Class 8',
  durationMinutes: '20–25',
});
