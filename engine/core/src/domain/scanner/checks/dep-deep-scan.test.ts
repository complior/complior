import { describe, it, expect } from 'vitest';
import { runDepDeepScan, depScanToCheckResults, COPYLEFT_LICENSES, KNOWN_VULNERABLE } from './dep-deep-scan.js';
import type { ScanContext } from '../../../ports/scanner.port.js';

const makeCtx = (files: { relativePath: string; content: string }[]): ScanContext => ({
  projectPath: '/test',
  files: files.map(f => ({
    path: `/test/${f.relativePath}`,
    relativePath: f.relativePath,
    content: f.content,
    extension: f.relativePath.split('.').pop() ?? '',
  })),
});

describe('runDepDeepScan', () => {
  it('analyzes package-lock.json with vulnerable deps', () => {
    const ctx = makeCtx([{
      relativePath: 'package-lock.json',
      content: JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { name: 'app', version: '1.0.0' },
          'node_modules/lodash': { version: '4.17.20', license: 'MIT' },
          'node_modules/express': { version: '4.18.2', license: 'MIT' },
        },
      }),
    }]);
    const result = runDepDeepScan(ctx);
    expect(result.totalDeps).toBe(2);
    expect(result.directDeps).toBe(2);
    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].cve).toBe('CVE-2021-23337');
    expect(result.vulnerabilities[0].name).toBe('lodash');
  });

  it('detects copyleft license', () => {
    const ctx = makeCtx([{
      relativePath: 'package-lock.json',
      content: JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { name: 'app' },
          'node_modules/gpl-pkg': { version: '1.0.0', license: 'GPL-3.0' },
        },
      }),
    }]);
    const result = runDepDeepScan(ctx);
    expect(result.licenseIssues).toHaveLength(1);
    expect(result.licenseIssues[0].license).toBe('GPL-3.0');
    expect(result.licenseIssues[0].name).toBe('gpl-pkg');
  });

  it('detects AGPL license', () => {
    const ctx = makeCtx([{
      relativePath: 'package-lock.json',
      content: JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { name: 'app' },
          'node_modules/agpl-lib': { version: '2.0.0', license: 'AGPL-3.0-only' },
        },
      }),
    }]);
    const result = runDepDeepScan(ctx);
    expect(result.licenseIssues).toHaveLength(1);
    expect(result.licenseIssues[0].license).toBe('AGPL-3.0-only');
  });

  it('returns empty results for no lock files', () => {
    const ctx = makeCtx([{
      relativePath: 'src/index.ts',
      content: 'console.log("hello")',
    }]);
    const result = runDepDeepScan(ctx);
    expect(result.totalDeps).toBe(0);
    expect(result.directDeps).toBe(0);
    expect(result.transitiveDeps).toBe(0);
    expect(result.licenseIssues).toHaveLength(0);
    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.ecosystems).toHaveLength(0);
  });

  it('identifies multiple vulnerabilities in same project', () => {
    const ctx = makeCtx([{
      relativePath: 'package-lock.json',
      content: JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { name: 'app' },
          'node_modules/minimist': { version: '1.2.5' },
          'node_modules/shell-quote': { version: '1.7.3' },
          'node_modules/jsonwebtoken': { version: '8.5.1' },
        },
      }),
    }]);
    const result = runDepDeepScan(ctx);
    expect(result.vulnerabilities).toHaveLength(3);
    const cves = result.vulnerabilities.map(v => v.cve);
    expect(cves).toContain('CVE-2021-44906');
    expect(cves).toContain('CVE-2021-42740');
    expect(cves).toContain('CVE-2022-23529');
  });

  it('tracks ecosystem information', () => {
    const ctx = makeCtx([
      {
        relativePath: 'package-lock.json',
        content: JSON.stringify({
          lockfileVersion: 3,
          packages: {
            '': { name: 'app' },
            'node_modules/express': { version: '4.18.2' },
          },
        }),
      },
      {
        relativePath: 'Cargo.lock',
        content: `[[package]]\nname = "serde"\nversion = "1.0.193"\n`,
      },
    ]);
    const result = runDepDeepScan(ctx);
    expect(result.ecosystems).toContain('npm');
    expect(result.ecosystems).toContain('cargo');
  });

  it('counts direct vs transitive deps from v1 lockfile', () => {
    const ctx = makeCtx([{
      relativePath: 'package-lock.json',
      content: JSON.stringify({
        lockfileVersion: 1,
        dependencies: {
          express: {
            version: '4.18.2',
            dependencies: {
              'body-parser': { version: '1.20.1' },
              'cookie': { version: '0.5.0' },
            },
          },
        },
      }),
    }]);
    const result = runDepDeepScan(ctx);
    expect(result.totalDeps).toBe(3);
    expect(result.directDeps).toBe(1);
    expect(result.transitiveDeps).toBe(2);
  });

  it('handles safe dependencies without vulns or copyleft', () => {
    const ctx = makeCtx([{
      relativePath: 'package-lock.json',
      content: JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { name: 'app' },
          'node_modules/zod': { version: '3.22.4', license: 'MIT' },
          'node_modules/hono': { version: '3.12.0', license: 'MIT' },
        },
      }),
    }]);
    const result = runDepDeepScan(ctx);
    expect(result.totalDeps).toBe(2);
    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.licenseIssues).toHaveLength(0);
  });
});

