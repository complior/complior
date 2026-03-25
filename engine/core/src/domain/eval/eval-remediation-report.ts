/**
 * Eval Remediation Report — generates structured remediation plans from eval results.
 *
 * US-REM-08: Full remediation report with prioritized actions, timelines, and patches.
 */

import type { EvalResult } from './types.js';
import type {
  CategoryPlaybook,
  RemediationAction,
  RemediationReport,
  RemediationReportAction,
} from './remediation-types.js';
import { generateSystemPromptPatch, generateApiConfigPatch } from './eval-fix-generator.js';
import { PRIORITY_ORDER, PRIORITY_TIMELINE } from './eval-constants.js';
import { isFailedVerdict } from './verdict-utils.js';

// ── Report generation ────────────────────────────────────────

/**
 * Generate a full remediation report from eval result + playbooks.
 */
export const generateRemediationReport = (
  result: EvalResult,
  remediation: Record<string, readonly RemediationAction[]>,
  playbooks: readonly CategoryPlaybook[],
): RemediationReport => {
  const failures = result.results.filter(isFailedVerdict);

  // Deduplicate actions across all tests and count affected tests
  const actionCounts = new Map<string, { action: RemediationAction; testCount: number }>();

  for (const [_testId, actions] of Object.entries(remediation)) {
    for (const action of actions) {
      const existing = actionCounts.get(action.id);
      if (existing) {
        existing.testCount++;
      } else {
        actionCounts.set(action.id, { action, testCount: 1 });
      }
    }
  }

  // Sort by priority × test count
  const sorted = [...actionCounts.values()]
    .sort((a, b) => {
      const priDiff = (PRIORITY_ORDER[a.action.priority] ?? 3) - (PRIORITY_ORDER[b.action.priority] ?? 3);
      if (priDiff !== 0) return priDiff;
      return b.testCount - a.testCount;
    });

  // Build report actions (top 10)
  const reportActions: RemediationReportAction[] = sorted.slice(0, 10).map((item) => ({
    id: item.action.id,
    title: item.action.title,
    description: item.action.description,
    example: item.action.example,
    priority: item.action.priority,
    effort: item.action.effort,
    article_ref: item.action.article_ref,
    affected_tests: item.testCount,
    timeline: PRIORITY_TIMELINE[item.action.priority] ?? 'backlog',
    steps: [...item.action.user_guidance.what_to_do],
  }));

  // Critical gaps
  const criticalGaps: string[] = [];
  for (const cat of result.categories) {
    if (cat.total === 0) continue;
    const passRate = cat.passed / cat.total;
    const isCritical = cat.category === 'transparency' || cat.category === 'prohibited';
    if (passRate < 0.20 || (isCritical && cat.failed > 0)) {
      criticalGaps.push(cat.category);
    }
  }

  // Generate patches
  const systemPromptPatch = generateSystemPromptPatch(failures, playbooks);
  const apiConfigPatch = generateApiConfigPatch(failures, playbooks);
  const hasApiConfig = Object.keys(apiConfigPatch.headers).length > 0
    || (apiConfigPatch.inputValidation.bannedPatterns?.length ?? 0) > 0
    || (apiConfigPatch.outputValidation.piiFilterPatterns?.length ?? 0) > 0;

  return Object.freeze({
    score: result.overallScore,
    grade: result.grade,
    total_failures: failures.length,
    critical_gaps: Object.freeze(criticalGaps),
    actions: Object.freeze(reportActions),
    system_prompt_patch: systemPromptPatch || undefined,
    api_config_patch: hasApiConfig ? apiConfigPatch : undefined,
    timestamp: new Date().toISOString(),
  });
};

// ── Markdown rendering ───────────────────────────────────────

/**
 * Render a remediation report as human-readable markdown.
 */
export const renderRemediationMarkdown = (report: RemediationReport): string => {
  const lines: string[] = [
    '# Complior Eval — Remediation Report',
    '',
    `**Date:** ${report.timestamp.split('T')[0]}`,
    `**Score:** ${report.score}/100 (Grade ${report.grade})`,
    `**Total failures:** ${report.total_failures}`,
    '',
  ];

  // Executive summary
  lines.push('## Executive Summary');
  lines.push('');
  if (report.critical_gaps.length > 0) {
    lines.push(`**Critical compliance gaps:** ${report.critical_gaps.join(', ')}`);
    lines.push('');
    lines.push('These gaps represent enforcement risk under the EU AI Act. Address them immediately.');
  } else {
    lines.push('No critical compliance gaps detected. Focus on improving pass rates in failing categories.');
  }
  lines.push('');

  // Prioritized action plan
  lines.push('## Prioritized Action Plan');
  lines.push('');
  lines.push(`${report.actions.length} remediation actions identified:`);
  lines.push('');

  for (let i = 0; i < report.actions.length; i++) {
    const a = report.actions[i];
    const priorityTag = a.priority.toUpperCase();
    lines.push(`### ${i + 1}. [${priorityTag}] ${a.title}`);
    lines.push('');
    lines.push(`- **Article:** ${a.article_ref}`);
    lines.push(`- **Affected tests:** ${a.affected_tests}`);
    lines.push(`- **Effort:** ${a.effort}`);
    lines.push(`- **Timeline:** ${a.timeline}`);
    lines.push('');
    lines.push('**Steps:**');
    for (const step of a.steps) {
      lines.push(`1. ${step}`);
    }
    lines.push('');
  }

  // System prompt patch
  if (report.system_prompt_patch) {
    lines.push('## System Prompt Patch');
    lines.push('');
    lines.push(report.system_prompt_patch);
    lines.push('');
  }

  // API config patch
  if (report.api_config_patch) {
    lines.push('## API Configuration Patch');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(report.api_config_patch, null, 2));
    lines.push('```');
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Generated by `complior eval --remediation`*');

  return lines.join('\n');
};
