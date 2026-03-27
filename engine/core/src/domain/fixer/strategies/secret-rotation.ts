import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

// --- Strategy: Secret Rotation (Art. 15.4) ---

export const secretRotationStrategy: FixStrategy = (finding, context) => {
  if (!finding.checkId.startsWith('l4-nhi-') || finding.checkId === 'l4-nhi-clean') return null;

  // Extract secret type from checkId: l4-nhi-openai-key → OPENAI_API_KEY
  const suffix = finding.checkId.replace('l4-nhi-', '').replace(/-/g, '_').toUpperCase();
  const envVar = suffix.endsWith('_KEY') ? suffix : `${suffix}_KEY`;

  const gitignoreContent = `# Secrets — never commit
.env
.env.*
*.key
*.pem
*.p12
`;

  const envExampleContent = `# Replace with vault references or environment-specific values
${envVar}=<replace-with-vault-reference>
`;

  const actions: FixAction[] = [
    {
      type: 'create',
      path: '.gitignore',
      content: gitignoreContent,
      description: 'Add secret file patterns to .gitignore',
    },
    {
      type: 'create',
      path: '.env.example',
      content: envExampleContent,
      description: 'Create .env.example with placeholder secret references',
    },
  ];

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-008',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 15(4)',
    fixType: 'config_fix',
    framework: context.framework,
    actions,
    diff: generateCreateDiff('.gitignore', gitignoreContent) + '\n' + generateCreateDiff('.env.example', envExampleContent),
    scoreImpact: 6,
    commitMessage: `fix: add secret rotation scaffold for ${envVar} (Art. 15.4) -- via Complior`,
    description: `Add .gitignore entries and .env.example for secret ${envVar}`,
  };
};