describe('depScanToCheckResults', () => {
  it('returns pass for no lock files', () => {
    const result = depScanToCheckResults({
      totalDeps: 0,
      directDeps: 0,
      transitiveDeps: 0,
      licenseIssues: [],
      vulnerabilities: [],
      ecosystems: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('pass');
    expect(result[0].checkId).toBe('l3-dep-scan');
  });

  it('returns summary pass + fail checks for issues', () => {
    const result = depScanToCheckResults({
      totalDeps: 10,
      directDeps: 3,
      transitiveDeps: 7,
      licenseIssues: [{ name: 'gpl-pkg', version: '1.0.0', license: 'GPL-3.0' }],
      vulnerabilities: [{ name: 'lodash', version: '4.17.20', cve: 'CVE-2021-23337', severity: 'high', description: 'Prototype Pollution' }],
      ecosystems: ['npm'],
    });
    expect(result.length).toBe(3); // 1 pass summary + 1 license + 1 vuln
    expect(result[0].type).toBe('pass');
    expect(result[0].checkId).toBe('l3-dep-scan');
    expect(result[1].type).toBe('fail');
    expect(result[1].checkId).toBe('l3-dep-license');
    expect(result[2].type).toBe('fail');
    expect(result[2].checkId).toBe('l3-dep-vuln');
  });

  it('maps vulnerability severity to check severity', () => {
    const result = depScanToCheckResults({
      totalDeps: 3,
      directDeps: 3,
      transitiveDeps: 0,
      licenseIssues: [],
      vulnerabilities: [
        { name: 'minimist', version: '1.2.5', cve: 'CVE-2021-44906', severity: 'critical', description: 'Prototype Pollution' },
        { name: 'semver', version: '7.3.7', cve: 'CVE-2022-25883', severity: 'medium', description: 'ReDoS' },
      ],
      ecosystems: ['npm'],
    });
    const criticalCheck = result.find(r => r.type === 'fail' && r.message.includes('minimist'));
    const mediumCheck = result.find(r => r.type === 'fail' && r.message.includes('semver'));
    expect(criticalCheck).toBeDefined();
    if (criticalCheck?.type === 'fail') expect(criticalCheck.severity).toBe('critical');
    expect(mediumCheck).toBeDefined();
    if (mediumCheck?.type === 'fail') expect(mediumCheck.severity).toBe('medium');
  });

  it('includes article reference and obligation for license issues', () => {
    const result = depScanToCheckResults({
      totalDeps: 1,
      directDeps: 1,
      transitiveDeps: 0,
      licenseIssues: [{ name: 'gpl-lib', version: '2.0.0', license: 'AGPL-3.0' }],
      vulnerabilities: [],
      ecosystems: ['npm'],
    });
    const licenseCheck = result.find(r => r.type === 'fail');
    expect(licenseCheck).toBeDefined();
    if (licenseCheck?.type === 'fail') {
      expect(licenseCheck.obligationId).toBe('eu-ai-act-OBL-005');
      expect(licenseCheck.articleReference).toBe('Art. 11 / Annex IV');
      expect(licenseCheck.fix).toContain('AGPL-3.0');
    }
  });

  it('includes article reference and obligation for vulnerabilities', () => {
    const result = depScanToCheckResults({
      totalDeps: 1,
      directDeps: 1,
      transitiveDeps: 0,
      licenseIssues: [],
      vulnerabilities: [{ name: 'lodash', version: '4.17.20', cve: 'CVE-2021-23337', severity: 'high', description: 'Pollution' }],
      ecosystems: ['npm'],
    });
    const vulnCheck = result.find(r => r.type === 'fail');
    expect(vulnCheck).toBeDefined();
    if (vulnCheck?.type === 'fail') {
      expect(vulnCheck.obligationId).toBe('eu-ai-act-OBL-015');
      expect(vulnCheck.articleReference).toBe('Art. 15 (Accuracy, robustness, cybersecurity)');
      expect(vulnCheck.fix).toContain('CVE-2021-23337');
    }
  });

  it('summary message includes ecosystem names', () => {
    const result = depScanToCheckResults({
      totalDeps: 5,
      directDeps: 2,
      transitiveDeps: 3,
      licenseIssues: [],
      vulnerabilities: [],
      ecosystems: ['npm', 'cargo'],
    });
    expect(result[0].type).toBe('pass');
    expect(result[0].message).toContain('npm, cargo');
    expect(result[0].message).toContain('5 dependencies');
  });

  it('returns only pass summary when no issues found', () => {
    const result = depScanToCheckResults({
      totalDeps: 15,
      directDeps: 5,
      transitiveDeps: 10,
      licenseIssues: [],
      vulnerabilities: [],
      ecosystems: ['npm'],
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('pass');
  });
});

describe('COPYLEFT_LICENSES', () => {
  it('contains GPL variants', () => {
    expect(COPYLEFT_LICENSES.has('GPL-3.0')).toBe(true);
    expect(COPYLEFT_LICENSES.has('GPL-2.0-or-later')).toBe(true);
  });

  it('contains AGPL', () => {
    expect(COPYLEFT_LICENSES.has('AGPL-3.0')).toBe(true);
    expect(COPYLEFT_LICENSES.has('AGPL-3.0-only')).toBe(true);
  });

  it('does not flag MIT', () => {
    expect(COPYLEFT_LICENSES.has('MIT')).toBe(false);
  });

  it('does not flag Apache-2.0', () => {
    expect(COPYLEFT_LICENSES.has('Apache-2.0')).toBe(false);
  });
});

describe('KNOWN_VULNERABLE', () => {
  it('has at least 20 entries', () => {
    expect(KNOWN_VULNERABLE.length).toBeGreaterThanOrEqual(20);
  });

  it('all entries have required fields', () => {
    for (const vuln of KNOWN_VULNERABLE) {
      expect(vuln.package).toBeTruthy();
      expect(vuln.versions.length).toBeGreaterThan(0);
      expect(vuln.cve).toMatch(/^CVE-\d{4}-\d+$/);
      expect(['critical', 'high', 'medium']).toContain(vuln.severity);
      expect(vuln.description).toBeTruthy();
    }
  });
});
