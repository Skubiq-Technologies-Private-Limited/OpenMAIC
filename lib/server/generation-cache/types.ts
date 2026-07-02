export const GENERATION_ARTIFACT_TYPES = [
  'pdf_parse',
  'scene_outlines',
  'scene_content',
  'scene_actions',
  'agent_profiles',
  'image',
  'video',
  'tts',
  'voice',
] as const;

export type GenerationArtifactType = (typeof GENERATION_ARTIFACT_TYPES)[number];

export interface GenerationCacheRecord {
  payloadJson: Record<string, unknown>;
  payloadBlob?: Buffer | null;
  mimeType?: string | null;
}

export interface GenerationCacheWriteInput {
  courseId: string;
  artifactType: GenerationArtifactType;
  artifactKey: string;
  payloadJson: Record<string, unknown>;
  payloadBlob?: Buffer | null;
  mimeType?: string | null;
  courseTitle?: string | null;
}
