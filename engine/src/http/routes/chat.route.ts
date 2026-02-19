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

const AGENT_MODE_SET = new Set<string>(['build', 'comply', 'audit', 'learn']);
const isAgentMode = (s: string): s is AgentMode => AGENT_MODE_SET.has(s);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

/** Safe property access helpers for stream parts */
const prop = (obj: unknown, key: string): unknown =>
  isRecord(obj) && key in obj ? obj[key] : undefined;

const strProp = (obj: unknown, key: string, fallback = ''): string => {
  const v = prop(obj, key);
  return typeof v === 'string' ? v : fallback;
};

const numProp = (obj: unknown, key: string, fallback = 0): number => {
  const v = prop(obj, key);
  return typeof v === 'number' ? v : fallback;
};

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
    const body: Record<string, unknown> = await c.req.json().catch(() => ({}));
    const mode = typeof body['mode'] === 'string' ? body['mode'] : undefined;
    if (!mode || !isAgentMode(mode)) {
      return c.json({ error: 'INVALID_MODE', valid: getAllModes() }, 400);
    }
    currentMode = mode;
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
        if (isAgentMode(cmd.arg)) {
          currentMode = cmd.arg;
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
          model: model,
          system: systemPrompt,
          messages: chatService.getConversationHistory(),
          tools,
          stopWhen: stepCountIs(10),
        });

        let assistantText = '';

        for await (const part of result.fullStream) {
          switch (part.type) {
            case 'text-delta': {
              const text = strProp(part, 'text') || strProp(part, 'textDelta');
              assistantText += text;
              const payload = sseText(text);
              await stream.writeSSE({ event: payload.event, data: payload.data });
              break;
            }
            case 'reasoning-delta': {
              const text = strProp(part, 'text') || strProp(part, 'textDelta');
              const payload = sseThinking(text);
              await stream.writeSSE({ event: payload.event, data: payload.data });
              break;
            }
            case 'tool-call': {
              const id = strProp(part, 'toolCallId') || strProp(part, 'toolUseId');
              const toolName = strProp(part, 'toolName');
              const rawArgs = prop(part, 'args') ?? prop(part, 'input');
              const toolArgs = isRecord(rawArgs) ? rawArgs : {};
              const payload = sseToolCall(id, toolName, toolArgs);
              await stream.writeSSE({ event: payload.event, data: payload.data });
              break;
            }
            case 'tool-result': {
              const id = strProp(part, 'toolCallId') || strProp(part, 'toolUseId');
              const toolName = strProp(part, 'toolName');
              const resultVal = prop(part, 'result') ?? prop(part, 'output') ?? '';
              const resultStr = typeof resultVal === 'string' ? resultVal : JSON.stringify(resultVal);
              const isError = resultStr.includes('"error":true') || resultStr.includes('"error": true');
              const payload = sseToolResult(id, toolName, resultStr, isError);
              await stream.writeSSE({ event: payload.event, data: payload.data });
              break;
            }
            case 'finish': {
              const totalUsage = prop(part, 'totalUsage');
              if (totalUsage && typeof totalUsage === 'object') {
                const prompt = numProp(totalUsage, 'promptTokens') || numProp(totalUsage, 'inputTokens');
                const completion = numProp(totalUsage, 'completionTokens') || numProp(totalUsage, 'outputTokens');
                costTracker.record('qa', modelId, prompt, completion);
                const payload = sseUsage(prompt, completion);
                await stream.writeSSE({ event: payload.event, data: payload.data });
              }
              break;
            }
            case 'error': {
              const payload = sseError(String(prop(part, 'error')));
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
