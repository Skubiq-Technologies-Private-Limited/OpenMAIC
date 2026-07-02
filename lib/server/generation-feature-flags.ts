/**
 * Server-wide generation feature switches (operator / deployment).
 *
 * When enabled, these override client toggles and block the corresponding APIs.
 */

function isEnvTrue(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === 'true';
}

/** Block AI video generation routes and outline video media requests. */
export function isVideoGenerationDisabled(): boolean {
  return isEnvTrue('VIDEO_GENERATION_DISABLED');
}

/** Block web search API and classroom outline research step. */
export function isWebSearchDisabled(): boolean {
  return isEnvTrue('WEB_SEARCH_DISABLED');
}
