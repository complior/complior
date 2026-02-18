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

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  model: z.string().optional(),
  provider: z.enum(['anthropic', 'openai', 'openrouter']).optional(),
  apiKey: z.string().optional(),
});

export interface ChatRouteDeps {
  readonly chatService: ChatService;
  readonly llm: LlmPort;
}

export const createChatRoute = (deps: ChatRouteDeps) => {
  const { chatService, llm } = deps;
  const app = new Hono();

  app.post('/chat', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const { provider, modelId } = parsed.data.provider && parsed.data.model
      ? { provider: parsed.data.provider, modelId: parsed.data.model }
      : llm.routeModel('chat');
    const model = await llm.getModel(provider, modelId, parsed.data.apiKey);
    const systemPrompt = chatService.buildSystemPrompt();
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
