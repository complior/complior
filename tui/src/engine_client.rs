use futures_util::StreamExt;
use reqwest::Client;
use tokio::sync::mpsc;

use crate::config::TuiConfig;
use crate::error::{Result, TuiError};
use crate::types::{EngineStatus, ScanResult};

pub struct EngineClient {
    client: Client,
    base_url: String,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum SseEvent {
    Token(String),
    Thinking(String),
    ToolCall {
        id: String,
        tool_name: String,
        args: String,
    },
    ToolResult {
        id: String,
        tool_name: String,
        result: String,
        is_error: bool,
    },
    Usage {
        prompt_tokens: u32,
        completion_tokens: u32,
    },
    Done,
    Error(String),
}

impl EngineClient {
    pub fn new(config: &TuiConfig) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("HTTP client must be constructable");
        Self {
            client,
            base_url: config.engine_url(),
        }
    }

    pub fn from_url(url: &str) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("HTTP client must be constructable");
        Self {
            client,
            base_url: url.trim_end_matches('/').to_string(),
        }
    }

    pub fn clone_for_stream(&self) -> Self {
        Self {
            client: self.client.clone(),
            base_url: self.base_url.clone(),
        }
    }

    pub async fn status(&self) -> Result<EngineStatus> {
        let resp = self
            .client
            .get(format!("{}/status", self.base_url))
            .timeout(std::time::Duration::from_secs(3))
            .send()
            .await?;
        let status = resp.json::<EngineStatus>().await?;
        Ok(status)
    }

    pub async fn scan(&self, path: &str) -> Result<ScanResult> {
        let resp = self
            .client
            .post(format!("{}/scan", self.base_url))
            .json(&serde_json::json!({ "path": path }))
            .send()
            .await?;
        let result = resp.json::<ScanResult>().await?;
        Ok(result)
    }

    pub async fn verify_provider(&self, provider: &str, api_key: &str) -> Result<(bool, Option<String>)> {
        let resp = self
            .client
            .post(format!("{}/provider/verify", self.base_url))
            .json(&serde_json::json!({
                "provider": provider,
                "apiKey": api_key
            }))
            .timeout(std::time::Duration::from_secs(15))
            .send()
            .await?;

        #[derive(serde::Deserialize)]
        struct VerifyResponse {
            valid: bool,
            error: Option<String>,
        }

        let result = resp.json::<VerifyResponse>().await?;
        Ok((result.valid, result.error))
    }

    pub async fn chat_stream(
        &self,
        message: &str,
        provider: Option<&str>,
        model: Option<&str>,
        api_key: Option<&str>,
        tx: mpsc::UnboundedSender<SseEvent>,
    ) -> Result<()> {
        let mut body = serde_json::json!({
            "message": message,
            "stream": true
        });

        if let (Some(p), Some(m), Some(k)) = (provider, model, api_key) {
            body["provider"] = serde_json::Value::String(p.to_string());
            body["model"] = serde_json::Value::String(m.to_string());
            body["apiKey"] = serde_json::Value::String(k.to_string());
        }

        let resp = self
            .client
            .post(format!("{}/chat", self.base_url))
            .json(&body)
            .send()
            .await?;

        let mut stream = resp.bytes_stream();
        let mut buffer = String::new();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(TuiError::EngineConnection)?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(event) = extract_sse_event(&mut buffer) {
                if tx.send(event).is_err() {
                    return Ok(());
                }
            }
        }

        let _ = tx.send(SseEvent::Done);
        Ok(())
    }

    pub async fn run_command(&self, command: &str) -> Result<String> {
        let resp = self
            .client
            .post(format!("{}/shell", self.base_url))
            .json(&serde_json::json!({ "command": command }))
            .send()
            .await?;
        let body = resp.text().await?;
        Ok(body)
    }

    pub async fn read_file(&self, path: &str) -> Result<String> {
        let resp = self
            .client
            .post(format!("{}/file/read", self.base_url))
            .json(&serde_json::json!({ "path": path }))
            .send()
            .await?;

        #[derive(serde::Deserialize)]
        struct FileResponse {
            content: String,
        }

        let file_resp = resp.json::<FileResponse>().await?;
        Ok(file_resp.content)
    }

    pub async fn undo(&self, id: Option<u32>) -> Result<serde_json::Value> {
        let mut body = serde_json::json!({});
        if let Some(id) = id {
            body["id"] = serde_json::Value::Number(serde_json::Number::from(id));
        }
        let resp = self
            .client
            .post(format!("{}/fix/undo", self.base_url))
            .json(&body)
            .send()
            .await?;
        let result = resp.json::<serde_json::Value>().await?;
        Ok(result)
    }

    pub async fn undo_history(&self) -> Result<Vec<serde_json::Value>> {
        let resp = self
            .client
            .get(format!("{}/fix/history", self.base_url))
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await?;
        let result = resp.json::<Vec<serde_json::Value>>().await?;
        Ok(result)
    }

    pub async fn suggestions(&self) -> Result<Vec<serde_json::Value>> {
        let resp = self
            .client
            .get(format!("{}/suggestions", self.base_url))
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await?;
        let result = resp.json::<Vec<serde_json::Value>>().await?;
        Ok(result)
    }

    /// T905: What-if scenario analysis.
    pub async fn whatif(&self, scenario: &str) -> Result<serde_json::Value> {
        let resp = self
            .client
            .post(format!("{}/whatif", self.base_url))
            .json(&serde_json::json!({ "scenario": scenario }))
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await?;
        let result = resp.json::<serde_json::Value>().await?;
        Ok(result)
    }

    /// T906: Dry-run fix — simulate without writing files.
    pub async fn fix_dry_run(&self, selected: &[String]) -> Result<serde_json::Value> {
        let resp = self
            .client
            .post(format!("{}/fix", self.base_url))
            .json(&serde_json::json!({
                "checks": selected,
                "dry_run": true
            }))
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await?;
        let result = resp.json::<serde_json::Value>().await?;
        Ok(result)
    }

    pub async fn edit_file(&self, path: &str, old_str: &str, new_str: &str) -> Result<String> {
        let resp = self
            .client
            .post(format!("{}/file/edit", self.base_url))
            .json(&serde_json::json!({
                "path": path,
                "oldString": old_str,
                "newString": new_str
            }))
            .send()
            .await?;
        let body = resp.text().await?;
        Ok(body)
    }
}

