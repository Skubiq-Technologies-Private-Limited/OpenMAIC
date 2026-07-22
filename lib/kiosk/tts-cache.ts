/** Generation-cache envelope written by `writeJsonCache` for TTS artifacts. */
export interface KioskTtsCacheEnvelope {
  payloadJson?: {
    audioId?: string;
    base64?: string;
    format?: string;
  };
  payloadBlobBase64?: string;
  mimeType?: string | null;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Build an audio Blob from a generation-cache TTS JSON envelope. */
export function blobFromKioskTtsCache(envelope: KioskTtsCacheEnvelope): Blob | null {
  const mimeFromEnvelope = envelope.mimeType?.trim();

  if (envelope.payloadBlobBase64) {
    const bytes = base64ToBytes(envelope.payloadBlobBase64);
    const mime =
      mimeFromEnvelope ||
      (envelope.payloadJson?.format
        ? `audio/${envelope.payloadJson.format}`
        : 'audio/mpeg');
    return new Blob([new Uint8Array(bytes)], { type: mime });
  }

  const inlineBase64 = envelope.payloadJson?.base64;
  if (inlineBase64) {
    const bytes = base64ToBytes(inlineBase64);
    const format = envelope.payloadJson?.format || 'mp3';
    const mime = mimeFromEnvelope || `audio/${format}`;
    return new Blob([new Uint8Array(bytes)], { type: mime });
  }

  return null;
}

export function isKioskTtsCacheEnvelope(value: unknown): value is KioskTtsCacheEnvelope {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as KioskTtsCacheEnvelope;
  return (
    typeof envelope.payloadJson === 'object' ||
    typeof envelope.payloadBlobBase64 === 'string'
  );
}
