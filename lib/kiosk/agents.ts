import { getActionsForRole } from '@/lib/orchestration/registry/types';
import { useAgentRegistry } from '@/lib/orchestration/registry/store';
import type { Stage } from '@/lib/types/stage';

/**
 * Register generated agents in memory only (no IndexedDB) for kiosk playback.
 */
export function hydrateKioskGeneratedAgents(stage: Stage): string[] {
  const configs = stage.generatedAgentConfigs;
  if (!configs?.length) return [];

  const registry = useAgentRegistry.getState();
  for (const agent of registry.listAgents()) {
    if (agent.isGenerated) registry.deleteAgent(agent.id);
  }

  const ids: string[] = [];
  for (const config of configs) {
    registry.addAgent({
      ...config,
      allowedActions: getActionsForRole(config.role),
      isDefault: false,
      isGenerated: true,
      boundStageId: stage.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    ids.push(config.id);
  }
  return ids;
}
