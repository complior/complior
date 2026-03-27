export { createFixer } from './create-fixer.js';
export type { FixerDeps, Fixer } from './create-fixer.js';
export { generateUnifiedDiff, generateCreateDiff } from './diff.js';
export { createEmptyHistory, addEntry, markUndone, getLastApplied, getById } from './fix-history.js';
export { fillTemplate, getTemplateForObligation, getAvailableTemplates } from './template-engine.js';
export type { TemplateData } from './template-engine.js';
export type { FixType, FixAction, FixPlan, FixResult, FixContext } from './types.js';
export type { FixValidation, FixHistoryFile, FixHistoryEntry, FixHistory, FixStrategy, TemplateMapping } from './types.js';
export { findStrategy } from './strategies/index.js';
