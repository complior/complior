import type { CheckFunction } from '../../../ports/scanner.port.js';
import { checkAiDisclosure } from '../checks/ai-disclosure.js';
import { checkContentMarking } from '../checks/content-marking.js';
import { checkInteractionLogging } from '../checks/interaction-logging.js';
import { checkAiLiteracy } from '../checks/ai-literacy.js';
import { checkGpaiTransparency } from '../checks/gpai-transparency.js';
import { checkComplianceMetadata } from '../checks/compliance-metadata.js';
import { checkDocumentation } from '../checks/documentation.js';
import { checkPassportPresence } from '../checks/passport-presence.js';
import { checkPassportCompleteness } from '../checks/passport-completeness.js';
import { checkPermissions } from '../checks/permission-scanner.js';
import { checkBehavioralConstraints } from '../checks/behavioral-constraints.js';
import { checkIndustryPatterns } from '../checks/industry/index.js';
import {
  checkFriaPresence,
  checkArt5ScreeningPresence,
  checkTechnicalDocumentationPresence,
  checkIncidentReportPresence,
  checkDeclarationOfConformityPresence,
  checkMonitoringPolicyPresence,
  checkWorkerNotificationPresence,
} from '../checks/presence-check-factory.js';

export const L1_CHECKS: readonly CheckFunction[] = [
  checkAiDisclosure,
  checkContentMarking,
  checkInteractionLogging,
  checkAiLiteracy,
  checkGpaiTransparency,
  checkComplianceMetadata,
  checkDocumentation,
  checkPassportPresence,
  checkPassportCompleteness,
  checkPermissions,
  checkBehavioralConstraints,
  checkIndustryPatterns,
  checkFriaPresence,
  checkArt5ScreeningPresence,
  checkTechnicalDocumentationPresence,
  checkIncidentReportPresence,
  checkDeclarationOfConformityPresence,
  checkMonitoringPolicyPresence,
  checkWorkerNotificationPresence,
];