fn extract_sse_event(buffer: &mut String) -> Option<SseEvent> {
    let end = buffer.find("\n\n")?;
    let event_text = buffer[..end].to_string();
    *buffer = buffer[end + 2..].to_string();

    let mut event_name = None;
    let mut data_str = None;

    for line in event_text.lines() {
        if let Some(name) = line.strip_prefix("event: ") {
            event_name = Some(name.trim().to_string());
        } else if let Some(data) = line.strip_prefix("data: ") {
            data_str = Some(data.to_string());
        }
    }

    let data = data_str?;

    // If we have a named event, parse by event type
    if let Some(ref name) = event_name {
        match name.as_str() {
            "thinking" => {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&data) {
                    if let Some(content) = parsed.get("content").and_then(|v| v.as_str()) {
                        return Some(SseEvent::Thinking(content.to_string()));
                    }
                }
                return None;
            }
            "text" => {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&data) {
                    if let Some(content) = parsed.get("content").and_then(|v| v.as_str()) {
                        return Some(SseEvent::Token(content.to_string()));
                    }
                }
                return None;
            }
            "tool_call" => {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&data) {
                    let id = parsed.get("toolCallId").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let tool_name = parsed.get("toolName").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let args = parsed.get("args").map(|v| v.to_string()).unwrap_or_default();
                    return Some(SseEvent::ToolCall { id, tool_name, args });
                }
                return None;
            }
            "tool_result" => {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&data) {
                    let id = parsed.get("toolCallId").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let tool_name = parsed.get("toolName").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let result = parsed.get("result").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let is_error = parsed.get("isError").and_then(|v| v.as_bool()).unwrap_or(false);
                    return Some(SseEvent::ToolResult { id, tool_name, result, is_error });
                }
                return None;
            }
            "usage" => {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&data) {
                    let prompt_tokens = parsed.get("promptTokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                    let completion_tokens = parsed.get("completionTokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                    return Some(SseEvent::Usage { prompt_tokens, completion_tokens });
                }
                return None;
            }
            "done" => return Some(SseEvent::Done),
            "error" => {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&data) {
                    let message = parsed.get("message").and_then(|v| v.as_str()).unwrap_or("Unknown error").to_string();
                    return Some(SseEvent::Error(message));
                }
                return Some(SseEvent::Error(data));
            }
            _ => {}
        }
    }

    // Fallback: no named event — use existing token-detection logic
    if data == "[DONE]" {
        return Some(SseEvent::Done);
    }
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&data) {
        if let Some(content) = parsed
            .get("choices")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("delta"))
            .and_then(|d| d.get("content"))
            .and_then(serde_json::Value::as_str)
        {
            return Some(SseEvent::Token(content.to_string()));
        }
        if let Some(content) = parsed.get("text").and_then(serde_json::Value::as_str) {
            return Some(SseEvent::Token(content.to_string()));
        }
    }
    Some(SseEvent::Token(data))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_sse_token() {
        let mut buf = "data: {\"text\":\"Hello\"}\n\n".to_string();
        let event = extract_sse_event(&mut buf);
        assert!(matches!(event, Some(SseEvent::Token(t)) if t == "Hello"));
        assert!(buf.is_empty());
    }

    #[test]
    fn test_extract_sse_done() {
        let mut buf = "data: [DONE]\n\n".to_string();
        let event = extract_sse_event(&mut buf);
        assert!(matches!(event, Some(SseEvent::Done)));
    }

    #[test]
    fn test_extract_sse_plain_text() {
        let mut buf = "data: some plain token\n\n".to_string();
        let event = extract_sse_event(&mut buf);
        assert!(matches!(event, Some(SseEvent::Token(t)) if t == "some plain token"));
    }

    #[test]
    fn test_extract_sse_incomplete() {
        let mut buf = "data: partial".to_string();
        let event = extract_sse_event(&mut buf);
        assert!(event.is_none());
        assert_eq!(buf, "data: partial");
    }

    #[test]
    fn test_extract_named_text_event() {
        let mut buf = "event: text\ndata: {\"content\":\"Hello\"}\n\n".to_string();
        let event = extract_sse_event(&mut buf);
        assert!(matches!(event, Some(SseEvent::Token(t)) if t == "Hello"));
    }

    #[test]
    fn test_extract_thinking_event() {
        let mut buf = "event: thinking\ndata: {\"content\":\"Let me think...\"}\n\n".to_string();
        let event = extract_sse_event(&mut buf);
        assert!(matches!(event, Some(SseEvent::Thinking(t)) if t == "Let me think..."));
    }

    #[test]
    fn test_extract_tool_call_event() {
        let mut buf = "event: tool_call\ndata: {\"toolCallId\":\"tc1\",\"toolName\":\"read_file\",\"args\":{\"path\":\"src/main.rs\"}}\n\n".to_string();
        let event = extract_sse_event(&mut buf);
        assert!(matches!(event, Some(SseEvent::ToolCall { id, tool_name, .. }) if id == "tc1" && tool_name == "read_file"));
    }

    #[test]
    fn test_extract_tool_result_event() {
        let mut buf = "event: tool_result\ndata: {\"toolCallId\":\"tc1\",\"toolName\":\"read_file\",\"result\":\"file content\",\"isError\":false}\n\n".to_string();
        let event = extract_sse_event(&mut buf);
        assert!(matches!(event, Some(SseEvent::ToolResult { is_error: false, .. })));
    }

    #[test]
    fn test_extract_usage_event() {
        let mut buf = "event: usage\ndata: {\"promptTokens\":100,\"completionTokens\":42}\n\n".to_string();
        let event = extract_sse_event(&mut buf);
        assert!(matches!(event, Some(SseEvent::Usage { prompt_tokens: 100, completion_tokens: 42 })));
    }

    #[test]
    fn test_extract_done_event() {
        let mut buf = "event: done\ndata: {}\n\n".to_string();
        let event = extract_sse_event(&mut buf);
        assert!(matches!(event, Some(SseEvent::Done)));
    }

    #[test]
    fn test_extract_error_event() {
        let mut buf = "event: error\ndata: {\"message\":\"API key invalid\"}\n\n".to_string();
        let event = extract_sse_event(&mut buf);
        assert!(matches!(event, Some(SseEvent::Error(msg)) if msg == "API key invalid"));
    }
}
