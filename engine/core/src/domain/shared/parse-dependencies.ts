/**
 * Shared dependency parsing from ScanContext.
 * Single source of truth — used by passport-service, scan-service, and getSbom.
 * Filters out node_modules to avoid parsing vendored package.json files.
 */
import type { ScanContext } from '../../ports/scanner.port.js';
import type { ParsedDependency } from '../scanner/layers/layer3-parsers.js';
import { parsePackageJson, parseRequirementsTxt, parseCargoToml, parseGoMod } from '../scanner/layers/layer3-parsers.js';

export const parseDepsFromContext = (ctx: ScanContext): readonly ParsedDependency[] => {
  const allDeps: ParsedDependency[] = [];
  for (const file of ctx.files) {
    const filename = file.relativePath.split('/').pop() ?? '';
    if (filename === 'package.json' && !file.relativePath.includes('node_modules'))
      allDeps.push(...parsePackageJson(file.content));
    else if (filename === 'requirements.txt') allDeps.push(...parseRequirementsTxt(file.content));
    else if (filename === 'Cargo.toml') allDeps.push(...parseCargoToml(file.content));
    else if (filename === 'go.mod') allDeps.push(...parseGoMod(file.content));
  }
  return allDeps;
};
