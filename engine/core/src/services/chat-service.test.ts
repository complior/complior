import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { CoreMessage } from 'ai';
import { createChatService, type ChatServiceDeps } from './chat-service.js';

const createTestDeps = (overrides: Partial<ChatServiceDeps> = {}): ChatServiceDeps => {
  const history: CoreMessage[] = [];
  return {
    getConversationHistory: () => history,
    appendConversationHistory: (msg) => { history.push(msg); },
    getProjectPath: () => '/test/project',
    getVersion: () => '1.0.0-test',
    getLastScanResult: () => null,
    getRegulationData: () => ({
      obligations: { obligations: [] },
      scoring: undefined,
    }),
    getPassportSummary: async () => null,
    getChatHistoryPath: () => '/tmp/test-chat-history.json',
    ...overrides,
  };
};

describe('ChatService', () => {
  describe('buildSystemPrompt', () => {
    it('includes deadline', async () => {
      const svc = createChatService(createTestDeps());
      const prompt = await svc.buildSystemPrompt();
      expect(prompt).toContain('EU AI Act full enforcement deadline: 2 August 2026');
      expect(prompt).toMatch(/\d+d left/);
    });

    it('includes passport data when available', async () => {
      const svc = createChatService(createTestDeps({
        getPassportSummary: async () => ({
          name: 'test-agent',
          type: 'chatbot',
          riskClass: 'high',
          autonomyLevel: 'L3',
          completeness: 75,
        }),
      }));
      const prompt = await svc.buildSystemPrompt();
      expect(prompt).toContain('Agent Passport');
      expect(prompt).toContain('Name: test-agent');
      expect(prompt).toContain('Risk class: high');
      expect(prompt).toContain('Autonomy level: L3');
      expect(prompt).toContain('Completeness: 75%');
    });

    it('includes top findings from last scan', async () => {
      const svc = createChatService(createTestDeps({
        getLastScanResult: () => ({
          score: { totalScore: 42, zone: 'red', breakdown: {} as never },
          filesScanned: 10,
          findings: [
            { checkId: 'l1-risk', message: 'Missing risk assessment', severity: 'critical', type: 'fail', layer: 'L1', category: 'risk' },
            { checkId: 'l2-fria', message: 'Incomplete FRIA', severity: 'high', type: 'fail', layer: 'L2', category: 'docs' },
            { checkId: 'l3-sdk', message: 'No SDK wrapper', severity: 'medium', type: 'fail', layer: 'L3', category: 'code' },
          ],
          timestamp: new Date().toISOString(),
        } as never),
      }));
      const prompt = await svc.buildSystemPrompt();
      expect(prompt).toContain('[CRITICAL] l1-risk: Missing risk assessment');
      expect(prompt).toContain('[HIGH] l2-fria: Incomplete FRIA');
      // medium severity should not be in top findings
      expect(prompt).not.toContain('l3-sdk');
    });

    it('skips passport section when unavailable', async () => {
      const svc = createChatService(createTestDeps());
      const prompt = await svc.buildSystemPrompt();
      expect(prompt).not.toContain('Agent Passport');
    });
  });

  describe('loadHistory / saveHistory', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await mkdtemp(join(tmpdir(), 'chat-test-'));
    });

    afterEach(async () => {
      await rm(tmpDir, { recursive: true, force: true });
    });

    it('round-trips chat history through disk', async () => {
      const historyPath = join(tmpDir, 'chat-history.json');
      const history: CoreMessage[] = [];

      const svc = createChatService(createTestDeps({
        getConversationHistory: () => history,
        appendConversationHistory: (msg) => { history.push(msg); },
        getChatHistoryPath: () => historyPath,
      }));

      // Add messages
      svc.appendConversationHistory({ role: 'user', content: 'Hello' });
      svc.appendConversationHistory({ role: 'assistant', content: 'Hi there!' });
      await svc.saveHistory();

      // Verify file exists
      const raw = await readFile(historyPath, 'utf-8');
      const saved = JSON.parse(raw) as CoreMessage[];
      expect(saved).toHaveLength(2);
      expect(saved[0]!.role).toBe('user');
      expect(saved[1]!.role).toBe('assistant');

      // Load into a fresh service
      const history2: CoreMessage[] = [];
      const svc2 = createChatService(createTestDeps({
        getConversationHistory: () => history2,
        appendConversationHistory: (msg) => { history2.push(msg); },
        getChatHistoryPath: () => historyPath,
      }));
      await svc2.loadHistory();
      expect(history2).toHaveLength(2);
      expect(history2[0]!.content).toBe('Hello');
    });

    it('truncates history to 100 messages', async () => {
      const historyPath = join(tmpDir, 'chat-history.json');

      // Write 120 messages directly
      const messages: CoreMessage[] = Array.from({ length: 120 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}`,
      }));
      const { writeFile } = await import('node:fs/promises');
      await writeFile(historyPath, JSON.stringify(messages), 'utf-8');

      const history: CoreMessage[] = [];
      const svc = createChatService(createTestDeps({
        getConversationHistory: () => history,
        appendConversationHistory: (msg) => { history.push(msg); },
        getChatHistoryPath: () => historyPath,
      }));
      await svc.loadHistory();

      // Should only load last 100
      expect(history).toHaveLength(100);
      expect(history[0]!.content).toBe('Message 20');
    });

    it('handles missing history file gracefully', async () => {
      const historyPath = join(tmpDir, 'nonexistent.json');
      const history: CoreMessage[] = [];

      const svc = createChatService(createTestDeps({
        getConversationHistory: () => history,
        appendConversationHistory: (msg) => { history.push(msg); },
        getChatHistoryPath: () => historyPath,
      }));
      await svc.loadHistory();
      expect(history).toHaveLength(0);
    });
  });
});
