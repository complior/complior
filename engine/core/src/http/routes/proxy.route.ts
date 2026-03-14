import { Hono } from 'hono';
import type { ProxyService } from '../../services/proxy-service.js';
import { ProxyConfigSchema } from '../../domain/proxy/proxy-types.js';
import { ValidationError } from '../../types/errors.js';

export interface ProxyRouteDeps {
  readonly proxyService: ProxyService;
  readonly getProjectPath: () => string;
}

export const createProxyRoute = (proxyServiceOrDeps: ProxyService | ProxyRouteDeps) => {
  // Support both old (ProxyService) and new (ProxyRouteDeps) signatures
  const deps: ProxyRouteDeps = 'start' in proxyServiceOrDeps
    ? { proxyService: proxyServiceOrDeps, getProjectPath: () => process.cwd() }
    : proxyServiceOrDeps;

  const app = new Hono();

  app.post('/proxy/start', async (c) => {
    const body = await c.req.json().catch(() => { throw new ValidationError('Invalid JSON body'); });
    const parsed = ProxyConfigSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(`Invalid config: ${parsed.error.message}`);

    const result = await deps.proxyService.start(parsed.data, deps.getProjectPath());
    return c.json(result, result.success ? 200 : 400);
  });

  app.post('/proxy/stop', (c) => {
    const result = deps.proxyService.stop();
    return c.json(result);
  });

  app.get('/proxy/health', (c) => {
    return c.json(deps.proxyService.health());
  });

  app.get('/proxy/log', (c) => {
    return c.json({ calls: deps.proxyService.getCallLog() });
  });

  return app;
};
