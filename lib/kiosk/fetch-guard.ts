import { isKioskFolderMode } from '@/lib/kiosk/config';

/** API prefixes allowed in kiosk folder mode (host shell serves these from disk). */
export const KIOSK_ALLOWED_API_PREFIXES = ['/api/classroom', '/api/classroom-media/'] as const;

export function resolveKioskFetchPath(input: RequestInfo | URL): string {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.pathname + input.search
        : input.url;

  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url);
      return parsed.pathname + parsed.search;
    }
  } catch {
    // use url as-is
  }
  return url;
}

export function isAllowedKioskApi(path: string): boolean {
  if (!path.startsWith('/api/')) return true;
  return KIOSK_ALLOWED_API_PREFIXES.some((prefix) => path.startsWith(prefix));
}

let installed = false;
let originalFetch: typeof window.fetch | null = null;

/**
 * Block unexpected `/api/*` calls in kiosk mode. Host shells intercept the
 * allowed prefixes from local folders; everything else is disabled.
 */
export function installKioskFetchGuard(): void {
  if (!isKioskFolderMode() || typeof window === 'undefined' || installed) return;
  installed = true;
  originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const path = resolveKioskFetchPath(input);

    if (!isAllowedKioskApi(path)) {
      return Promise.reject(
        new Error(`Kiosk folder mode: API disabled (${path}). Use folder-served assets only.`),
      );
    }
    return originalFetch!(input, init);
  }) as typeof window.fetch;
}

/** Test helper */
export function resetKioskFetchGuardForTests(): void {
  if (typeof window !== 'undefined' && originalFetch) {
    window.fetch = originalFetch;
  }
  originalFetch = null;
  installed = false;
}
