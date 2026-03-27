import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';
import { scanPermissionsDetailed } from '../../passport/discovery/permission-scanner.js';
import { filterPassportManifests } from '../../passport/builder/manifest-files.js';

const CHECK_ID_UNDECLARED = 'undeclared-permission';
const CHECK_ID_UNUSED = 'unused-declared-permission';
const ARTICLE_REF = 'Art. 26(4)';
const OBLIGATION_ID = 'eu-ai-act-OBL-011';

const normalizeName = (name: string): string =>
  name.toLowerCase().replace(/(?:_tool|tool)$/, '');

const parseDeclaredTools = (content: string): readonly string[] => {
  try {
    const manifest = JSON.parse(content) as Record<string, unknown>;
    const permissions = manifest.permissions as Record<string, unknown> | undefined;
    return Array.isArray(permissions?.tools)
      ? (permissions.tools as string[]).filter((t): t is string => typeof t === 'string')
      : [];
  } catch {
    return [];
  }
};

export const checkPermissions = (ctx: ScanContext): readonly CheckResult[] => {
  const passportFiles = filterPassportManifests(ctx.files);

  if (passportFiles.length === 0) {
    return [{
      type: 'skip',
      checkId: CHECK_ID_UNDECLARED,
      reason: 'No passport found',
    }];
  }

  const { toolsDetailed } = scanPermissionsDetailed(ctx);
  const results: CheckResult[] = [];

  for (const file of passportFiles) {
    const declaredTools = parseDeclaredTools(file.content);
    const declaredNormalized = new Set(declaredTools.map(normalizeName));
    const discoveredNormalized = new Map(
      toolsDetailed.map((tool) => [normalizeName(tool.name), tool] as const),
    );

    // Undeclared: discovered in code but not in passport
    for (const [normalized, tool] of discoveredNormalized) {
      if (!declaredNormalized.has(normalized)) {
        results.push({
          type: 'fail',
          checkId: CHECK_ID_UNDECLARED,
          message: `Tool '${tool.name}' (${tool.framework}) used in code but not declared in Agent Passport — ${ARTICLE_REF}`,
          severity: 'high',
          obligationId: OBLIGATION_ID,
          articleReference: ARTICLE_REF,
          file: tool.file,
          line: tool.line,
          fix: `Add '${tool.name}' to permissions.tools[] in your Agent Passport`,
        });
      }
    }

    // Unused: declared in passport but not found in code
    for (const declared of declaredTools) {
      if (!discoveredNormalized.has(normalizeName(declared))) {
        results.push({
          type: 'fail',
          checkId: CHECK_ID_UNUSED,
          message: `Tool '${declared}' declared in Agent Passport but not found in code — ${ARTICLE_REF}`,
          severity: 'low',
          obligationId: OBLIGATION_ID,
          articleReference: ARTICLE_REF,
          fix: `Remove '${declared}' from permissions.tools[] or implement it in code`,
        });
      }
    }
  }

  // All match → pass
  if (results.length === 0) {
    return [{
      type: 'pass',
      checkId: CHECK_ID_UNDECLARED,
      message: `All tool permissions match between code and Agent Passport — ${ARTICLE_REF}`,
    }];
  }

  return results;
};
