import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  buildLmsGenerationSession,
  getLmsBuildConfig,
  getLmsCourseRequirement,
  isValidLmsCourseId,
} from '@/lib/constants/lms-entry';
import { buildOfflineCourseRequirement } from '@/lib/constants/offline-course-requirement';
import {
  encodeOutlineCacheSseEvents,
  OUTLINE_CACHE_ARTIFACT_KEY,
} from '@/lib/server/generation-cache/outline-cache';

describe('lms-entry', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('validates course ids including pdf-style filenames', () => {
    expect(isValidLmsCourseId('kannada-ch8')).toBe(true);
    expect(isValidLmsCourseId('kannada-8th-science-part1-exploring-forces.pdf')).toBe(true);
    expect(isValidLmsCourseId('../etc/passwd')).toBe(false);
    expect(isValidLmsCourseId('')).toBe(false);
  });

  it('builds a generation session with pre-assigned course id', () => {
    const session = buildLmsGenerationSession('my-course-1');
    expect(session.courseId).toBe('my-course-1');
    expect(session.requirements.requirement).toBe(getLmsCourseRequirement());
    expect(session.requirements.webSearch).toBe(false);
    expect(session.previewPhase).toBe('preparing');
  });

  it('uses NEXT_PUBLIC_LMS_LANGUAGE in the prompt', () => {
    vi.stubEnv('NEXT_PUBLIC_LMS_LANGUAGE', 'English');
    vi.stubEnv('NEXT_PUBLIC_LMS_CHAPTER_TITLE', 'Forces');
    const req = getLmsCourseRequirement();
    expect(req).toContain('Teach entirely in English');
    expect(req).toContain('Topic: Forces');
    expect(getLmsBuildConfig().language).toBe('English');
  });
});

describe('offline-course-requirement', () => {
  it('builds English and Kannada prompts', () => {
    const en = buildOfflineCourseRequirement({
      chapterTitle: 'Test',
      language: 'English',
    });
    expect(en).toContain('Teach entirely in English');

    const kn = buildOfflineCourseRequirement({
      chapterTitle: 'Test',
      language: 'Kannada',
      languageScript: 'Kannada script',
      technicalTermsLanguage: 'English',
    });
    expect(kn).toContain('Kannada (Kannada script)');
    expect(kn).toContain('English only for necessary technical terms');
  });
});

describe('outline-cache SSE', () => {
  it('encodes languageDirective, outlines, and done events', () => {
    const events = encodeOutlineCacheSseEvents({
      outlines: [
        {
          id: 'o1',
          order: 1,
          title: 'Intro',
          description: 'd',
          type: 'slide',
        },
      ],
      languageDirective: 'Teach in Kannada.',
      courseTitle: 'Chapter 8',
      taskEngineMode: false,
    });

    expect(events).toHaveLength(4);
    expect(JSON.parse(events[0]).type).toBe('languageDirective');
    expect(JSON.parse(events[1]).type).toBe('courseTitle');
    expect(JSON.parse(events[2]).type).toBe('outline');
    expect(JSON.parse(events[3]).type).toBe('done');
    expect(JSON.parse(events[3]).outlines).toHaveLength(1);
  });

  it('uses a stable artifact key', () => {
    expect(OUTLINE_CACHE_ARTIFACT_KEY).toBe('default');
  });
});
