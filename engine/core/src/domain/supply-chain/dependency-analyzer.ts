import type { ParsedDependency } from '../scanner/layers/layer3-parsers.js';
import { isBannedPackage, isAiSdkPackage, BIAS_TESTING_PACKAGES } from '../scanner/rules/banned-packages.js';
import { REGISTRY_CARDS, findRegistryCard, isGpaiSystemic, getProviderName } from '../../data/registry-cards.js';
import type { SupplyChainRisk, SupplyChainReport } from './types.js';

export const SUPPLY_CHAIN_OBLIGATIONS = ['OBL-026', 'OBL-005'] as const;

const SEVERITY_SCORES: Record<SupplyChainRisk['severity'], number> = {
  critical: 25,
  high: 15,
  medium: 5,
  low: 1,
};

/** Classify a single dependency into risks, SDK flag, and bias-testing flag. */
const classifyDependency = (dep: ParsedDependency) => {
  const risks: SupplyChainRisk[] = [];
  let isAiSdk = false;
  let isBiasTest = false;

  const banned = isBannedPackage(dep.name);
  if (banned) {
    risks.push({
      type: 'banned-package',
      severity: 'critical',
      packageName: dep.name,
      packageVersion: dep.version,
      ecosystem: dep.ecosystem,
      description: `Banned package "${dep.name}" detected: ${banned.reason}`,
      articleRef: 'Art.5',
      obligationId: 'OBL-005',
    });
  }

  const sdkProvider = isAiSdkPackage(dep.name);
  if (sdkProvider) {
    isAiSdk = true;

    // Check if provider has a registry card
    const providerHasCard = REGISTRY_CARDS.some(
      (c) => getProviderName(c).toLowerCase() === sdkProvider.toLowerCase(),
    );
    if (!providerHasCard) {
      risks.push({
        type: 'ai-sdk-no-card',
        severity: 'low',
        packageName: dep.name,
        packageVersion: dep.version,
        ecosystem: dep.ecosystem,
        description: `AI SDK "${dep.name}" (${sdkProvider}) has no matching registry card`,
        articleRef: 'Art.25',
        obligationId: 'OBL-026',
      });
    }
  }

  if (BIAS_TESTING_PACKAGES.has(dep.name)) {
    isBiasTest = true;
  }

  return { risks, isAiSdk, isBiasTest };
};

export const analyzeSupplyChain = (
  projectPath: string,
  dependencies: readonly ParsedDependency[],
  detectedModels: readonly string[],
): SupplyChainReport => {
  const startTime = Date.now();
  const risks: SupplyChainRisk[] = [];

  let aiSdkCount = 0;
  let bannedCount = 0;
  let hasBiasTesting = false;

  // Single pass: classify each dependency
  for (const dep of dependencies) {
    const result = classifyDependency(dep);
    risks.push(...result.risks);
    if (result.isAiSdk) aiSdkCount++;
    if (result.risks.some((r) => r.type === 'banned-package')) bannedCount++;
    if (result.isBiasTest) hasBiasTesting = true;
  }

  // Flag missing bias testing if AI SDKs are present
  if (aiSdkCount > 0 && !hasBiasTesting) {
    risks.push({
      type: 'missing-bias-testing',
      severity: 'medium',
      packageName: '',
      packageVersion: '',
      ecosystem: '',
      description: `${aiSdkCount} AI SDK(s) detected but no bias testing package (fairlearn, aif360, aequitas, etc.)`,
      articleRef: 'Art.10',
      obligationId: 'OBL-026',
    });
  }

  // Match detected models to cards and flag systemic risk
  const matchedCards = detectedModels
    .map((id) => findRegistryCard(id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  for (const card of matchedCards) {
    if (isGpaiSystemic(card)) {
      risks.push({
        type: 'gpai-systemic',
        severity: 'high',
        packageName: card.slug,
        packageVersion: '',
        ecosystem: getProviderName(card).toLowerCase(),
        description: `Model "${card.name}" by ${getProviderName(card)} is classified as GPAI with systemic risk (Art.51)`,
        articleRef: 'Art.51',
        obligationId: 'OBL-026',
      });
    }
  }

  // Compute risk score (capped at 100)
  const riskScore = Math.min(
    100,
    risks.reduce((sum, r) => sum + SEVERITY_SCORES[r.severity], 0),
  );

  return Object.freeze({
    projectPath,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    totalDependencies: dependencies.length,
    aiSdkCount,
    bannedCount,
    risks: Object.freeze([...risks]),
    riskScore,
    detectedModels: Object.freeze([...detectedModels]),
    registryCards: Object.freeze([...matchedCards]),
    obligationRefs: Object.freeze([...SUPPLY_CHAIN_OBLIGATIONS]),
  });
};
