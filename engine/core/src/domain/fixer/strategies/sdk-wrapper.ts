import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

export const sdkWrapperStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l4-bare-llm') return null;

  const fw = context.framework.toLowerCase();
  const isReact = fw.includes('next') || fw.includes('react');

  const filePath = isReact
    ? 'src/hooks/useCompliorAI.ts'
    : 'src/middleware/ai-compliance-wrapper.ts';

  const content = isReact
    ? `// AI Compliance Wrapper Hook (EU AI Act, Art. 50.1)
import { complior } from '@complior/sdk';

const wrappedClient = complior(aiClient, {
  disclosure: true,
  logging: true,
  contentMarking: true,
});

export const useCompliorAI = () => wrappedClient;
`
    : `// AI Compliance Wrapper (EU AI Act, Art. 50.1)
import { complior } from '@complior/sdk';

export const createCompliantClient = (client: unknown) =>
  complior(client, {
    disclosure: true,
    logging: true,
    contentMarking: true,
  });
`;

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create SDK compliance wrapper for bare LLM calls',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-015',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 50(1)',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 6,
    commitMessage: 'fix: add SDK compliance wrapper for bare LLM calls (Art. 50.1) -- via Complior',
    description: 'Wrap bare LLM client calls with @complior/sdk for automatic compliance',
  };
};
