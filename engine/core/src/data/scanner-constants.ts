/**
 * Centralized extension and directory constants for the scanner.
 * Single source of truth — all scanner modules import from here.
 * Lives in data/ (architecturally neutral) so both domain/ and infra/ can import.
 */

/** Code files parseable by the scanner for pattern matching and structural analysis. */
export const CODE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java',
]);

/** SWC-parseable subset (TS/JS only) — used for AST structural analysis. */
export const AST_SUPPORTED_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
]);

/** Documentation files checked by L2 document structure validation. */
export const DOC_EXTENSIONS: ReadonlySet<string> = new Set(['.md', '.rst']);

/** Configuration files checked by L3 config/dependency scanning. */
export const CONFIG_EXTENSIONS: ReadonlySet<string> = new Set(['.json', '.yaml', '.yml', '.toml']);

/** Web/style files included in project scans but not pattern-matched. */
export const STYLE_EXTENSIONS: ReadonlySet<string> = new Set(['.html', '.css', '.vue']);

/** ML model files — checked by ModelScan in Tier 2 deep scans. */
export const MODEL_EXTENSIONS: ReadonlySet<string> = new Set([
  '.pkl', '.pickle', '.pt', '.pth', '.h5', '.hdf5', '.safetensors', '.onnx', '.pb', '.tflite',
]);

/** Union of all extension categories — used by file-collector for project scanning. */
export const ALL_SCANNABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  ...CODE_EXTENSIONS,
  ...AST_SUPPORTED_EXTENSIONS,
  ...DOC_EXTENSIONS,
  ...CONFIG_EXTENSIONS,
  ...STYLE_EXTENSIONS,
  ...MODEL_EXTENSIONS,
]);

/** Directories excluded from scanning — canonical superset shared by scanner, file-watcher, passport modules. */
export const EXCLUDED_DIRS: ReadonlySet<string> = new Set([
  'node_modules', '.git', '.complior', 'dist', 'build', '.next', 'coverage',
  '__pycache__', 'vendor', '.cache', '.output', '__tests__',
  'target', '.nuxt', 'out',
]);
