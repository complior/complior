import type { CheckResult, Severity } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';
import { parseLockfiles, type LockfileDependency } from '../layers/lockfile-parsers.js';

export const COPYLEFT_LICENSES = new Set([
  'GPL-2.0', 'GPL-2.0-only', 'GPL-2.0-or-later',
  'GPL-3.0', 'GPL-3.0-only', 'GPL-3.0-or-later',
  'AGPL-3.0', 'AGPL-3.0-only', 'AGPL-3.0-or-later',
  'LGPL-2.1', 'LGPL-2.1-only', 'LGPL-2.1-or-later',
  'LGPL-3.0', 'LGPL-3.0-only', 'LGPL-3.0-or-later',
  'SSPL-1.0',
  'EUPL-1.2',
  'MPL-2.0',
  'CC-BY-SA-4.0',
]);

export interface KnownVulnerability {
  readonly package: string;
  readonly versions: readonly string[];
  readonly cve: string;
  readonly severity: 'critical' | 'high' | 'medium';
  readonly description: string;
}

export const KNOWN_VULNERABLE: readonly KnownVulnerability[] = [
  { package: 'lodash', versions: ['4.17.20', '4.17.19', '4.17.15', '4.17.11'], cve: 'CVE-2021-23337', severity: 'high', description: 'Prototype Pollution via template' },
  { package: 'minimist', versions: ['1.2.5', '1.2.4', '1.2.3', '0.2.1'], cve: 'CVE-2021-44906', severity: 'critical', description: 'Prototype Pollution' },
  { package: 'node-fetch', versions: ['2.6.1', '2.6.0', '1.7.3'], cve: 'CVE-2022-0235', severity: 'high', description: 'Exposure of Sensitive Information' },
  { package: 'tar', versions: ['6.1.0', '6.0.5', '4.4.15'], cve: 'CVE-2021-37712', severity: 'high', description: 'Arbitrary File Creation/Overwrite' },
  { package: 'glob-parent', versions: ['5.1.1', '5.1.0', '3.1.0'], cve: 'CVE-2021-35065', severity: 'high', description: 'Regular Expression Denial of Service' },
  { package: 'json5', versions: ['2.2.1', '2.2.0', '1.0.1'], cve: 'CVE-2022-46175', severity: 'high', description: 'Prototype Pollution' },
  { package: 'semver', versions: ['7.3.7', '7.3.5', '6.3.0'], cve: 'CVE-2022-25883', severity: 'medium', description: 'Regular Expression Denial of Service' },
  { package: 'yaml', versions: ['2.1.1', '2.1.0', '1.10.2'], cve: 'CVE-2023-2251', severity: 'medium', description: 'Arbitrary Code Execution' },
  { package: 'word-wrap', versions: ['1.2.3', '1.2.2'], cve: 'CVE-2023-26115', severity: 'medium', description: 'Regular Expression Denial of Service' },
  { package: 'tough-cookie', versions: ['4.1.2', '4.1.1', '4.0.0'], cve: 'CVE-2023-26136', severity: 'medium', description: 'Prototype Pollution' },
  { package: 'xml2js', versions: ['0.5.0', '0.4.23'], cve: 'CVE-2023-0842', severity: 'medium', description: 'Prototype Pollution' },
  { package: 'express', versions: ['4.17.1', '4.17.0', '4.16.4'], cve: 'CVE-2024-29041', severity: 'medium', description: 'Open Redirect in malformed URLs' },
  { package: 'axios', versions: ['1.6.0', '1.5.1', '0.21.1'], cve: 'CVE-2023-45857', severity: 'medium', description: 'Cross-Site Request Forgery via cookie exposure' },
  { package: 'ua-parser-js', versions: ['0.7.31', '0.7.28'], cve: 'CVE-2022-25927', severity: 'high', description: 'Regular Expression Denial of Service' },
  { package: 'qs', versions: ['6.10.3', '6.9.7', '6.5.3'], cve: 'CVE-2022-24999', severity: 'high', description: 'Prototype Pollution' },
  { package: 'decode-uri-component', versions: ['0.2.0', '0.2.1'], cve: 'CVE-2022-38900', severity: 'high', description: 'Improper Input Validation / DoS' },
  { package: 'jsonwebtoken', versions: ['8.5.1', '8.5.0', '8.4.0'], cve: 'CVE-2022-23529', severity: 'critical', description: 'Improper Restriction of Security Token Assignment' },
  { package: 'shell-quote', versions: ['1.7.2', '1.7.3'], cve: 'CVE-2021-42740', severity: 'critical', description: 'Command Injection' },
  { package: 'cross-fetch', versions: ['3.1.4', '3.1.5'], cve: 'CVE-2022-1365', severity: 'medium', description: 'Exposure of Sensitive Information' },
  { package: 'ansi-regex', versions: ['5.0.0', '4.1.0', '3.0.0'], cve: 'CVE-2021-3807', severity: 'high', description: 'Regular Expression Denial of Service' },
  { package: 'moment', versions: ['2.29.3', '2.29.2', '2.29.1'], cve: 'CVE-2022-31129', severity: 'high', description: 'Path Traversal / ReDoS' },
  { package: 'protobufjs', versions: ['7.2.3', '7.1.2', '6.11.3'], cve: 'CVE-2023-36665', severity: 'critical', description: 'Prototype Pollution' },
  { package: 'fast-xml-parser', versions: ['4.2.4', '4.2.2'], cve: 'CVE-2023-34104', severity: 'high', description: 'Prototype Pollution' },
  { package: 'postcss', versions: ['8.4.14', '8.4.12', '7.0.39'], cve: 'CVE-2023-44270', severity: 'medium', description: 'Line return parsing' },
  { package: 'ip', versions: ['2.0.0', '1.1.8', '1.1.5'], cve: 'CVE-2024-29415', severity: 'high', description: 'SSRF via isPublic() bypass' },
];

