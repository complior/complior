import { findStrategy } from './strategies/index.js';

export { createFixer } from './create-fixer.js';
export type { FixerDeps, Fixer } from './create-fixer.js';
export { generateUnifiedDiff, generateCreateDiff } from './diff.js';
export { createEmptyHistory, addEntry, markUndone, getLastApplied, getById } from './fix-history.js';
export { fillTemplate, getTemplateForObligation, getAvailableTemplates } from './template-engine.js';
export type { TemplateData } from './template-engine.js';
export type { FixType, FixAction, FixPlan, FixResult, FixContext } from './types.js';
export type { FixValidation, FixHistoryFile, FixHistoryEntry, FixHistory, FixStrategy, TemplateMapping } from './types.js';
export { findStrategy } from './strategies/index.js';
export { filterFixPlansByProfile } from './fix-profile-filter.js';
export type { FixFilterProfile, FixFilterContext } from './fix-profile-filter.js';

// W-7: planFix is an alias for findStrategy so tests can probe the fixer planner
export const planFix = findStrategy;