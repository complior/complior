import { describe, it, expect } from 'vitest';
import { checkIndustryPatterns } from './index.js';
import { createScanFile, createScanCtx } from '../../../../test-helpers/factories.js';

describe('checkIndustryPatterns', () => {
  // --- HR ---
  describe('HR / Employment', () => {
    it('detects resume_parser import', () => {
      const ctx = createScanCtx([
        createScanFile('src/hiring.ts', 'import { resume_parser } from "./utils";'),
      ]);
      const results = checkIndustryPatterns(ctx);
      const fail = results.find((r) => r.type === 'fail');
      expect(fail).toBeDefined();
      expect(fail!.checkId).toBe('industry-hr');
      expect(fail!.type === 'fail' && fail!.severity).toBe('high');
    });

    it('detects cv_screening function', () => {
      const ctx = createScanCtx([
        createScanFile('src/recruit.ts', 'function cv_screen(data) { return data; }'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-hr')).toBe(true);
    });

    it('detects hiring_decision variable', () => {
      const ctx = createScanCtx([
        createScanFile('src/app.py', 'hiring_decision = model.predict(candidate)'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-hr')).toBe(true);
    });

    it('detects employee_monitoring API', () => {
      const ctx = createScanCtx([
        createScanFile('src/monitor.js', 'const employee_monitoring = new MonitorSDK();'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-hr')).toBe(true);
    });

    it('passes when no HR patterns found', () => {
      const ctx = createScanCtx([
        createScanFile('src/utils.ts', 'export const add = (a: number, b: number) => a + b;'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.every((r) => r.checkId !== 'industry-hr')).toBe(true);
    });
  });

  // --- Finance ---
  describe('Finance / Credit', () => {
    it('detects credit_score import', () => {
      const ctx = createScanCtx([
        createScanFile('src/scoring.ts', 'import { credit_score } from "./model";'),
      ]);
      const results = checkIndustryPatterns(ctx);
      const fail = results.find((r) => r.checkId === 'industry-finance');
      expect(fail).toBeDefined();
      expect(fail!.type === 'fail' && fail!.severity).toBe('high');
    });

    it('detects aml_check function', () => {
      const ctx = createScanCtx([
        createScanFile('src/compliance.ts', 'function aml_check(tx) { return true; }'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-finance')).toBe(true);
    });

    it('detects loan_approval variable', () => {
      const ctx = createScanCtx([
        createScanFile('src/bank.py', 'loan_approval = evaluate(application)'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-finance')).toBe(true);
    });

    it('detects insurance_underwriting', () => {
      const ctx = createScanCtx([
        createScanFile('src/insure.js', 'const insurance_underwriting = new RiskEngine();'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-finance')).toBe(true);
    });

    it('passes when no finance patterns found', () => {
      const ctx = createScanCtx([
        createScanFile('src/app.ts', 'console.log("hello world");'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.every((r) => r.checkId !== 'industry-finance')).toBe(true);
    });
  });

  // --- Healthcare ---
  describe('Healthcare / Medical', () => {
    it('detects medical_device import', () => {
      const ctx = createScanCtx([
        createScanFile('src/device.ts', 'import { medical_device } from "./fda";'),
      ]);
      const results = checkIndustryPatterns(ctx);
      const fail = results.find((r) => r.checkId === 'industry-healthcare');
      expect(fail).toBeDefined();
      expect(fail!.type === 'fail' && fail!.severity).toBe('high');
    });

    it('detects patient_data access', () => {
      const ctx = createScanCtx([
        createScanFile('src/ehr.ts', 'const patient_data = await db.query("SELECT * FROM patients");'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-healthcare')).toBe(true);
    });

    it('detects clinical_decision function', () => {
      const ctx = createScanCtx([
        createScanFile('src/cds.py', 'def clinical_decision(symptoms): pass'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-healthcare')).toBe(true);
    });

    it('detects diagnosis_ai', () => {
      const ctx = createScanCtx([
        createScanFile('src/ai.js', 'const diagnosis_ai = new DiagnosisEngine();'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-healthcare')).toBe(true);
    });

    it('passes when no healthcare patterns found', () => {
      const ctx = createScanCtx([
        createScanFile('src/index.ts', 'export default {};'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.every((r) => r.checkId !== 'industry-healthcare')).toBe(true);
    });
  });

  // --- Education ---
  describe('Education / Academic', () => {
    it('detects admission_ai function', () => {
      const ctx = createScanCtx([
        createScanFile('src/admissions.ts', 'function admission_ai(applicant) { return score; }'),
      ]);
      const results = checkIndustryPatterns(ctx);
      const fail = results.find((r) => r.checkId === 'industry-education');
      expect(fail).toBeDefined();
      expect(fail!.type === 'fail' && fail!.severity).toBe('high');
    });

    it('detects grading_system', () => {
      const ctx = createScanCtx([
        createScanFile('src/grades.ts', 'const grading_system = new AutoGrader();'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-education')).toBe(true);
    });

    it('detects student_monitoring', () => {
      const ctx = createScanCtx([
        createScanFile('src/lms.py', 'student_monitoring = track(session)'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-education')).toBe(true);
    });

    it('detects exam_proctoring', () => {
      const ctx = createScanCtx([
        createScanFile('src/exams.js', 'const exam_proctoring = new ProctorAI();'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-education')).toBe(true);
    });

    it('passes when no education patterns found', () => {
      const ctx = createScanCtx([
        createScanFile('src/math.ts', 'export const sum = (a: number, b: number) => a + b;'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.every((r) => r.checkId !== 'industry-education')).toBe(true);
    });
  });

  // --- Aggregation ---
  describe('Aggregation', () => {
    it('detects multiple industries in separate files', () => {
      const ctx = createScanCtx([
        createScanFile('src/hr.ts', 'const resume_parser = new Parser();'),
        createScanFile('src/finance.ts', 'const credit_score = getScore();'),
      ]);
      const results = checkIndustryPatterns(ctx);
      const hrFail = results.find((r) => r.checkId === 'industry-hr');
      const financeFail = results.find((r) => r.checkId === 'industry-finance');
      expect(hrFail).toBeDefined();
      expect(financeFail).toBeDefined();
    });

    it('returns pass for empty project', () => {
      const ctx = createScanCtx([]);
      const results = checkIndustryPatterns(ctx);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pass');
      expect(results[0].checkId).toBe('industry-detection');
    });
  });

  // --- Edge cases ---
  describe('Edge cases', () => {
    it('is case-insensitive', () => {
      const ctx = createScanCtx([
        createScanFile('src/app.ts', 'const CREDIT_SCORE = getScore();'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results.some((r) => r.checkId === 'industry-finance')).toBe(true);
    });

    it('excludes node_modules', () => {
      const ctx = createScanCtx([
        createScanFile('node_modules/lib/index.ts', 'const credit_score = 1;'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pass');
    });

    it('excludes dist directory', () => {
      const ctx = createScanCtx([
        createScanFile('dist/bundle.js', 'const resume_parser = {};'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pass');
    });

    it('excludes test files', () => {
      const ctx = createScanCtx([
        createScanFile('src/hiring.test.ts', 'const resume_parser = mock();'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pass');
    });

    it('excludes __tests__ directory', () => {
      const ctx = createScanCtx([
        createScanFile('src/__tests__/hiring.ts', 'const resume_parser = mock();'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pass');
    });

    it('reports correct line number', () => {
      const ctx = createScanCtx([
        createScanFile('src/app.ts', 'line1\nline2\nconst credit_score = 42;\nline4'),
      ]);
      const results = checkIndustryPatterns(ctx);
      const fail = results.find((r) => r.type === 'fail');
      expect(fail).toBeDefined();
      expect(fail!.type === 'fail' && fail!.line).toBe(3);
    });

    it('includes fix recommendation with annex reference', () => {
      const ctx = createScanCtx([
        createScanFile('src/app.ts', 'const medical_device = init();'),
      ]);
      const results = checkIndustryPatterns(ctx);
      const fail = results.find((r) => r.type === 'fail');
      expect(fail).toBeDefined();
      expect(fail!.type === 'fail' && fail!.fix).toContain('Annex III');
      expect(fail!.type === 'fail' && fail!.fix).toContain('FRIA');
    });

    it('ignores non-source files', () => {
      const ctx = createScanCtx([
        createScanFile('README.md', 'This project uses credit_score models.'),
        createScanFile('config.json', '{"credit_score": true}'),
      ]);
      const results = checkIndustryPatterns(ctx);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pass');
    });
  });
});
