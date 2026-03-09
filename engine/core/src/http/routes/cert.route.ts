import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../../types/errors.js';
import type { PassportService } from '../../services/passport-service.js';
import type { EvidenceStore } from '../../domain/scanner/evidence-store.js';
import type { AuditStore } from '../../domain/audit/audit-trail.js';

const ReadinessQuerySchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
});

const AdversarialRequestSchema = z.object({
  agent_name: z.string().min(1),
  test_categories: z.array(z.enum(['prompt_injection', 'bias_detection', 'safety_boundary'])).optional(),
});

export interface CertRouteDeps {
  readonly passportService: PassportService;
  readonly callLlm?: (prompt: string, systemPrompt?: string) => Promise<string>;
  readonly evidenceStore?: EvidenceStore;
  readonly auditStore?: AuditStore;
  readonly getProjectPath: () => string;
}

export const createCertRoute = (deps: CertRouteDeps) => {
  const app = new Hono();

  // US-S05-19: AIUC-1 Readiness Score
  app.get('/cert/readiness', async (c) => {
    const parsed = ReadinessQuerySchema.safeParse({
      path: c.req.query('path'),
      name: c.req.query('name'),
    });
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await deps.passportService.getReadiness(parsed.data.name, parsed.data.path);
    if (result === null) {
      throw new ValidationError(`Passport not found: ${parsed.data.name}`);
    }
    return c.json(result);
  });

  // US-S05-20: Adversarial Test Runner
  app.post('/cert/test/adversarial', async (c) => {
    const body = await c.req.json();
    const parsed = AdversarialRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    if (!deps.callLlm) {
      throw new ValidationError('LLM not configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.');
    }

    const { createTestRunner } = await import('../../domain/certification/test-runner.js');
    const runner = createTestRunner({
      callLlm: deps.callLlm,
      evidenceStore: deps.evidenceStore,
      auditStore: deps.auditStore,
      getProjectPath: deps.getProjectPath,
    });

    const report = await runner.runAdversarialTests(
      parsed.data.agent_name,
      parsed.data.test_categories,
    );

    return c.json(report);
  });

  return app;
};
