import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { streamText, stepCountIs, type CoreMessage } from 'ai';
import { ValidationError } from '../../types/errors.js';
import type { ChatService } from '../../services/chat-service.js';
import type { LlmPort } from '../../ports/llm.port.js';
import {
  sseThinking, sseText, sseToolCall, sseToolResult,
  sseUsage, sseDone, sseError,
} from '../../llm/sse-protocol.js';
import { createCodingTools } from '../../llm/tool-definitions.js';
import type { AgentMode } from '../../llm/tools/types.js';
import { getAgentConfig, getAllModes } from '../../llm/agents/modes.js';
import { createCostTracker, type CostTracker } from '../../llm/routing/cost-tracker.js';

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  model: z.string().optional(),
  provider: z.enum(['anthropic', 'openai', 'openrouter']).optional(),
  apiKey: z.string().optional(),
  mode: z.enum(['build', 'comply', 'audit', 'learn']).optional(),
});

export interface ChatRouteDeps {
  readonly chatService: ChatService;
  readonly llm: LlmPort;
}

/** Parse /command from message. Returns { command, arg } or null. */
const parseCommand = (msg: string): { command: string; arg: string } | null => {
  const match = msg.trim().match(/^\/(\w+)\s*(.*)/);
  return match ? { command: match[1], arg: match[2].trim() } : null;
};

export const createChatRoute = (deps: ChatRouteDeps) => {
  const { chatService, llm } = deps;
  const app = new Hono();

  // Session state
  let currentMode: AgentMode = 'build';
  let modelOverride: string | undefined;
  const costTracker: CostTracker = createCostTracker();

  // GET /mode — current mode info
  app.get('/mode', (c) => c.json({ mode: currentMode, config: getAgentConfig(currentMode) }));

  // POST /mode — switch mode
  app.post('/mode', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const mode = (body as { mode?: string }).mode;
    if (!mode || !getAllModes().includes(mode as AgentMode)) {
      return c.json({ error: 'INVALID_MODE', valid: getAllModes() }, 400);
    }
    currentMode = mode as AgentMode;
    return c.json({ mode: currentMode, config: getAgentConfig(currentMode) });
  });

  // GET /cost — session cost breakdown
  app.get('/cost', (c) => c.json(costTracker.getBreakdown()));

  app.post('/chat', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    // Handle slash commands
    const cmd = parseCommand(parsed.data.message);
    if (cmd) {
      if (cmd.command === 'mode' && cmd.arg) {
        if (getAllModes().includes(cmd.arg as AgentMode)) {
          currentMode = cmd.arg as AgentMode;
          const config = getAgentConfig(currentMode);
          return c.json({ type: 'command', command: 'mode', mode: currentMode, label: config.label, writeEnabled: config.writeEnabled });
        }
        return c.json({ type: 'command', command: 'mode', error: `Invalid mode. Valid: ${getAllModes().join(', ')}` });
      }
      if (cmd.command === 'cost') {
        return c.json({ type: 'command', command: 'cost', ...costTracker.getBreakdown() });
      }
      if (cmd.command === 'model' && cmd.arg) {
        modelOverride = cmd.arg === 'auto' ? undefined : cmd.arg;
        return c.json({ type: 'command', command: 'model', model: modelOverride ?? 'auto-routing', message: modelOverride ? `Model locked to ${modelOverride}` : 'Auto-routing enabled' });
      }
    }

    // Apply mode from request or session
    if (parsed.data.mode) currentMode = parsed.data.mode;

    const { provider, modelId } = parsed.data.provider && parsed.data.model
      ? { provider: parsed.data.provider, modelId: parsed.data.model }
      : llm.routeModel(modelOverride ?? 'chat');
    const model = await llm.getModel(provider, modelId, parsed.data.apiKey);

    // Use mode-specific system prompt
    const modeConfig = getAgentConfig(currentMode);
    const systemPrompt = `${modeConfig.systemPrompt}\n\n${chatService.buildSystemPrompt()}`;
    const tools = createCodingTools(chatService.getProjectPath());

    // Append user message to conversation history
    const userMessage: CoreMessage = { role: 'user', content: parsed.data.message };
    chatService.appendConversationHistory(userMessage);

    return streamSSE(c, async (stream) => {
      try {
        const result = streamText({
          model: model as Parameters<typeof streamText>[0]['model'],
          system: systemPrompt,
          messages: chatService.getConversationHistory(),
          tools,
          stopWhen: stepCountIs(10),
        });

        let assistantText = '';

        for await (const part of result.fullStream) {
          switch (part.type) {
            case 'text-delta': {
              const text = (part as { text?: string; textDelta?: string }).text
                ?? (part as { textDelta?: string }).textDelta ?? '';
              assistantText += text;
              const payload = sseText(text);
              await stream.writeSSE({ event: payload.event, data: payload.data });
              break;
            }
            case 'reasoning-delta': {
              const text = (part as { text?: string; textDelta?: string }).text
                ?? (part as { textDelta?: string }).textDelta ?? '';
              const payload = sseThinking(text);
              await stream.writeSSE({ event: payload.event, data: payload.data });
              break;
            }
            case 'tool-call': {
              const tc = part as { toolCallId?: string; toolUseId?: string; toolName: string; args?: object; input?: unknown };
              const id = tc.toolCallId ?? tc.toolUseId ?? '';
              const args = tc.args ?? tc.input ?? {};
              const payload = sseToolCall(id, tc.toolName, args as object);
              await stream.writeSSE({ event: payload.event, data: payload.data });
              break;
            }
            case 'tool-result': {
              const tr = part as { toolCallId?: string; toolUseId?: string; toolName: string; result?: unknown; output?: unknown };
              const id = tr.toolCallId ?? tr.toolUseId ?? '';
              const resultStr = typeof tr.result === 'string' ? tr.result
                : typeof tr.output === 'string' ? tr.output
                : JSON.stringify(tr.result ?? tr.output ?? '');
              const isError = resultStr.includes('"error":true') || resultStr.includes('"error": true');
              const payload = sseToolResult(id, tr.toolName, resultStr, isError);
              await stream.writeSSE({ event: payload.event, data: payload.data });
              break;
            }
            case 'finish': {
              const totalUsage = (part as unknown as { totalUsage: { inputTokens?: number; outputTokens?: number; promptTokens?: number; completionTokens?: number } }).totalUsage;
              if (totalUsage) {
                const prompt = totalUsage.promptTokens ?? totalUsage.inputTokens ?? 0;
                const completion = totalUsage.completionTokens ?? totalUsage.outputTokens ?? 0;
                costTracker.record('qa', modelId, prompt, completion);
                const payload = sseUsage(prompt, completion);
                await stream.writeSSE({ event: payload.event, data: payload.data });
              }
              break;
            }
            case 'error': {
              const payload = sseError(String((part as { error: unknown }).error));
              await stream.writeSSE({ event: payload.event, data: payload.data });
              break;
            }
            default:
              break;
          }
        }

        // Append assistant response to history
        if (assistantText) {
          chatService.appendConversationHistory({ role: 'assistant', content: assistantText });
        }

        const done = sseDone();
        await stream.writeSSE({ event: done.event, data: done.data });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const payload = sseError(message);
        await stream.writeSSE({ event: payload.event, data: payload.data });
        const done = sseDone();
        await stream.writeSSE({ event: done.event, data: done.data });
      }
    });
  });

  return app;
};
