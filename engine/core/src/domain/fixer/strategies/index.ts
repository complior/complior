/**
 * Strategy registry — chain-of-responsibility pattern.
 * Order matters: specific strategies first, documentationStrategy as catch-all last.
 */
import type { Finding } from '../../../types/common.types.js';
import type { FixContext, FixPlan } from '../types.js';

import { sdkWrapperStrategy } from './sdk-wrapper.js';
import { permissionGuardStrategy } from './permission-guard.js';
import { killSwitchStrategy } from './kill-switch.js';
import { killSwitchTestStrategy } from './kill-switch-test.js';
import { errorHandlerStrategy } from './error-handler.js';
import { hitlGateStrategy } from './hitl-gate.js';
import { dataGovernanceStrategy } from './data-governance.js';
import { secretRotationStrategy } from './secret-rotation.js';
import { banditFixStrategy } from './bandit-fix.js';
import { cveUpgradeStrategy } from './cve-upgrade.js';
import { licenseFixStrategy } from './license-fix.js';
import { ciComplianceStrategy } from './ci-compliance.js';
import { biasTestingStrategy } from './bias-testing.js';
import { docCodeSyncStrategy } from './doc-code-sync.js';
import { disclosureStrategy } from './disclosure.js';
import { contentMarkingStrategy } from './content-marking.js';
import { loggingStrategy } from './logging.js';
import { metadataStrategy } from './metadata.js';
import { recordKeepingStrategy } from './record-keeping.js';
import { logRetentionStrategy } from './log-retention.js';
import { documentationStrategy, getTemplateMap } from './documentation.js';

// NOTE: friaStrategy removed — documentationStrategy handles OBL-013 via template-registry
const STRATEGIES = [
  sdkWrapperStrategy,
  permissionGuardStrategy,
  killSwitchStrategy,
  killSwitchTestStrategy,
  errorHandlerStrategy,
  hitlGateStrategy,
  dataGovernanceStrategy,
  secretRotationStrategy,
  banditFixStrategy,
  cveUpgradeStrategy,
  licenseFixStrategy,
  ciComplianceStrategy,
  biasTestingStrategy,
  docCodeSyncStrategy,
  disclosureStrategy,
  contentMarkingStrategy,
  loggingStrategy,
  recordKeepingStrategy,
  logRetentionStrategy,
  metadataStrategy,
  documentationStrategy,    // catch-all for obligation-based template fixes (incl. FRIA)
] as const;

export const findStrategy = (finding: Finding, context: FixContext): FixPlan | null => {
  for (const strategy of STRATEGIES) {
    const plan = strategy(finding, context);
    if (plan !== null) return plan;
  }
  return null;
};

export { getTemplateMap };