export interface DepScanResult {
  readonly totalDeps: number;
  readonly directDeps: number;
  readonly transitiveDeps: number;
  readonly licenseIssues: readonly { name: string; version: string; license: string }[];
  readonly vulnerabilities: readonly { name: string; version: string; cve: string; severity: string; description: string }[];
  readonly ecosystems: readonly string[];
}

export const runDepDeepScan = (ctx: ScanContext): DepScanResult => {
  const deps = parseLockfiles(ctx.files);

  const directDeps = deps.filter(d => d.isDirect).length;
  const transitiveDeps = deps.filter(d => !d.isDirect).length;

  const licenseIssues = deps
    .filter((d): d is LockfileDependency & { license: string } => d.license !== undefined && COPYLEFT_LICENSES.has(d.license))
    .map(d => ({ name: d.name, version: d.version, license: d.license }));

  const vulnerabilities: { name: string; version: string; cve: string; severity: string; description: string }[] = [];
  for (const dep of deps) {
    for (const vuln of KNOWN_VULNERABLE) {
      if (dep.name === vuln.package && vuln.versions.includes(dep.version)) {
        vulnerabilities.push({
          name: dep.name,
          version: dep.version,
          cve: vuln.cve,
          severity: vuln.severity,
          description: vuln.description,
        });
      }
    }
  }

  const ecosystems = [...new Set(deps.map(d => d.ecosystem))];

  return { totalDeps: deps.length, directDeps, transitiveDeps, licenseIssues, vulnerabilities, ecosystems };
};

const toSeverity = (s: string): Severity =>
  (s === 'critical' || s === 'high' || s === 'medium') ? s : 'high';

export const depScanToCheckResults = (result: DepScanResult): readonly CheckResult[] => {
  const checks: CheckResult[] = [];

  // Summary pass/fail
  if (result.totalDeps === 0) {
    checks.push({ type: 'pass', checkId: 'l3-dep-scan', message: 'No lock files found for dependency analysis' });
    return checks;
  }

  checks.push({
    type: 'pass',
    checkId: 'l3-dep-scan',
    message: `Analyzed ${result.totalDeps} dependencies (${result.directDeps} direct, ${result.transitiveDeps} transitive) across ${result.ecosystems.join(', ')}`,
  });

  // License issues
  for (const issue of result.licenseIssues) {
    checks.push({
      type: 'fail',
      checkId: 'l3-dep-license',
      message: `Copyleft license ${issue.license} in dependency ${issue.name}@${issue.version}`,
      severity: 'medium',
      obligationId: 'eu-ai-act-OBL-005',
      articleReference: 'Art. 11 / Annex IV',
      fix: `Review license compatibility of ${issue.name}@${issue.version} (${issue.license}). Consider replacing with a permissively-licensed alternative.`,
    });
  }

  // Vulnerabilities
  for (const vuln of result.vulnerabilities) {
    checks.push({
      type: 'fail',
      checkId: 'l3-dep-vuln',
      message: `Known vulnerability ${vuln.cve} in ${vuln.name}@${vuln.version}: ${vuln.description}`,
      severity: toSeverity(vuln.severity),
      obligationId: 'eu-ai-act-OBL-015',
      articleReference: 'Art. 15 (Accuracy, robustness, cybersecurity)',
      fix: `Update ${vuln.name} to a patched version. See ${vuln.cve} for details.`,
    });
  }

  return checks;
};
