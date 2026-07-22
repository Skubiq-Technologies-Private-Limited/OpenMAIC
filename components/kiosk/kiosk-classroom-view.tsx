'use client';

import { KioskPlaybackStage } from '@/components/kiosk/kiosk-playback-stage';
import { ThemeProvider } from '@/lib/hooks/use-theme';
import { useStageStore } from '@/lib/store';
import { useEffect, useState, useCallback } from 'react';
import { useMediaGenerationStore } from '@/lib/store/media-generation';
import { useWhiteboardHistoryStore } from '@/lib/store/whiteboard-history';
import { createLogger } from '@/lib/logger';
import { MediaStageProvider } from '@/lib/contexts/media-stage-context';
import { loadKioskClassroom } from '@/lib/kiosk/load-classroom';
import { hydrateKioskGeneratedAgents } from '@/lib/kiosk/agents';

const log = createLogger('KioskClassroom');

export interface KioskClassroomViewProps {
  courseId: string;
}

/** Folder-served playback shell — no IndexedDB import, no generation APIs. */
export function KioskClassroomView({ courseId }: KioskClassroomViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClassroom = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = await loadKioskClassroom(courseId);
      useStageStore.getState().setStage(payload.stage);
      useStageStore.setState({
        scenes: payload.scenes,
        currentSceneId: payload.scenes[0]?.id ?? null,
        outlines: payload.outlines,
        generationComplete: payload.generationComplete,
        generatingOutlines: [],
        mode: 'playback',
      });
      hydrateKioskGeneratedAgents(payload.stage);
      useMediaGenerationStore.setState((s) => ({
        tasks: { ...s.tasks, ...payload.mediaTasks },
      }));
      log.info('Loaded kiosk classroom:', courseId);
    } catch (err) {
      log.error('Failed to load kiosk classroom:', err);
      setError(err instanceof Error ? err.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    const mediaStore = useMediaGenerationStore.getState();
    mediaStore.revokeObjectUrls();
    useMediaGenerationStore.setState({ tasks: {} });
    useWhiteboardHistoryStore.getState().clearHistory();
    void loadClassroom();
  }, [courseId, loadClassroom]);

  return (
    <ThemeProvider>
      <MediaStageProvider value={courseId}>
        <div className="h-[100dvh] flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <p className="text-muted-foreground">Loading course…</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center px-6">
                <p className="text-destructive mb-4">Error: {error}</p>
                <button
                  type="button"
                  onClick={() => void loadClassroom()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <KioskPlaybackStage />
          )}
        </div>
      </MediaStageProvider>
    </ThemeProvider>
  );
}
