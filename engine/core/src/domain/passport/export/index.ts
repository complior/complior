import type { AgentPassport } from '../../../types/passport.types.js';
import { mapToA2A, A2ACardSchema } from './a2a-mapper.js';
import type { A2ACard } from './a2a-mapper.js';
import { mapToAIUC1, AIUC1ProfileSchema } from './aiuc1-mapper.js';
import type { AIUC1Profile } from './aiuc1-mapper.js';
import { mapToNIST, NISTProfileSchema } from './nist-mapper.js';
import type { NISTProfile } from './nist-mapper.js';

export type ExportFormat = 'a2a' | 'aiuc-1' | 'nist';

// Discriminated union — каждый format гарантирует свой тип data
export type ExportResult =
  | { readonly format: 'a2a'; readonly data: A2ACard; readonly timestamp: string; readonly valid: boolean }
  | { readonly format: 'aiuc-1'; readonly data: AIUC1Profile; readonly timestamp: string; readonly valid: boolean }
  | { readonly format: 'nist'; readonly data: NISTProfile; readonly timestamp: string; readonly valid: boolean };

export const exportPassport = (manifest: AgentPassport, format: ExportFormat): ExportResult => {
  const timestamp = new Date().toISOString();

  switch (format) {
    case 'a2a': {
      const data = mapToA2A(manifest);
      return { format, data, timestamp, valid: A2ACardSchema.safeParse(data).success };
    }
    case 'aiuc-1': {
      const data = mapToAIUC1(manifest);
      return { format, data, timestamp, valid: AIUC1ProfileSchema.safeParse(data).success };
    }
    case 'nist': {
      const data = mapToNIST(manifest);
      return { format, data, timestamp, valid: NISTProfileSchema.safeParse(data).success };
    }
  }
};

export { mapToA2A, A2ACardSchema } from './a2a-mapper.js';
export type { A2ACard } from './a2a-mapper.js';
export { mapToAIUC1, AIUC1ProfileSchema } from './aiuc1-mapper.js';
export type { AIUC1Profile } from './aiuc1-mapper.js';
export { mapToNIST, NISTProfileSchema } from './nist-mapper.js';
export type { NISTProfile } from './nist-mapper.js';
