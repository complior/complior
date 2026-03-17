/**
 * Re-export from data/scanner-constants.ts (architecturally neutral location).
 * Domain modules import from here; infra modules import directly from data/.
 */
export {
  CODE_EXTENSIONS,
  AST_SUPPORTED_EXTENSIONS,
  DOC_EXTENSIONS,
  CONFIG_EXTENSIONS,
  STYLE_EXTENSIONS,
  ALL_SCANNABLE_EXTENSIONS,
  EXCLUDED_DIRS,
} from '../../data/scanner-constants.js';
