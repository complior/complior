import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

export const disclosureStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'ai-disclosure') return null;

  const fw = context.framework.toLowerCase();

  if (fw.includes('next') || fw.includes('react')) {
    const componentPath = 'src/components/AIDisclosure.tsx';
    const content = `export const AIDisclosure = () => (
  <div role="status" aria-label="AI Disclosure" className="ai-disclosure">
    <p>This service uses artificial intelligence. Responses are AI-generated and may contain errors.</p>
  </div>
);
`;
    const action: FixAction = {
      type: 'create',
      path: componentPath,
      content,
      description: 'Create AIDisclosure React component',
    };
    return {
      obligationId: finding.obligationId ?? 'eu-ai-act-OBL-015',
      checkId: finding.checkId,
      article: finding.articleReference ?? 'Art. 50(1)',
      fixType: 'code_injection',
      framework: context.framework,
      actions: [action],
      diff: generateCreateDiff(componentPath, content),
      scoreImpact: 7,
      commitMessage: 'fix: add AI disclosure component (Art. 50.1) -- via Complior',
      description: 'Add visible AI disclosure notice for users interacting with AI system',
    };
  }

  // Express / Fastify / Hono / generic server
  const middlewarePath = 'src/middleware/ai-disclosure.ts';
  const content = `// AI Disclosure Middleware (EU AI Act, Art. 50.1)
// Adds transparency headers to all AI-related responses

export const aiDisclosureMiddleware = (req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
  res.setHeader('X-AI-Disclosure', 'This service uses artificial intelligence');
  res.setHeader('X-AI-Provider', 'See /api/ai-disclosure for details');
  next();
};

export const AI_DISCLOSURE_TEXT = 'This service uses artificial intelligence. Responses are AI-generated and may contain errors.';
`;
  const action: FixAction = {
    type: 'create',
    path: middlewarePath,
    content,
    description: 'Create AI disclosure middleware with transparency headers',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-015',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 50(1)',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(middlewarePath, content),
    scoreImpact: 7,
    commitMessage: 'fix: add AI disclosure middleware (Art. 50.1) -- via Complior',
    description: 'Add AI disclosure middleware with transparency headers',
  };
};
