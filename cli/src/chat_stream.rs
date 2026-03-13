//! SSE stream parser for TUI chat — routes engine events to AppCommand channel.

use std::sync::Arc;

use futures_util::StreamExt;
use tokio::sync::Notify;

use crate::app::AppCommand;
use crate::types::ChatBlock;

/// Check whether response content-type is JSON (slash commands return JSON, not SSE).
pub fn is_json_response(resp: &reqwest::Response) -> bool {
    resp.headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .is_some_and(|ct| ct.contains("application/json"))
}

/// Spawn a background task that reads an SSE stream and dispatches events
/// via the `tx` channel. Cancel via the `cancel` Notify.
pub fn spawn_stream_reader(
    resp: reqwest::Response,
    tx: tokio::sync::mpsc::UnboundedSender<AppCommand>,
    cancel: Arc<Notify>,
) {
    tokio::spawn(async move {
        let mut stream = resp.bytes_stream();
        let mut buffer = String::new();
        let mut current_event = String::new();

        loop {
            tokio::select! {
                _ = cancel.notified() => {
                    break;
                }
                chunk = stream.next() => {
                    let Some(chunk) = chunk else { break };
                    let chunk = match chunk {
                        Ok(c) => c,
                        Err(e) => {
                            let _ = tx.send(AppCommand::ChatStreamError(e.to_string()));
                            break;
                        }
                    };

                    buffer.push_str(&String::from_utf8_lossy(&chunk));

                    while let Some(newline_pos) = buffer.find('\n') {
                        let line = buffer[..newline_pos].trim_end_matches('\r').to_string();
                        buffer = buffer[newline_pos + 1..].to_string();

                        if line.is_empty() {
                            continue;
                        }

                        if let Some(event) = line.strip_prefix("event:") {
                            current_event = event.trim().to_string();
                            continue;
                        }

                        if let Some(data) = line.strip_prefix("data:") {
                            let data = data.trim();
                            let cmd = parse_sse_event(&current_event, data);
                            if let Some(cmd) = cmd {
                                let is_done = matches!(cmd, AppCommand::ChatStreamDone);
                                let _ = tx.send(cmd);
                                if is_done {
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }

        // If we broke out without a Done event, signal done
        let _ = tx.send(AppCommand::ChatStreamDone);
    });
}

/// Map an SSE event+data pair to an AppCommand.
fn parse_sse_event(event: &str, data: &str) -> Option<AppCommand> {
    match event {
        "text" => {
            let parsed: serde_json::Value = serde_json::from_str(data).ok()?;
            let content = parsed.get("content")?.as_str()?;
            Some(AppCommand::ChatStreamDelta(content.to_string()))
        }
        "thinking" => {
            let parsed: serde_json::Value = serde_json::from_str(data).ok()?;
            let content = parsed.get("content").and_then(|v| v.as_str()).unwrap_or("");
            Some(AppCommand::ChatStreamBlock(ChatBlock::Thinking(
                content.to_string(),
            )))
        }
        "tool_call" => {
            let parsed: serde_json::Value = serde_json::from_str(data).ok()?;
            let name = parsed
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();
            let args = parsed
                .get("args")
                .map(|v| v.to_string())
                .unwrap_or_default();
            Some(AppCommand::ChatStreamBlock(ChatBlock::ToolCall {
                tool_name: name,
                args,
            }))
        }
        "tool_result" => {
            let parsed: serde_json::Value = serde_json::from_str(data).ok()?;
            let name = parsed
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();
            let result = parsed
                .get("result")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let is_error = parsed
                .get("isError")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            Some(AppCommand::ChatStreamBlock(ChatBlock::ToolResult {
                tool_name: name,
                result,
                is_error,
            }))
        }
        "error" => {
            let parsed: serde_json::Value = serde_json::from_str(data).ok()?;
            let msg = parsed
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or(data)
                .to_string();
            Some(AppCommand::ChatStreamError(msg))
        }
        "done" => Some(AppCommand::ChatStreamDone),
        _ => None,
    }
}
