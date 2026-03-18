import { describe, it, expect } from 'vitest';
import { MITRE_ATLAS_TACTICS, getMitreAtlasTactic, getMitreAtlasByMitreId } from './mitre-atlas.js';

describe('MITRE ATLAS data', () => {
  it('has 6 tactics', () => {
    expect(MITRE_ATLAS_TACTICS).toHaveLength(6);
  });

  it('has unique IDs', () => {
    const ids = MITRE_ATLAS_TACTICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('has unique mitreIds', () => {
    const ids = MITRE_ATLAS_TACTICS.map((t) => t.mitreId);
    expect(new Set(ids).size).toBe(6);
  });

  it('all tactics have valid severity', () => {
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    for (const t of MITRE_ATLAS_TACTICS) {
      expect(validSeverities).toContain(t.severity);
    }
  });

  it('all tactics have plugins', () => {
    for (const t of MITRE_ATLAS_TACTICS) {
      expect(t.plugins.length).toBeGreaterThan(0);
    }
  });

  it('getMitreAtlasTactic finds by ID', () => {
    const t = getMitreAtlasTactic('AML.TA0003');
    expect(t).toBeDefined();
    expect(t!.name).toBe('Initial Access');
  });

  it('getMitreAtlasByMitreId finds by mitreId', () => {
    const t = getMitreAtlasByMitreId('mitre:atlas:exfiltration');
    expect(t).toBeDefined();
    expect(t!.name).toBe('Exfiltration');
  });
});
