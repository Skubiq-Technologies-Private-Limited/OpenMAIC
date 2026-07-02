import { promises as fs } from 'fs';
import path from 'path';
import {
  isServerConfiguredProvider,
  resolvePDFApiKey,
  resolvePDFBaseUrl,
} from '@/lib/server/provider-config';
import { documentArtifactToParsedPdfContent, extractDocument } from '@/lib/document';
import type { PDFProviderId } from '@/lib/pdf/types';
import type { ParsedPdfContent } from '@/lib/types/pdf';
import { MAX_PDF_CONTENT_CHARS } from '@/lib/constants/generation';
import { createLogger } from '@/lib/logger';
import {
  isGenerationCacheEnabled,
  readGenerationCache,
  writeGenerationCache,
} from '@/lib/server/generation-cache';
import { OUTLINE_CACHE_ARTIFACT_KEY } from '@/lib/server/generation-cache/outline-cache';

const log = createLogger('LMS PDF');

/** Directory for chapter PDFs under `data/lms-pdfs/` (override with LMS_PDF_DIR). */
export function getLmsPdfDir(): string {
  return (
    process.env.LMS_PDF_DIR?.trim() || path.join(process.cwd(), 'data', 'lms-pdfs')
  );
}

/** Candidate PDF paths for a course id (exact filename first, then `.pdf` suffix). */
export function getLmsPdfCandidatePaths(courseId: string): string[] {
  const dir = getLmsPdfDir();
  const candidates: string[] = [];
  if (/\.pdf$/i.test(courseId)) {
    candidates.push(path.join(dir, courseId));
  }
  candidates.push(path.join(dir, `${courseId}.pdf`));
  return candidates;
}

/**
 * Resolve the PDF file for a course.
 *
 * Lookup order:
 * 1. `{LMS_PDF_DIR}/{courseId}` when courseId ends with `.pdf` (exact filename in URL)
 * 2. `{LMS_PDF_DIR}/{courseId}.pdf`
 * 3. `LMS_PDF_DEFAULT` env path
 */
export async function resolveLmsPdfPath(courseId: string): Promise<string | null> {
  for (const candidate of getLmsPdfCandidatePaths(courseId)) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }

  const defaultPath = process.env.LMS_PDF_DEFAULT?.trim();
  if (defaultPath) {
    const resolved = path.isAbsolute(defaultPath)
      ? defaultPath
      : path.join(process.cwd(), defaultPath);
    try {
      await fs.access(resolved);
      return resolved;
    } catch {
      log.warn(`LMS_PDF_DEFAULT not found: ${resolved}`);
    }
  }

  return null;
}

function getLmsPdfProviderId(): PDFProviderId {
  const raw = process.env.LMS_PDF_PROVIDER?.trim();
  return (raw || 'unpdf') as PDFProviderId;
}

function normalizeParsedPdf(
  result: ParsedPdfContent,
  fileName: string,
  fileSize: number,
): ParsedPdfContent {
  let text = result.text ?? '';
  if (text.length > MAX_PDF_CONTENT_CHARS) {
    text = text.substring(0, MAX_PDF_CONTENT_CHARS);
  }

  return {
    ...result,
    text,
    metadata: {
      ...result.metadata,
      pageCount: result.metadata?.pageCount ?? 0,
      fileName,
      fileSize,
      parser: result.metadata?.parser ?? getLmsPdfProviderId(),
    },
  };
}

/**
 * Parse the LMS chapter PDF for `courseId`, using generation cache when enabled.
 * Returns null when no PDF file is configured for this course.
 */
export async function parseLmsPdfForCourse(courseId: string): Promise<ParsedPdfContent | null> {
  const filePath = await resolveLmsPdfPath(courseId);
  if (!filePath) {
    return null;
  }

  if (isGenerationCacheEnabled()) {
    const cached = await readGenerationCache(courseId, 'pdf_parse', OUTLINE_CACHE_ARTIFACT_KEY);
    if (cached?.payloadJson && typeof cached.payloadJson.text === 'string') {
      log.debug(`PDF parse cache hit for course ${courseId}`);
      return cached.payloadJson as unknown as ParsedPdfContent;
    }
  }

  const providerId = getLmsPdfProviderId();
  const managed = isServerConfiguredProvider('pdf', providerId);
  const config = {
    providerId,
    apiKey: resolvePDFApiKey(providerId, managed ? undefined : undefined),
    baseUrl: resolvePDFBaseUrl(providerId, undefined),
  };

  const buffer = await fs.readFile(filePath);
  const fileName = path.basename(filePath);

  log.info(`Parsing LMS PDF for ${courseId}: ${filePath} [provider=${providerId}]`);

  const artifact = await extractDocument({
    buffer,
    fileName,
    fileSize: buffer.length,
    mimeType: 'application/pdf',
    config,
  });
  const parsed = normalizeParsedPdf(
    documentArtifactToParsedPdfContent(artifact),
    fileName,
    buffer.length,
  );

  if (isGenerationCacheEnabled()) {
    void writeGenerationCache({
      courseId,
      artifactType: 'pdf_parse',
      artifactKey: OUTLINE_CACHE_ARTIFACT_KEY,
      payloadJson: parsed as unknown as Record<string, unknown>,
    }).catch((error) => {
      log.warn(`PDF parse cache write failed [${courseId}]:`, error);
    });
  }

  return parsed;
}

export type LmsPdfSource = 'course' | 'default' | null;

export interface LmsPdfPreview {
  resolvedPath: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  source: LmsPdfSource;
  expectedCoursePath: string;
  expectedCoursePaths: string[];
}

/** Which PDF file will be used (does not parse). */
export async function getLmsPdfPreview(courseId: string): Promise<LmsPdfPreview> {
  const candidates = getLmsPdfCandidatePaths(courseId);
  const expectedCoursePath = candidates[0];
  const coursePath = await resolveLmsPdfPath(courseId);

  if (!coursePath) {
    return {
      resolvedPath: null,
      fileName: null,
      fileSizeBytes: null,
      source: null,
      expectedCoursePath,
      expectedCoursePaths: candidates,
    };
  }

  let source: LmsPdfSource = 'course';
  if (!candidates.includes(coursePath)) {
    source = 'default';
  }

  const stat = await fs.stat(coursePath);
  return {
    resolvedPath: coursePath,
    fileName: path.basename(coursePath),
    fileSizeBytes: stat.size,
    source,
    expectedCoursePath,
    expectedCoursePaths: candidates,
  };
}

/** Human-readable hint for operators (docs / error messages). */
export function describeLmsPdfLocation(courseId: string): string {
  const candidates = getLmsPdfCandidatePaths(courseId);
  const defaultPath = process.env.LMS_PDF_DEFAULT?.trim();
  const lines = [`Place the chapter PDF at: ${candidates.join(' or ')}`];
  if (defaultPath) {
    lines.push(`Or set LMS_PDF_DEFAULT (currently: ${defaultPath})`);
  }
  return lines.join('. ');
}
