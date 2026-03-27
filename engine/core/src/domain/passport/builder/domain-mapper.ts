import type { AgentPassport } from '../../../types/passport.types.js';

/** Map AgentPassport to a domain string (analytics, coding, other). */
export const mapDomain = (manifest: AgentPassport): string => {
  if (manifest.type === 'autonomous') return 'analytics';
  const tools = manifest.permissions?.tools ?? [];
  if (tools.some((t: string) => t.includes('code') || t.includes('file'))) return 'coding';
  return 'other';
};
