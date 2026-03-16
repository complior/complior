import type { CheckResult } from '../../../types/common.types.js';

export interface GitFileHistory {
  readonly relativePath: string;
  readonly created: string;        // ISO date of first commit
  readonly lastModified: string;   // ISO date of last commit
  readonly commitCount: number;
  readonly authors: readonly string[];
  readonly daysSinceLastModified: number;
}

export interface GitHistoryResult {
  readonly fileHistories: readonly GitFileHistory[];
  readonly bulkCommits: readonly { hash: string; docCount: number; date: string }[];
}

/** Port for git operations — keeps domain I/O-free (Clean Architecture). */
export interface GitHistoryPort {
  readonly isGitRepo: (projectPath: string) => boolean;
  readonly listTrackedFiles: (projectPath: string) => readonly string[];
  readonly getFileLog: (projectPath: string, filePath: string) => readonly { hash: string; date: string; author: string }[];
}

const COMPLIANCE_DOCS = [
  'fria.md', 'risk-management.md', 'risk-assessment.md', 'data-governance.md',
  'technical-documentation.md', 'tech-documentation.md', 'transparency-notice.md',
  'human-oversight.md', 'incident-report.md', 'monitoring-plan.md', 'monitoring-policy.md',
  'worker-notification.md', 'ai-literacy.md', 'art5-screening.md', 'model-card.md',
  'declaration-of-conformity.md', 'declaration-conformity.md', 'qms.md',
  'quality-management.md', 'instructions-for-use.md', 'data-quality.md',
];

const isComplianceDoc = (path: string): boolean => {
  const filename = path.split('/').pop()?.toLowerCase() ?? '';
  return COMPLIANCE_DOCS.some((doc) => filename === doc);
};

const daysBetween = (dateStr: string): number => {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Analyze git history for compliance documents.
 * Pure domain function — receives git operations via port.
 */
export const analyzeGitHistory = (projectPath: string, git: GitHistoryPort): GitHistoryResult => {
  if (!git.isGitRepo(projectPath)) {
    return { fileHistories: [], bulkCommits: [] };
  }

  const trackedFiles = git.listTrackedFiles(projectPath);
  const compliancePaths = trackedFiles.filter(isComplianceDoc);

  const fileHistories: GitFileHistory[] = [];
  const commitDocMap = new Map<string, { docs: string[]; date: string }>();

  for (const filePath of compliancePaths) {
    const commits = git.getFileLog(projectPath, filePath);
    if (commits.length === 0) continue;

    const authors = [...new Set(commits.map((c) => c.author))];
    const lastModified = commits[0]?.date ?? '';
    const created = commits[commits.length - 1]?.date ?? '';

    fileHistories.push({
      relativePath: filePath,
      created,
      lastModified,
      commitCount: commits.length,
      authors,
      daysSinceLastModified: daysBetween(lastModified),
    });

    for (const commit of commits) {
      const existing = commitDocMap.get(commit.hash);
      if (existing) {
        existing.docs.push(filePath);
      } else {
        commitDocMap.set(commit.hash, { docs: [filePath], date: commit.date });
      }
    }
  }

  const bulkCommits = [...commitDocMap.entries()]
    .filter(([, v]) => v.docs.length > 3)
    .map(([hash, v]) => ({ hash, docCount: v.docs.length, date: v.date }));

  return { fileHistories, bulkCommits };
};

/**
 * Convert git history analysis into scanner CheckResults.
 */
export const gitHistoryToCheckResults = (result: GitHistoryResult): readonly CheckResult[] => {
  const checks: CheckResult[] = [];

  for (const file of result.fileHistories) {
    const docName = file.relativePath.split('/').pop() ?? file.relativePath;

    // Freshness checks
    if (file.daysSinceLastModified > 180) {
      checks.push({
        type: 'fail',
        checkId: `git-freshness-${docName.replace(/\.md$/i, '')}`,
        message: `${docName} not updated in ${file.daysSinceLastModified} days — may be outdated (Art. 9(2): "throughout the lifetime")`,
        severity: 'medium',
        obligationId: 'eu-ai-act-OBL-020',
        articleReference: 'Art. 9(2)',
        fix: `Review and update ${docName} — last modified ${file.lastModified.split('T')[0]}`,
        file: file.relativePath,
      });
    } else if (file.daysSinceLastModified > 90) {
      checks.push({
        type: 'fail',
        checkId: `git-freshness-${docName.replace(/\.md$/i, '')}`,
        message: `${docName} not updated in ${file.daysSinceLastModified} days — consider reviewing`,
        severity: 'low',
        obligationId: 'eu-ai-act-OBL-020',
        articleReference: 'Art. 9(2)',
        fix: `Review ${docName} for accuracy — last modified ${file.lastModified.split('T')[0]}`,
        file: file.relativePath,
      });
    } else {
      checks.push({
        type: 'pass',
        checkId: `git-freshness-${docName.replace(/\.md$/i, '')}`,
        message: `${docName} is fresh — last updated ${file.daysSinceLastModified}d ago (${file.commitCount} commits)`,
      });
    }

    // Single-author warning for risk assessments and FRIAs
    const isRiskDoc = /fria|risk/i.test(docName);
    if (isRiskDoc && file.authors.length === 1) {
      checks.push({
        type: 'fail',
        checkId: `git-author-diversity-${docName.replace(/\.md$/i, '')}`,
        message: `${docName} has only 1 author (${file.authors[0]}) — multi-stakeholder review recommended`,
        severity: 'info',
        obligationId: 'eu-ai-act-OBL-013',
        articleReference: 'Art. 27(1)',
        fix: `Have additional stakeholders review and commit to ${docName}`,
        file: file.relativePath,
      });
    }
  }

  // Bulk commit detection
  for (const bulk of result.bulkCommits) {
    checks.push({
      type: 'fail',
      checkId: 'git-bulk-compliance',
      message: `Bulk compliance commit detected: ${bulk.docCount} documents in single commit ${bulk.hash.slice(0, 7)} (${bulk.date.split('T')[0]})`,
      severity: 'low',
      obligationId: 'eu-ai-act-OBL-020',
      articleReference: 'Art. 9(2)',
      fix: 'Compliance documents should be maintained incrementally, not created in bulk',
    });
  }

  return checks;
};
