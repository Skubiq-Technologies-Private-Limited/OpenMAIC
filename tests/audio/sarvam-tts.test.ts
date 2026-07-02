import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { generateTTS } from '@/lib/audio/tts-providers';

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

function mp3Bytes(): ArrayBuffer {
  return new Uint8Array([0xff, 0xfb, 0x90, 0x00]).buffer;
}

describe('Sarvam TTS', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('posts to /text-to-speech with Bulbul v3 defaults and decodes base64 audio', async () => {
    const audioBase64 = Buffer.from(mp3Bytes()).toString('base64');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ audios: [audioBase64], request_id: 'req-1' }),
    });

    const result = await generateTTS(
      {
        providerId: 'sarvam-tts',
        apiKey: 'sk-sarvam',
        voice: 'shubh',
        modelId: 'bulbul:v3',
        speed: 1.1,
      },
      'Hello from Sarvam',
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.sarvam.ai/text-to-speech',
      expect.objectContaining({ method: 'POST' }),
    );
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.sarvam.ai/text-to-speech');
    expect(init.headers['api-subscription-key']).toBe('sk-sarvam');
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      text: 'Hello from Sarvam',
      target_language_code: 'en-IN',
      model: 'bulbul:v3',
      speaker: 'shubh',
      pace: 1.1,
      speech_sample_rate: '24000',
      output_audio_codec: 'mp3',
    });
    expect(result.audio).toBeInstanceOf(Uint8Array);
    expect(result.audio.byteLength).toBe(4);
    expect(result.format).toBe('mp3');
  });

  it('uses targetLanguageCode from providerOptions when provided', async () => {
    const audioBase64 = Buffer.from(mp3Bytes()).toString('base64');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ audios: [audioBase64] }),
    });

    await generateTTS(
      {
        providerId: 'sarvam-tts',
        apiKey: 'sk-sarvam',
        voice: 'ritu',
        providerOptions: { targetLanguageCode: 'hi-IN' },
      },
      'नमस्ते',
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.target_language_code).toBe('hi-IN');
    expect(body.speaker).toBe('ritu');
  });

  it('throws when the API returns no audio payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ request_id: 'req-2' }),
    });

    await expect(
      generateTTS({ providerId: 'sarvam-tts', apiKey: 'sk-sarvam', voice: 'shubh' }, 'hi'),
    ).rejects.toThrow('No audio returned');
  });
});
