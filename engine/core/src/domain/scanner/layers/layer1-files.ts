import type { CheckFunction } from '../../../ports/scanner.port.js';
import { checkAiDisclosure } from '../checks/ai-disclosure.js';
import { checkContentMarking } from '../checks/content-marking.js';
import { checkInteractionLogging } from '../checks/interaction-logging.js';
import { checkAiLiteracy } from '../checks/ai-literacy.js';
import { checkGpaiTransparency } from '../checks/gpai-transparency.js';
import { checkComplianceMetadata } from '../checks/compliance-metadata.js';
import { checkDocumentation } from '../checks/documentation.js';

export const L1_CHECKS: readonly CheckFunction[] = [
  checkAiDisclosure,
  checkContentMarking,
  checkInteractionLogging,
  checkAiLiteracy,
  checkGpaiTransparency,
  checkComplianceMetadata,
  checkDocumentation,
];
