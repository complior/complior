/**
 * Shared utilities for passport service sub-modules.
 * Extracted from passport-service.ts for SRP compliance.
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AgentPassport } from '../types/passport.types.js';
import { parsePassport } from '../types/passport-schemas.js';
import { createEvidence, type EvidenceSource } from '../domain/scanner/evidence.js';
import { loadOrCreateKeyPair, signPassport } from '../domain/passport/crypto-signer.js';
import type { PassportServiceDeps } from './passport-service.js';

export const ensureTemplate = async (deps: PassportServiceDeps, file: string): Promise<string> => {
  if (!deps.loadTemplate) {
    throw new Error('loadTemplate dependency not provided');
  }
  return deps.loadTemplate(file);
};

export const saveDocumentReport = async (
  deps: PassportServiceDeps,
  name: string,
  filePrefix: string,
  markdown: string,
  evidenceType: EvidenceSource,
  projectPath?: string,
  subDir: string = 'reports',
  _evidenceMeta?: Record<string, unknown>,
): Promise<string> => {
  const path = projectPath ?? deps.getProjectPath();
  const outDir = join(path, '.complior', subDir);
  await mkdir(outDir, { recursive: true });
  const savedPath = join(outDir, `${filePrefix}-${name}.md`);
  await writeFile(savedPath, markdown);

  if (deps.evidenceStore) {
    const evidence = createEvidence(name, evidenceType, evidenceType, { file: savedPath });
    await deps.evidenceStore.append([evidence], randomUUID());
  }

  return savedPath;
};

export const updatePassportCompliance = async (
  deps: PassportServiceDeps,
  name: string,
  complianceUpdate: Partial<AgentPassport['compliance']>,
  projectPath?: string,
): Promise<void> => {
  const path = projectPath ?? deps.getProjectPath();
  const manifestPath = join(path, '.complior', 'agents', `${name}-manifest.json`);
  try {
    const rawManifest = await readFile(manifestPath, 'utf-8');
    const currentManifest = parsePassport(rawManifest);
    if (!currentManifest) return;

    const updatedManifest: AgentPassport = {
      ...currentManifest,
      compliance: { ...currentManifest.compliance, ...complianceUpdate },
      updated: new Date().toISOString(),
    };

    const keyPair = await loadOrCreateKeyPair();
    const newSignature = signPassport(updatedManifest, keyPair.privateKey);
    const resignedManifest: AgentPassport = { ...updatedManifest, signature: newSignature };

    await writeFile(manifestPath, JSON.stringify(resignedManifest, null, 2));
  } catch {
    // Passport file doesn't exist or can't be updated — non-fatal
  }
};
