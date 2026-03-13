import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';

const ProjectConfigSchema = z.object({
  compliance: z.object({
    frameworks: z.array(z.string()).min(1),
  }).default({ frameworks: ['eu-ai-act'] }),
  llm: z.object({
    model: z.string().optional(),
    provider: z.string().optional(),
    apiKey: z.string().optional(),
    maxRequestsPerHour: z.number().int().positive().optional(),
  }).optional(),
}).default({});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

const DEFAULT_CONFIG: ProjectConfig = Object.freeze({
  compliance: Object.freeze({ frameworks: ['eu-ai-act'] }),
});

export const loadProjectConfig = async (projectPath: string): Promise<ProjectConfig> => {
  const configPath = resolve(projectPath, '.complior', 'config.json');
  try {
    const raw = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return ProjectConfigSchema.parse(parsed);
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const getSelectedFrameworks = (config: ProjectConfig): readonly string[] =>
  config.compliance.frameworks;
