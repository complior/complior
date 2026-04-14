import type { EngineStatus, ScanResult, CompliancePosture, ScoreBreakdown, ScanFilterContext, Finding } from '../types/common.types.js';
import type { PriorityAction } from '../domain/reporter/types.js';
import { buildScoreDisclaimer } from '../domain/scanner/score-disclaimer.js';
import { buildCategoryBreakdown } from '../domain/scanner/category-breakdown.js';
import { buildProfileAwareTopActions } from '../domain/scanner/profile-priority.js';
import type { OnboardingProfile } from '../onboarding/profile.js';

export interface StatusServiceDeps {
  readonly getVersion: () => string;
  readonly getMode: () => string;
  readonly getStartedAt: () => number;
  readonly getLastScanResult: () => ScanResult | null;
  /** Load project profile from .complior/profile.json */
  readonly loadProfile?: () => Promise<OnboardingProfile | null>;
  /** Count passports in the project */
  readonly listPassports?: (projectPath?: string) => Promise<readonly { name: string }[]>;
  /** Evidence chain store */
  readonly evidenceStore?: {
    readonly verify?: () => Promise<{ readonly valid: boolean }>;
  };
  readonly getProjectPath?: () => string;
}

const emptyScore = (): ScoreBreakdown => ({
  totalScore: 0,
  zone: 'green',
  categoryScores: [],
  criticalCapApplied: false,
  totalChecks: 0,
  passedChecks: 0,
  failedChecks: 0,
  skippedChecks: 0,
});

export const createStatusService = (deps: StatusServiceDeps) => {
  const { getVersion, getMode, getStartedAt, getLastScanResult, loadProfile, listPassports, evidenceStore, getProjectPath } = deps;

  const getStatus = (): EngineStatus => {
    const lastScan = getLastScanResult();

    return {
      ready: true,
      version: getVersion(),
      mode: getMode(),
      uptime: Date.now() - getStartedAt(),
      lastScan: lastScan
        ? {
            score: lastScan.score.totalScore,
            zone: lastScan.score.zone,
            findingsCount: lastScan.findings.length,
            criticalCount: lastScan.findings.filter(
              (f: Finding) => f.severity === 'critical',
            ).length,
            timestamp: lastScan.scannedAt,
          }
        : undefined,
    };
  };

  /** V1-M10 T-4: Build the full compliance posture for `complior status`. */
  const getCompliancePosture = async (): Promise<CompliancePosture> => {
    const lastScan = getLastScanResult();
    const projectPath = getProjectPath?.() ?? '';

    // Build score disclaimer
    const coveredIds: string[] = lastScan
      ? Array.from(
          new Set(
            lastScan.findings
              .filter((f: Finding) => f.type === 'pass' && f.obligationId !== undefined)
              .map((f: Finding) => f.obligationId as string),
          ),
        )
      : [];
    const disclaimer = lastScan
      ? buildScoreDisclaimer(lastScan.score, lastScan.filterContext ?? null, coveredIds)
      : buildScoreDisclaimer(emptyScore(), null, []);

    // Build category breakdown
    const categories = lastScan
      ? buildCategoryBreakdown(lastScan.score, lastScan.findings)
      : [];

    // V1-M10 T-3: build top actions via pure function
    const topActions: PriorityAction[] = lastScan
      ? buildProfileAwareTopActions(lastScan, lastScan.filterContext ?? null)
      : [];

    // Load profile for filter context
    let profile: ScanFilterContext | null = null;
    if (loadProfile) {
      try {
        const onboardingProfile = await loadProfile();
        if (onboardingProfile) {
          profile = {
            role: (onboardingProfile.organization?.role ?? 'both') as 'provider' | 'deployer' | 'both',
            riskLevel: (onboardingProfile.computed?.riskLevel ?? null) as 'high' | 'limited' | 'minimal' | 'unacceptable' | 'gpai' | 'gpai_systemic' | null,
            domain: onboardingProfile.business?.domain ?? null,
            profileFound: true,
            totalObligations: 108,
            applicableObligations: onboardingProfile.computed?.applicableObligations?.length ?? 108,
            skippedByRole: 0,
            skippedByRiskLevel: 0,
          };
        }
      } catch { /* ignore */ }
    }

    // Passport count
    let passportCount = 0;
    if (listPassports) {
      try {
        const passports = await listPassports(projectPath);
        passportCount = passports.length;
      } catch { /* ignore */ }
    }

    // Evidence verified
    let evidenceVerified: boolean | null = null;
    if (evidenceStore?.verify) {
      try {
        const result = await evidenceStore.verify();
        evidenceVerified = result.valid;
      } catch { /* ignore */ }
    }

    return {
      score: lastScan?.score ?? emptyScore(),
      disclaimer,
      categories,
      topActions,
      profile,
      lastScanAt: lastScan?.scannedAt ?? null,
      passportCount,
      documentCount: 0,
      evidenceVerified,
    };
  };

  return Object.freeze({ getStatus, getCompliancePosture });
};

export type StatusService = ReturnType<typeof createStatusService>;
