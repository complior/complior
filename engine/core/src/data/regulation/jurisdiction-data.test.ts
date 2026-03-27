import { describe, it, expect } from 'vitest';
import { listJurisdictions, getJurisdiction, JurisdictionSchema } from './jurisdiction-data.js';

describe('jurisdiction-data', () => {
  it('lists all 30 jurisdictions', () => {
    const jurisdictions = listJurisdictions();
    expect(jurisdictions.length).toBe(30);
  });

  it('all jurisdictions validate against schema', () => {
    for (const j of listJurisdictions()) {
      const result = JurisdictionSchema.safeParse(j);
      expect(result.success, `Failed for ${j.country_code}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it('getJurisdiction returns correct country', () => {
    const de = getJurisdiction('de');
    expect(de).toBeDefined();
    expect(de!.country_name).toBe('Germany');
    expect(de!.msa_name).toContain('Bundesnetzagentur');
  });

  it('getJurisdiction is case-insensitive', () => {
    expect(getJurisdiction('DE')).toBeDefined();
    expect(getJurisdiction('de')).toBeDefined();
    expect(getJurisdiction('De')).toBeDefined();
  });

  it('getJurisdiction returns undefined for invalid code', () => {
    expect(getJurisdiction('xx')).toBeUndefined();
    expect(getJurisdiction('us')).toBeUndefined();
  });

  it('all country codes are unique', () => {
    const codes = listJurisdictions().map(j => j.country_code);
    expect(new Set(codes).size).toBe(30);
  });

  it('all countries have non-empty local_requirements', () => {
    for (const j of listJurisdictions()) {
      expect(j.local_requirements.length, `${j.country_code} has no local_requirements`).toBeGreaterThan(0);
    }
  });

  it('all countries have valid enforcement_date format', () => {
    for (const j of listJurisdictions()) {
      expect(j.enforcement_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('EEA countries (IS, LI, NO) are included', () => {
    expect(getJurisdiction('is')).toBeDefined();
    expect(getJurisdiction('li')).toBeDefined();
    expect(getJurisdiction('no')).toBeDefined();
  });

  it('France has CNIL as MSA', () => {
    const fr = getJurisdiction('fr')!;
    expect(fr.msa_name).toContain('CNIL');
  });

  it('Spain has AESIA as MSA', () => {
    const es = getJurisdiction('es')!;
    expect(es.msa_name).toContain('AESIA');
  });

  it('each jurisdiction has an msa_url starting with https', () => {
    for (const j of listJurisdictions()) {
      expect(j.msa_url, `${j.country_code} msa_url`).toMatch(/^https:\/\//);
    }
  });
});
