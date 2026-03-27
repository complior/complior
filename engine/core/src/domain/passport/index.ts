// Discovery
export { discoverAgents } from './discovery/agent-discovery.js';
export { analyzeAutonomy } from './discovery/autonomy-analyzer.js';
export type { AutonomyAnalysis } from './discovery/autonomy-analyzer.js';
export { scanPermissions, scanPermissionsDetailed } from './discovery/permission-scanner.js';
export type { DiscoveredPermissions, ToolFramework, DiscoveredTool, DiscoveredPermissionsDetailed } from './discovery/permission-scanner.js';

// Builder
export { mapDomain } from './builder/domain-mapper.js';
export { buildPassport, resolveRiskClass, getApplicableArticles } from './builder/manifest-builder.js';
export { inferDataResidency, computeNextReview, buildOversight, computeDeployerObligations } from './builder/manifest-builder.js';
export { ALL_PASSPORT_FIELDS } from './builder/manifest-builder.js';
export type { ProjectProfile, ExistingPassportDates, PassportBuildInput } from './builder/manifest-builder.js';
export { computeManifestDiff } from './builder/manifest-diff.js';
export type { ManifestDiffField, ManifestDiffResult } from './builder/manifest-diff.js';
export { isPassportManifest, filterPassportManifests, extractRiskClass } from './builder/manifest-files.js';

// Validation
export { OBLIGATION_FIELD_MAP, getFieldValue, isNonEmpty, getRequiredFields, getMissingFields } from './obligation-field-map.js';
export type { ObligationFieldMapping, MissingField } from './obligation-field-map.js';
export { computeCompleteness, validatePassport } from './passport-validator.js';
export type { ValidationError, CompletenessResult, ValidationResult } from './passport-validator.js';

// Crypto
export { generateKeyPair, loadOrCreateKeyPair, signPassport, verifyPassport } from './crypto-signer.js';

// Compliance
export { deriveDocStatusFromFindings, buildScanSummary, buildDocQualitySummary } from './scan-to-compliance.js';

// Testing
export { generateComplianceTests } from './test-generator.js';
export type { TestGeneratorInput, GeneratedTestSuite } from './test-generator.js';
