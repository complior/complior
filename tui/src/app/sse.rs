use crate::engine_client::SseEvent;
use crate::types::{ActivityKind, ChatBlock, ChatMessage, MessageRole};

use super::App;

impl App {
    pub fn handle_sse_event(&mut self, event: SseEvent) {
        match event {
            SseEvent::Thinking(text) => {
                let thinking = self.streaming_thinking.get_or_insert_with(String::new);
                thinking.push_str(&text);
            }
            SseEvent::Token(token) => {
                let response = self.streaming_response.get_or_insert_with(String::new);
                response.push_str(&token);
            }
            SseEvent::ToolCall {
                id: _,
                tool_name,
                args,
            } => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    format!("Tool call: {tool_name}"),
                ));
                if let Some(msg) = self.messages.last_mut() {
                    msg.blocks.push(ChatBlock::ToolCall { tool_name, args });
                }
            }
            SseEvent::ToolResult {
                id: _,
                tool_name,
                result,
                is_error,
            } => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    format!(
                        "Tool result: {tool_name}{}",
                        if is_error { " (error)" } else { "" }
                    ),
                ));
                if let Some(msg) = self.messages.last_mut() {
                    msg.blocks.push(ChatBlock::ToolResult {
                        tool_name,
                        result,
                        is_error,
                    });
                }
            }
            SseEvent::Usage {
                prompt_tokens,
                completion_tokens,
            } => {
                self.last_token_usage = Some((prompt_tokens, completion_tokens));
            }
            SseEvent::Done => {
                if let Some(response) = self.streaming_response.take() {
                    let mut msg = ChatMessage::new(MessageRole::Assistant, response);
                    if let Some(thinking) = self.streaming_thinking.take() {
                        if !thinking.is_empty() {
                            msg.blocks.insert(0, ChatBlock::Thinking(thinking));
                        }
                    }
                    msg.blocks.push(ChatBlock::Text(msg.content.clone()));
                    self.push_activity(ActivityKind::Chat, "AI response");
                    self.messages.push(msg);
                    self.chat_auto_scroll = true;
                }
                self.streaming_thinking = None;
                self.operation_start = None;
            }
            SseEvent::Error(err) => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    format!("Error: {err}"),
                ));
                self.streaming_response = None;
                self.streaming_thinking = None;
                self.operation_start = None;
            }
        }
    }
}
