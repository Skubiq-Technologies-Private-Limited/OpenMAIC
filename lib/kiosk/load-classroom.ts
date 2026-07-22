import { migrateScene } from '@/lib/edit/slide-schema';
import { prepareKioskPlaybackAssets } from '@/lib/kiosk/media-urls';
import {
  localKioskClassroomJson,
  USE_LOCAL_KIOSK_FIXTURE,
} from '@/lib/kiosk/local-classroom-fixture';
import type { SceneOutline } from '@/lib/types/generation';
import type { Scene, Stage } from '@/lib/types/stage';
import { createLogger } from '@/lib/logger';

const log = createLogger('KioskLoad');

export interface KioskClassroomPayload {
  stage: Stage;
  scenes: Scene[];
  outlines: SceneOutline[];
  generationComplete: boolean;
  mediaTasks: ReturnType<typeof prepareKioskPlaybackAssets>['mediaTasks'];
}

export interface KioskClassroomApiResponse {
  success: boolean;
  classroom?: {
    stage: Stage;
    scenes: Scene[];
    outlines?: SceneOutline[];
    generationComplete?: boolean;
  };
  error?: string;
}

function normalizeClassroomApiBody(raw: unknown): KioskClassroomApiResponse['classroom'] {
  const record = raw as Record<string, unknown>;
  const classroom = record.classroom ?? raw;
  return classroom as NonNullable<KioskClassroomApiResponse['classroom']>;
}

async function fetchKioskClassroomApi(classroomId: string): Promise<KioskClassroomApiResponse> {
  if (USE_LOCAL_KIOSK_FIXTURE) {
    log.warn('Using local kiosk classroom fixture (skipping /api/classroom fetch)');
    return {
      success: true,
      classroom: normalizeClassroomApiBody(localKioskClassroomJson),
    };
  }

  const res = await fetch(`/api/classroom?id=${encodeURIComponent(classroomId)}`);
  const json = (await res.json().catch(() => ({}))) as KioskClassroomApiResponse;

  if (!res.ok || !json.success || !json.classroom) {
    const message =
      json.error ||
      (res.status === 404
        ? `Course "${classroomId}" not found in the content folder.`
        : `Failed to load course "${classroomId}" (${res.status}).`);
    throw new Error(message);
  }

  return json;
}

/**
 * Load a course for kiosk playback: fetch JSON via `/api/classroom` (intercepted
 * by the host), inject folder media URLs, keep everything in memory.
 */
export async function loadKioskClassroom(classroomId: string): Promise<KioskClassroomPayload> {
  const json = await fetchKioskClassroomApi(classroomId);
  const { stage, scenes, outlines: snapshotOutlines, generationComplete: snapshotComplete } =
    json.classroom!;

  const migrated = (scenes as Scene[]).map(migrateScene);
  const { scenes: preparedScenes, mediaTasks } = prepareKioskPlaybackAssets(
    migrated,
    classroomId,
  );

  const generationComplete = snapshotComplete === true || preparedScenes.length > 0;
  if (!generationComplete) {
    log.warn(`Course "${classroomId}" is not marked generationComplete`);
  }

  return {
    stage: { ...stage, id: stage.id || classroomId },
    scenes: preparedScenes,
    outlines: (snapshotOutlines as SceneOutline[] | undefined) ?? [],
    generationComplete,
    mediaTasks,
  };
}
