import { z } from 'zod';
import type { AgentPassport } from '../../../types/passport.types.js';

// --- Google A2A Agent Card Schema ---

export const A2ACardSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  humanReadableId: z.string(),
  agentVersion: z.string(),
  name: z.string(),
  description: z.string(),
  url: z.string(),
  provider: z.object({ name: z.string(), url: z.string() }),
  capabilities: z.object({
    a2aVersion: z.literal('1.0.0'),
    supportedMessageParts: z.array(z.string()),
    supportsPushNotifications: z.boolean(),
  }),
  skills: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
  })),
  tags: z.array(z.string()),
  lastUpdated: z.string(),
});

export type A2ACard = z.infer<typeof A2ACardSchema>;

// Well-known provider URLs (avoids fragile string mangling)
// Canonical mapping: provider name → URL (shared with import via reverse lookup)
export const PROVIDER_URLS: Readonly<Record<string, string>> = {
  openai: 'https://openai.com',
  anthropic: 'https://anthropic.com',
  google: 'https://ai.google',
  meta: 'https://ai.meta.com',
  mistral: 'https://mistral.ai',
  cohere: 'https://cohere.com',
};

export const resolveProviderUrl = (provider: string): string =>
  PROVIDER_URLS[provider.toLowerCase()] ?? '';

// Conditional tag collector (FP — no push mutations)
const collectTags = (manifest: AgentPassport): readonly string[] => [
  `risk:${manifest.compliance.eu_ai_act.risk_class}`,
  `autonomy:${manifest.autonomy_level}`,
  `type:${manifest.type}`,
  ...(manifest.model.data_residency !== '' ? [`region:${manifest.model.data_residency}`] : []),
];

export const mapToA2A = (manifest: AgentPassport): A2ACard => ({
  schemaVersion: '1.0.0' as const,
  humanReadableId: manifest.name,
  agentVersion: manifest.version,
  name: manifest.display_name,
  description: manifest.description,
  url: manifest.model.deployment !== '' ? manifest.model.deployment : '',
  provider: {
    name: manifest.model.provider,
    url: resolveProviderUrl(manifest.model.provider),
  },
  capabilities: {
    a2aVersion: '1.0.0' as const,
    supportedMessageParts: ['text'],
    supportsPushNotifications: false,
  },
  skills: manifest.permissions.tools.map((tool, i) => ({
    id: `skill-${i + 1}`,
    name: tool,
    description: `Tool capability: ${tool}`,
  })),
  tags: [...collectTags(manifest)],
  lastUpdated: manifest.updated,
});
