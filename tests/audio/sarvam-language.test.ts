import { describe, expect, it } from 'vitest';
import { mapLanguageToSarvamTarget } from '@/lib/audio/sarvam';

describe('mapLanguageToSarvamTarget', () => {
  it('maps short ISO codes', () => {
    expect(mapLanguageToSarvamTarget('kn')).toBe('kn-IN');
    expect(mapLanguageToSarvamTarget('hi')).toBe('hi-IN');
  });

  it('passes through BCP-47 codes', () => {
    expect(mapLanguageToSarvamTarget('kn-IN')).toBe('kn-IN');
  });

  it('extracts BCP-47 from parentheses in directives', () => {
    expect(mapLanguageToSarvamTarget('Deliver the entire course in Kannada (kn-IN).')).toBe(
      'kn-IN',
    );
  });

  it('detects language names in outline-style directives', () => {
    expect(
      mapLanguageToSarvamTarget('Deliver the entire course in Kannada. Use simple vocabulary.'),
    ).toBe('kn-IN');
    expect(mapLanguageToSarvamTarget('Reply in Hindi.')).toBe('hi-IN');
  });

  it('returns undefined for unmapped languages', () => {
    expect(mapLanguageToSarvamTarget('Deliver the entire course in Japanese.')).toBeUndefined();
  });
});
