import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';
import type { CompliorConfig } from '../types/common.types.js';
import { ConfigError } from '../types/errors.js';

const CompliorConfigSchema = z.object({
  projectPath: z.string().optional(),
  extends: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional(),
  outputFormat: z.enum(['json', 'text', 'sarif']).optional(),
});

const DEFAULTS: Omit<CompliorConfig, 'projectPath'> = {
  extends: ['complior:eu-ai-act'],
  exclude: ['node_modules', '.git', 'dist', 'build'],
  severity: 'low',
  outputFormat: 'json',
};

export const loadConfig = async (searchFrom?: string): Promise<CompliorConfig> => {
  const explorer = cosmiconfig('complior', {
    searchPlaces: [
      '.compliorrc',
      '.compliorrc.json',
      '.compliorrc.yaml',
      '.compliorrc.yml',
      'complior.config.js',
      'complior.config.cjs',
    ],
  });

  const result = await explorer.search(searchFrom).catch(() => null);
  const rawConfig = result?.config ?? {};

  const parsed = CompliorConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    throw new ConfigError(`Invalid config: ${parsed.error.message}`);
  }

  const projectPath = parsed.data.projectPath ?? searchFrom ?? process.cwd();

  return {
    projectPath,
    extends: parsed.data.extends ?? DEFAULTS.extends,
    exclude: parsed.data.exclude ?? DEFAULTS.exclude,
    severity: parsed.data.severity ?? DEFAULTS.severity,
    outputFormat: parsed.data.outputFormat ?? DEFAULTS.outputFormat,
  };
};
