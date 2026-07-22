import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  classroomMediaUrl,
  isKioskFolderMode,
  KIOSK_TTS_CACHE_EXT,
  KIOSK_TTS_SUBDIR,
} from '@/lib/kiosk/config';
import { prepareKioskPlaybackAssets } from '@/lib/kiosk/media-urls';
import { blobFromKioskTtsCache } from '@/lib/kiosk/tts-cache';
import { isKioskTtsCacheUrl } from '@/lib/kiosk/tts-audio';
import {
  installKioskFetchGuard,
  resetKioskFetchGuardForTests,
  KIOSK_ALLOWED_API_PREFIXES,
  isAllowedKioskApi,
  resolveKioskFetchPath,
} from '@/lib/kiosk/fetch-guard';
import { loadKioskClassroom } from '@/lib/kiosk/load-classroom';
import type { Scene } from '@/lib/types/stage';

describe('kiosk config', () => {
  it('isKioskFolderMode reads NEXT_PUBLIC_KIOSK_FOLDER_MODE', () => {
    vi.stubEnv('NEXT_PUBLIC_KIOSK_FOLDER_MODE', 'true');
    expect(isKioskFolderMode()).toBe(true);
    vi.stubEnv('NEXT_PUBLIC_KIOSK_FOLDER_MODE', '');
    expect(isKioskFolderMode()).toBe(false);
  });

  it('classroomMediaUrl encodes path segments', () => {
    expect(classroomMediaUrl('course-1', 'audio/tts_a.mp3')).toBe(
      '/api/classroom-media/course-1/audio/tts_a.mp3',
    );
  });
});

describe('prepareKioskPlaybackAssets', () => {
  const classroomId = 'science-forces';

  it('injects speech audioUrl and registers gen_img media tasks', () => {
    const scenes: Scene[] = [
      {
        id: 's1',
        stageId: classroomId,
        type: 'slide',
        title: 'Intro',
        order: 1,
        content: {
          type: 'slide',
          canvas: {
            id: 'c1',
            viewportSize: 1000,
            viewportRatio: 0.5625,
            theme: {
              backgroundColor: '#fff',
              themeColors: [],
              fontColor: '#000',
              fontName: 'sans',
              outline: { color: '#000', width: 1, style: 'solid' },
              shadow: { h: 0, v: 0, blur: 0, color: '#000' },
            },
            elements: [
              {
                id: 'img1',
                type: 'image',
                left: 0,
                top: 0,
                width: 100,
                height: 100,
                src: 'gen_img_hero',
                rotate: 0,
              },
            ],
          },
        },
        actions: [
          {
            id: 'a1',
            type: 'speech',
            text: 'Hello',
            audioId: 'tts_a1',
          },
        ],
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const { scenes: prepared, mediaTasks } = prepareKioskPlaybackAssets(scenes, classroomId);
    const speech = prepared[0].actions![0];
    expect(speech.type).toBe('speech');
    if (speech.type === 'speech') {
      expect(speech.audioUrl).toBe(
        `/api/classroom-media/${classroomId}/${KIOSK_TTS_SUBDIR}/tts_a1.${KIOSK_TTS_CACHE_EXT}`,
      );
    }
    expect(mediaTasks.gen_img_hero).toMatchObject({
      status: 'done',
      objectUrl: `/api/classroom-media/${classroomId}/media/gen_img_hero.png`,
    });
  });
});

describe('kiosk TTS cache', () => {
  it('blobFromKioskTtsCache reads payloadBlobBase64', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const payloadBlobBase64 = Buffer.from(bytes).toString('base64');
    const blob = blobFromKioskTtsCache({
      payloadJson: { audioId: 'a1', format: 'mp3' },
      payloadBlobBase64,
      mimeType: 'audio/mp3',
    });
    expect(blob?.type).toBe('audio/mp3');
    expect(blob?.size).toBe(3);
  });

  it('isKioskTtsCacheUrl matches tts json paths in kiosk mode', () => {
    vi.stubEnv('NEXT_PUBLIC_KIOSK_FOLDER_MODE', 'true');
    expect(
      isKioskTtsCacheUrl('/api/classroom-media/c1/tts/tts_action_x.json'),
    ).toBe(true);
    expect(isKioskTtsCacheUrl('/api/classroom-media/c1/audio/x.mp3')).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe('kiosk fetch guard', () => {
  it('resolveKioskFetchPath strips origin', () => {
    expect(resolveKioskFetchPath('http://localhost/api/classroom?id=x')).toBe(
      '/api/classroom?id=x',
    );
  });

  it('isAllowedKioskApi permits classroom routes only', () => {
    expect(isAllowedKioskApi('/api/classroom?id=x')).toBe(true);
    expect(isAllowedKioskApi('/api/classroom-media/c/audio/x.mp3')).toBe(true);
    expect(isAllowedKioskApi('/api/generate/tts')).toBe(false);
    expect(isAllowedKioskApi('/static/app.js')).toBe(true);
  });

  it('installKioskFetchGuard blocks disallowed API calls in browser', async () => {
    vi.stubEnv('NEXT_PUBLIC_KIOSK_FOLDER_MODE', 'true');
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
    const g = globalThis as typeof globalThis & { window?: Window };
    g.window = { fetch: mockFetch } as unknown as Window;

    try {
      installKioskFetchGuard();
      await expect(window.fetch('/api/generate/tts', { method: 'POST' })).rejects.toThrow(
        /Kiosk folder mode/,
      );
      await window.fetch('/api/classroom?id=x');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    } finally {
      resetKioskFetchGuardForTests();
      delete g.window;
      vi.unstubAllEnvs();
    }
  });

  it('documents allowed prefixes', () => {
    expect(KIOSK_ALLOWED_API_PREFIXES).toContain('/api/classroom');
  });
});

describe('loadKioskClassroom', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        classroom: {
          stage: { id: 'c1', name: 'Test', createdAt: 1, updatedAt: 1 },
          scenes: [
            {
              id: 's1',
              stageId: 'c1',
              type: 'slide',
              title: 'T',
              order: 1,
              content: { type: 'slide', canvas: { id: 'x', elements: [] } },
              createdAt: 1,
              updatedAt: 1,
            },
          ],
          generationComplete: true,
        },
      }),
    }) as typeof fetch;
  });

  it('fetches classroom JSON and returns prepared payload', async () => {
    const payload = await loadKioskClassroom('c1');
    expect(payload.stage.id).toBe('c1');
    expect(payload.scenes).toHaveLength(1);
    expect(payload.generationComplete).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/api/classroom?id=c1');
  });
});
