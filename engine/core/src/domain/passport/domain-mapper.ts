import type { AgentManifest } from '../../types/passport.types.js';

/** Map AgentManifest to a domain string (analytics, coding, other). */
export const mapDomain = (manifest: AgentManifest): string => {
  if (manifest.type === 'autonomous') return 'analytics';
  const tools = manifest.permissions?.tools ?? [];
  if (tools.some((t: string) => t.includes('code') || t.includes('file'))) return 'coding';
  return 'other';
};
