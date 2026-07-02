import { afterEach, describe, expect, it, vi } from 'vitest';

describe('generation-feature-flags', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults video and web search to enabled', async () => {
    const { isVideoGenerationDisabled, isWebSearchDisabled } = await import(
      '@/lib/server/generation-feature-flags'
    );
    expect(isVideoGenerationDisabled()).toBe(false);
    expect(isWebSearchDisabled()).toBe(false);
  });

  it('respects VIDEO_GENERATION_DISABLED and WEB_SEARCH_DISABLED', async () => {
    vi.stubEnv('VIDEO_GENERATION_DISABLED', 'true');
    vi.stubEnv('WEB_SEARCH_DISABLED', 'true');
    const { isVideoGenerationDisabled, isWebSearchDisabled } = await import(
      '@/lib/server/generation-feature-flags'
    );
    expect(isVideoGenerationDisabled()).toBe(true);
    expect(isWebSearchDisabled()).toBe(true);
  });
});
