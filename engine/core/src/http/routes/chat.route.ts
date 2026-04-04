import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { streamText, stepCountIs, type CoreMessage } from 'ai';
import type { ChatService } from '../../services/chat-service.js';
import { createLogger } from '../../infra/logger.js';
import type { LlmPort } from '../../ports/llm.port.js';
import type { ToolExecutorDeps } from '../../llm/tool-executors.js';
import {
  sseThinking, sseText, sseToolCall, sseToolResult,
  sseUsage, sseDone, sseError,
} from '../../llm/sse-protocol.js';
import { createCodingTools } from '../../llm/tool-definitions.js';
import type { AgentMode } from '../../llm/tools/types.js';
import { getAgentConfig, getAllModes } from '../../llm/agents/modes.js';
import { createCostTracker, type CostTracker } from '../../llm/routing/cost-tracker.js';
import { createRateLimiter } from '../../infra/rate-limiter.js';
import { parseBody } from '../utils/validation.js';

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
  readonly toolExecutorDeps: ToolExecutorDeps;
  readonly getMode: () => AgentMode;
  readonly setMode: (mode: AgentMode) => void;
  readonly maxRequestsPerHour?: number;
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

const chatLog = createLogger('chat-route');

export const createChatRoute = (deps: ChatRouteDeps) => {
  const { chatService, llm, toolExecutorDeps, getMode, setMode } = deps;
  const app = new Hono();

  // Session state
  let modelOverride: string | undefined;
  const costTracker: CostTracker = createCostTracker();

  // Rate limiting (sliding window)
  const DEFAULT_MAX_REQUESTS_PER_HOUR = 50;
  const rateLimiter = createRateLimiter(deps.maxRequestsPerHour ?? DEFAULT_MAX_REQUESTS_PER_HOUR);

  // GET /mode — current mode info
  app.get('/mode', (c) => c.json({ mode: getMode(), config: getAgentConfig(getMode()) }));

  // POST /mode — switch mode
  app.post('/mode', async (c) => {
    const body: Record<string, unknown> = await c.req.json().catch(() => ({}));
    const mode = typeof body['mode'] === 'string' ? body['mode'] : undefined;
    if (!mode || !isAgentMode(mode)) {
      return c.json({ error: 'INVALID_MODE', valid: getAllModes() }, 400);
    }
    setMode(mode);
    return c.json({ mode: getMode(), config: getAgentConfig(getMode()) });
  });

  // GET /cost — session cost breakdown
  app.get('/cost', (c) => c.json(costTracker.getBreakdown()));

  app.post('/chat', async (c) => {
    const parsed = await parseBody(c, ChatRequestSchema);

    // Handle slash commands
    const cmd = parseCommand(parsed.message);
    if (cmd) {
      if (cmd.command === 'mode' && cmd.arg) {
        if (isAgentMode(cmd.arg)) {
          setMode(cmd.arg);
          const config = getAgentConfig(getMode());
          return c.json({ type: 'command', command: 'mode', mode: getMode(), label: config.label, writeEnabled: config.writeEnabled });
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

    // Rate limiting — sliding window
    if (!rateLimiter.check()) {
      return c.json({ error: 'RATE_LIMIT', message: 'Chat rate limit exceeded' }, 429);
    }

    // Apply mode from request or session
    if (parsed.mode) setMode(parsed.mode);

    const { provider, modelId } = parsed.provider && parsed.model
      ? { provider: parsed.provider, modelId: parsed.model }
      : llm.routeModel(modelOverride ?? 'chat', parsed.provider);
    const model = await llm.getModel(provider, modelId, parsed.apiKey);

    // Use mode-specific system prompt
    const modeConfig = getAgentConfig(getMode());
    const systemPrompt = `${modeConfig.systemPrompt}\n\n${await chatService.buildSystemPrompt()}`;
    const tools = createCodingTools(chatService.getProjectPath(), toolExecutorDeps);

    // Append user message to conversation history
    const userMessage: CoreMessage = { role: 'user', content: parsed.message };
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

        // Persist chat history to disk
        chatService.saveHistory().catch((e) => chatLog.warn('History save failed:', e));

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
