import { Hono } from 'hono';
import type { StatusService } from '../../services/status-service.js';
import type { LlmPort } from '../../ports/llm.port.js';
import { envKeyForTaskType, type TaskType } from '../../llm/routing/model-routing.js';

export interface StatusRouteDeps {
  readonly statusService: StatusService;
  readonly llm?: LlmPort;
}

export const createStatusRoute = (deps: StatusRouteDeps) => {
  const { statusService, llm } = deps;
  const app = new Hono();

  app.get('/status', (c) => {
    return c.json(statusService.getStatus());
  });

  /** V1-M10 T-4: Aggregated compliance posture for `complior status`. */
  app.get('/status/posture', async (c) => {
    const posture = await statusService.getCompliancePosture();
    return c.json(posture);
  });

  app.get('/llm/info', (c) => {
    if (!llm) {
      return c.json({ error: 'LLM_NOT_CONFIGURED', message: 'No LLM adapter available' }, 404);
    }

    const providers = llm.detectProviders();
    const available = llm.getAvailableProviders();

    if (available.length === 0) {
      return c.json({
        configured: false,
        providers: providers.map((p) => ({ name: p.name, available: p.available })),
      });
    }

    const taskTypes: readonly TaskType[] = ['classify', 'document-generation', 'code', 'report', 'chat', 'qa'];
    const tasks: Record<string, { provider: string; modelId: string; reason: string; source: string; envVar?: string }> = {};

    for (const task of taskTypes) {
      try {
        const selection = llm.routeModel(task);
        const envKey = envKeyForTaskType(task);
        const hasEnvOverride = !!process.env[envKey];
        tasks[task] = {
          provider: selection.provider,
          modelId: selection.modelId,
          reason: selection.reason,
          source: hasEnvOverride ? 'env' : 'default',
          ...(hasEnvOverride ? { envVar: envKey } : {}),
        };
      } catch {
        // Skip tasks that fail routing
      }
    }

    const providerSource = process.env['COMPLIOR_LLM_PROVIDER'] ? 'env' : 'auto';

    return c.json({
      configured: true,
      activeProvider: available[0]!.name,
      providerSource,
      providers: providers.map((p) => ({ name: p.name, available: p.available })),
      ...tasks,
    });
  });

  return app;
};
