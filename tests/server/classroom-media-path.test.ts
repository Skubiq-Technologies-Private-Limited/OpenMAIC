import { describe, it, expect } from 'vitest';
import { resolveClassroomMediaFilePath } from '@/lib/server/classroom-media-path';

describe('resolveClassroomMediaFilePath', () => {
  it('allows tts subdir with generation-cache fallback', () => {
    const resolved = resolveClassroomMediaFilePath('course-1', [
      'tts',
      'tts_action_a.json',
    ]);
    expect(resolved?.filePath).toContain('classrooms');
    expect(resolved?.filePath).toContain('course-1');
    expect(resolved?.fallback?.filePath).toContain('generation-cache');
  });

  it('rejects unknown subdirs', () => {
    expect(resolveClassroomMediaFilePath('course-1', ['secret', 'file'])).toBeNull();
  });
});
