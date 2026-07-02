import { describe, expect, it, vi, afterEach } from 'vitest';
import path from 'path';
import { getLmsPdfCandidatePaths } from '@/lib/server/lms-pdf';

describe('lms-pdf path resolution', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults LMS PDF dir to data/lms-pdfs', async () => {
    const { getLmsPdfDir } = await import('@/lib/server/lms-pdf');
    expect(getLmsPdfDir()).toBe(path.join(process.cwd(), 'data', 'lms-pdfs'));
  });

  it('respects LMS_PDF_DIR', async () => {
    vi.stubEnv('LMS_PDF_DIR', './custom-pdfs');
    const { getLmsPdfDir } = await import('@/lib/server/lms-pdf');
    expect(getLmsPdfDir()).toBe('./custom-pdfs');
  });

  it('prefers exact pdf filename when course id ends with .pdf', () => {
    const dir = path.join(process.cwd(), 'data', 'lms-pdfs');
    const candidates = getLmsPdfCandidatePaths('chapter-forces.pdf');
    expect(candidates[0]).toBe(path.join(dir, 'chapter-forces.pdf'));
    expect(candidates).toHaveLength(1);
  });

  it('appends .pdf when course id has no pdf suffix', () => {
    const dir = path.join(process.cwd(), 'data', 'lms-pdfs');
    expect(getLmsPdfCandidatePaths('my-course-1')).toEqual([
      path.join(dir, 'my-course-1.pdf'),
    ]);
  });

  it('describes expected pdf location for a course', async () => {
    const { describeLmsPdfLocation } = await import('@/lib/server/lms-pdf');
    const hint = describeLmsPdfLocation('chapter-8.pdf');
    expect(hint).toContain('chapter-8.pdf');
    expect(hint).toContain('lms-pdfs');
  });
});

describe('attachParsedPdfToSession', () => {
  it('merges parsed text and image metadata into session', async () => {
    const { attachParsedPdfToSession } = await import('@/lib/lms/attach-pdf-to-session');
    const { buildLmsGenerationSession } = await import('@/lib/constants/lms-entry');

    const tinyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const session = buildLmsGenerationSession('test-course');
    const updated = await attachParsedPdfToSession(session, {
      text: 'Chapter content',
      images: [tinyPng],
      metadata: {
        pageCount: 1,
        fileName: 'chapter.pdf',
        pdfImages: [{ id: 'img_1', src: tinyPng, pageNumber: 1 }],
      },
    });

    expect(updated.pdfText).toBe('Chapter content');
    expect(updated.pdfImages).toHaveLength(1);
    expect(updated.pdfFileName).toBe('chapter.pdf');
    expect(updated.pdfStorageKey).toBeUndefined();
  });
});
