import type { Scene } from '@/lib/types/stage';
import type { SpeechAction } from '@/lib/types/action';
import {
  classroomMediaUrl,
  KIOSK_TTS_SUBDIR,
  KIOSK_TTS_CACHE_EXT,
  KIOSK_DEFAULT_IMAGE_EXT,
  KIOSK_DEFAULT_VIDEO_EXT,
} from '@/lib/kiosk/config';
import { isMediaPlaceholder, type MediaTask } from '@/lib/store/media-generation';

interface SlideElementLike {
  type?: string;
  src?: string;
  mediaRef?: string;
}

function slideElements(scene: Scene): SlideElementLike[] {
  if (scene.content?.type !== 'slide') return [];
  const canvas = (scene.content as { canvas?: { elements?: SlideElementLike[] } }).canvas;
  return canvas?.elements ?? [];
}

/**
 * Inject folder-served URLs on speech actions and return media tasks keyed by
 * placeholder id (`gen_img_*`, `gen_vid_*`, or video `mediaRef`).
 */
export function prepareKioskPlaybackAssets(
  scenes: Scene[],
  classroomId: string,
): { scenes: Scene[]; mediaTasks: Record<string, MediaTask> } {
  const mediaTasks: Record<string, MediaTask> = {};
  const prepared = scenes.map((scene) => {
    const actions = scene.actions?.map((action) => {
      if (action.type !== 'speech') return action;
      const speech = action as SpeechAction;
      if (speech.audioUrl || !speech.audioId) return action;
      return {
        ...speech,
        audioUrl: classroomMediaUrl(
          classroomId,
          `${KIOSK_TTS_SUBDIR}/${speech.audioId}.${KIOSK_TTS_CACHE_EXT}`,
        ),
      };
    });

    const nextScene = actions ? { ...scene, actions } : scene;

    for (const el of slideElements(nextScene)) {
      if (el.type === 'image' && typeof el.src === 'string' && isMediaPlaceholder(el.src)) {
        const elementId = el.src;
        if (mediaTasks[elementId]) continue;
        mediaTasks[elementId] = kioskMediaTask(classroomId, elementId, 'image', elementId);
      }
      if (el.type === 'video') {
        const ref =
          (typeof el.mediaRef === 'string' && isMediaPlaceholder(el.mediaRef)
            ? el.mediaRef
            : undefined) ??
          (typeof el.src === 'string' && isMediaPlaceholder(el.src) ? el.src : undefined);
        if (!ref || mediaTasks[ref]) continue;
        mediaTasks[ref] = kioskMediaTask(classroomId, ref, 'video', ref);
      }
    }

    return nextScene;
  });

  return { scenes: prepared, mediaTasks };
}

function kioskMediaTask(
  classroomId: string,
  elementId: string,
  type: 'image' | 'video',
  fileStem: string,
): MediaTask {
  const ext = type === 'video' ? KIOSK_DEFAULT_VIDEO_EXT : KIOSK_DEFAULT_IMAGE_EXT;
  const objectUrl = classroomMediaUrl(classroomId, `media/${fileStem}.${ext}`);
  const poster =
    type === 'video'
      ? classroomMediaUrl(classroomId, `media/${fileStem}.poster.jpg`)
      : undefined;
  return {
    elementId,
    type,
    status: 'done',
    prompt: '',
    params: {},
    objectUrl,
    poster,
    retryCount: 0,
    stageId: classroomId,
  };
}
