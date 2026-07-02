import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  applyImagePromptStyleSuffix,
  DEFAULT_IMAGE_PROMPT_STYLE_SUFFIX,
  getImagePromptStyleSuffix,
} from '@/lib/constants/image-generation-style';

describe('image-generation-style', () => {
  const original = process.env.IMAGE_PROMPT_STYLE_SUFFIX;

  afterEach(() => {
    if (original === undefined) delete process.env.IMAGE_PROMPT_STYLE_SUFFIX;
    else process.env.IMAGE_PROMPT_STYLE_SUFFIX = original;
  });

  it('returns empty suffix when env unset', () => {
    delete process.env.IMAGE_PROMPT_STYLE_SUFFIX;
    expect(getImagePromptStyleSuffix()).toBe('');
    expect(applyImagePromptStyleSuffix('A water cycle diagram')).toBe('A water cycle diagram');
  });

  it('uses default suffix when env is "default"', () => {
    process.env.IMAGE_PROMPT_STYLE_SUFFIX = 'default';
    const result = applyImagePromptStyleSuffix('A water cycle diagram');
    expect(result).toBe(`A water cycle diagram. ${DEFAULT_IMAGE_PROMPT_STYLE_SUFFIX}`);
  });

  it('does not duplicate suffix when already present', () => {
    process.env.IMAGE_PROMPT_STYLE_SUFFIX = 'default';
    const prompt = `Diagram. ${DEFAULT_IMAGE_PROMPT_STYLE_SUFFIX}`;
    expect(applyImagePromptStyleSuffix(prompt)).toBe(prompt);
  });

  beforeEach(() => {
    delete process.env.IMAGE_PROMPT_STYLE_SUFFIX;
  });
});
