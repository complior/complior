import obligations from '../../data/regulations/eu-ai-act/obligations.json' with { type: 'json' };
import technicalRequirements from '../../data/regulations/eu-ai-act/technical-requirements.json' with { type: 'json' };
import scoring from '../../data/regulations/eu-ai-act/scoring.json' with { type: 'json' };
import regulationMeta from '../../data/regulations/eu-ai-act/regulation-meta.json' with { type: 'json' };
import applicabilityTree from '../../data/regulations/eu-ai-act/applicability-tree.json' with { type: 'json' };
import crossMapping from '../../data/regulations/eu-ai-act/cross-mapping.json' with { type: 'json' };
import localization from '../../data/regulations/eu-ai-act/localization.json' with { type: 'json' };
import timeline from '../../data/regulations/eu-ai-act/timeline.json' with { type: 'json' };

export const REGULATION_RAW = {
  obligations,
  technicalRequirements,
  scoring,
  regulationMeta,
  applicabilityTree,
  crossMapping,
  localization,
  timeline,
} as const;
