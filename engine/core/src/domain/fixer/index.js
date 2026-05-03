// Self-contained proxy for test infrastructure that uses .js extension imports.
// All re-exports reference .ts sibling files (resolved by vitest bundler).
export { createFixer } from './create-fixer.js';
export { generateUnifiedDiff, generateCreateDiff } from './diff.js';
export { createEmptyHistory, addEntry, markUndone, getLastApplied, getById } from './fix-history.js';
export { fillTemplate, getTemplateForObligation, getAvailableTemplates } from './template-engine.js';
export { findStrategy } from './strategies/index.js';
export { filterFixPlansByProfile } from './fix-profile-filter.js';
// W-7: planFix is an alias for findStrategy so tests can probe the fixer planner
export { findStrategy as planFix } from './strategies/index.js';