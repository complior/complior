/**
 * Version Consistency — validates version matches across all crates/packages.
 *
 * V1-M03 RED spec: proves Engine (TS) + CLI (Rust) + Root package.json
 * all have the same version string.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_VERSION } from './version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Project paths
const ENGINE_CORE_PKG = resolve(__dirname, '..', 'package.json');
const ROOT_PKG = resolve(__dirname, '..', '..', '..', 'package.json');
const CARGO_WORKSPACE = resolve(__dirname, '..', '..', '..', 'Cargo.toml');
const CLI_CARGO = resolve(__dirname, '..', '..', '..', 'cli', 'Cargo.toml');

function readJsonVersion(path: string): string {
  const content = JSON.parse(readFileSync(path, 'utf-8')) as { version: string };
  return content.version;
}

function readCargoVersion(path: string): string {
  const content = readFileSync(path, 'utf-8');
  // Match: version = "0.9.4" (not version.workspace = true)
  const match = content.match(/^version\s*=\s*"([^"]+)"/m);
  if (match) return match[1]!;

  // Check workspace reference
  const wsMatch = content.match(/^version\.workspace\s*=\s*true/m);
  if (wsMatch) {
    // Read from workspace Cargo.toml
    const wsContent = readFileSync(CARGO_WORKSPACE, 'utf-8');
    const wsVersionMatch = wsContent.match(/^version\s*=\s*"([^"]+)"/m);
    if (wsVersionMatch) return wsVersionMatch[1]!;
  }

  throw new Error(`Could not find version in ${path}`);
}

describe('Version Consistency', () => {
  // ─────────────────────────────────────────────────────────
  // Test 1: ENGINE_VERSION matches engine/core/package.json
  // ─────────────────────────────────────────────────────────
  it('ENGINE_VERSION constant matches package.json', () => {
    const pkgVersion = readJsonVersion(ENGINE_CORE_PKG);
    expect(ENGINE_VERSION).toBe(pkgVersion);
  });

  // ─────────────────────────────────────────────────────────
  // Test 2: Engine version matches root package.json
  // ─────────────────────────────────────────────────────────
  it('engine/core version matches root package.json', () => {
    const engineVersion = readJsonVersion(ENGINE_CORE_PKG);
    const rootVersion = readJsonVersion(ROOT_PKG);
    expect(engineVersion).toBe(rootVersion);
  });

  // ─────────────────────────────────────────────────────────
  // Test 3: Cargo.toml workspace version matches engine version
  // ─────────────────────────────────────────────────────────
  it('Cargo workspace version matches engine version', () => {
    const engineVersion = readJsonVersion(ENGINE_CORE_PKG);
    const cargoVersion = readCargoVersion(CARGO_WORKSPACE);
    expect(cargoVersion).toBe(engineVersion);
  });

  // ─────────────────────────────────────────────────────────
  // Test 4: CLI Cargo.toml resolves to same version
  // ─────────────────────────────────────────────────────────
  it('CLI Cargo.toml version matches engine version', () => {
    const engineVersion = readJsonVersion(ENGINE_CORE_PKG);
    const cliVersion = readCargoVersion(CLI_CARGO);
    expect(cliVersion).toBe(engineVersion);
  });

  // ─────────────────────────────────────────────────────────
  // Test 5: Version is valid semver
  // ─────────────────────────────────────────────────────────
  it('version is valid semver format', () => {
    const version = readJsonVersion(ENGINE_CORE_PKG);
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
    expect(version).toMatch(semverRegex);
  });
});
