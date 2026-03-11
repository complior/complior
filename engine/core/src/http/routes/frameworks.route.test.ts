import { describe, it, expect } from 'vitest';
import { createFrameworksRoute } from './frameworks.route.js';
import type { FrameworkService } from '../../services/framework-service.js';
import type { MultiFrameworkScoreResult, FrameworkScoreResult } from '../../types/framework.types.js';

const mockScore: FrameworkScoreResult = {
  frameworkId: 'test-fw',
  frameworkName: 'Test Framework',
  score: 75,
  grade: 'B',
  gradeType: 'letter',
  gaps: 3,
  totalChecks: 12,
  passedChecks: 9,
  categories: [],
};

const mockMulti: MultiFrameworkScoreResult = {
  frameworks: [mockScore],
  selectedFrameworkIds: ['test-fw'],
  computedAt: new Date().toISOString(),
};

const mockService: FrameworkService = {
  getScores: async () => mockMulti,
  getScore: async (id: string) => (id === 'test-fw' ? mockScore : null),
  listAvailable: () => ['test-fw', 'other-fw'],
  listSelected: () => ['test-fw'],
};

describe('frameworks.route', () => {
  const app = createFrameworksRoute({ frameworkService: mockService });

  it('GET /frameworks returns available and selected', async () => {
    const res = await app.request('/frameworks');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toEqual(['test-fw', 'other-fw']);
    expect(body.selected).toEqual(['test-fw']);
  });

  it('GET /frameworks/scores returns multi-framework result', async () => {
    const res = await app.request('/frameworks/scores');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.frameworks).toHaveLength(1);
    expect(body.frameworks[0].frameworkId).toBe('test-fw');
    expect(body.frameworks[0].score).toBe(75);
    expect(body.selectedFrameworkIds).toEqual(['test-fw']);
  });

  it('GET /frameworks/scores/:id returns single framework', async () => {
    const res = await app.request('/frameworks/scores/test-fw');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.frameworkId).toBe('test-fw');
    expect(body.grade).toBe('B');
  });

  it('GET /frameworks/scores/:id returns 404 for unknown', async () => {
    const res = await app.request('/frameworks/scores/nonexistent');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NOT_FOUND');
  });
});
