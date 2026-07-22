'use client';

import { PlaybackChromeRoot } from '@/components/edit/PlaybackChromeRoot';
import { InteractiveIframeHost } from '@/components/scene-renderers/InteractiveIframeHost';

/**
 * Playback-only stage for kiosk / embedded shells.
 * Skips edit mode, Pro toggle wiring, and the editor font bundle.
 */
export function KioskPlaybackStage() {
  return (
    <div className="relative flex flex-1 overflow-hidden">
      <PlaybackChromeRoot />
      <InteractiveIframeHost />
    </div>
  );
}
