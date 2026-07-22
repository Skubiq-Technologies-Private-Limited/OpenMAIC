'use client';

import { useEffect } from 'react';
import { installKioskFetchGuard } from '@/lib/kiosk/fetch-guard';
import { isKioskFolderMode } from '@/lib/kiosk/config';

/**
 * Kiosk folder mode bootstrap: install fetch guard on mount.
 * Renders nothing.
 */
export function KioskBootstrap() {
  useEffect(() => {
    if (isKioskFolderMode()) {
      installKioskFetchGuard();
    }
  }, []);

  return null;
}
