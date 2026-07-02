/**
 * Shared image style directives for course generation and the image API.
 */

/** Injected into LMS / offline course requirement text for outline LLM. */
export const TEXTBOOK_CARICATURE_IMAGE_DIRECTIVE = `AI-generated images (all slide illustrations):
- Style: 2D flat textbook illustration / simple caricature only — like state-board NCERT textbook diagrams
- No photorealism, no 3D renders, no cinematic lighting, no photographic textures
- Simple line art or soft flat colors; clear labels when text is needed
- Every mediaGenerations image prompt MUST state this style explicitly (e.g. "2D flat educational textbook caricature illustration, no photorealism, …")`;

/** Appended server-side to every /api/generate/image prompt when IMAGE_PROMPT_STYLE_SUFFIX is set. */
export const DEFAULT_IMAGE_PROMPT_STYLE_SUFFIX =
  '2D flat educational textbook caricature illustration, simple line art, soft flat colors, no photorealism, no 3D, no cinematic lighting.';

/**
 * Optional global suffix from IMAGE_PROMPT_STYLE_SUFFIX.
 * - unset / empty → no suffix
 * - "default" → DEFAULT_IMAGE_PROMPT_STYLE_SUFFIX
 * - any other string → used verbatim
 */
export function getImagePromptStyleSuffix(): string {
  const raw = process.env.IMAGE_PROMPT_STYLE_SUFFIX?.trim();
  if (!raw || /^(false|0|no|off)$/i.test(raw)) return '';
  if (/^default$/i.test(raw)) return DEFAULT_IMAGE_PROMPT_STYLE_SUFFIX;
  return raw;
}

export function applyImagePromptStyleSuffix(prompt: string): string {
  const suffix = getImagePromptStyleSuffix();
  if (!suffix) return prompt;
  const trimmed = prompt.trimEnd();
  if (trimmed.toLowerCase().includes(suffix.toLowerCase())) return trimmed;
  return `${trimmed}. ${suffix}`;
}
