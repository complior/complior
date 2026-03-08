import { describe, it, expect } from 'vitest';
import { checkAiDisclosure } from './ai-disclosure.js';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';

describe('checkAiDisclosure', () => {
  it('passes when AI disclosure text found in UI code', () => {
    const ctx = createScanCtx([
      createScanFile('src/components/Chat.tsx', '<p>This is an AI-powered assistant</p>'),
    ]);

    const results = checkAiDisclosure(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
    expect(results[0].checkId).toBe('ai-disclosure');
  });

  it('passes when "artificial intelligence" disclosure found', () => {
    const ctx = createScanCtx([
      createScanFile('src/Bot.tsx', 'Powered by artificial intelligence technology'),
    ]);

    const results = checkAiDisclosure(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });

  it('fails when chat code exists without disclosure', () => {
    const ctx = createScanCtx([
      createScanFile('src/components/ChatWidget.tsx', 'function ChatWidget() { return <div>chatbot interface</div> }'),
    ]);

    const results = checkAiDisclosure(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    if (results[0].type === 'fail') {
      expect(results[0].severity).toBe('high');
      expect(results[0].obligationId).toBe('eu-ai-act-OBL-015');
      expect(results[0].articleReference).toBe('Art. 50(1)');
      expect(results[0].fix).toBeDefined();
    }
  });

  it('fails when /api/chat endpoint exists without disclosure', () => {
    const ctx = createScanCtx([
      createScanFile('src/routes/chat.ts', 'app.post("/api/chat", handler)'),
    ]);

    const results = checkAiDisclosure(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
  });

  it('skips when no chat or AI interaction code found', () => {
    const ctx = createScanCtx([
      createScanFile('src/App.tsx', 'function App() { return <div>Hello World</div> }'),
    ]);

    const results = checkAiDisclosure(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('skip');
  });

  it('passes when disclosure exists alongside chat code', () => {
    const ctx = createScanCtx([
      createScanFile('src/Chat.tsx', 'function Chat() { return <div>chatbot</div> }'),
      createScanFile('src/Disclosure.tsx', '<p>This is an AI-powered system</p>'),
    ]);

    const results = checkAiDisclosure(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });

  it('ignores non-UI file extensions', () => {
    const ctx = createScanCtx([
      createScanFile('data/chat.json', '{"chatbot": true}'),
    ]);

    const results = checkAiDisclosure(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('skip');
  });
});
