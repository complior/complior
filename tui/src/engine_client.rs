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
pub enum SseEvent {
    Token(String),
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

    pub async fn chat_stream(
        &self,
        message: &str,
        tx: mpsc::UnboundedSender<SseEvent>,
    ) -> Result<()> {
        let resp = self
            .client
            .post(format!("{}/chat", self.base_url))
            .json(&serde_json::json!({
                "message": message,
                "stream": true
            }))
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

    for line in event_text.lines() {
        if let Some(data) = line.strip_prefix("data: ") {
            if data == "[DONE]" {
                return Some(SseEvent::Done);
            }
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(content) = parsed
                    .get("choices")
                    .and_then(|c| c.get(0))
                    .and_then(|c| c.get("delta"))
                    .and_then(|d| d.get("content"))
                    .and_then(serde_json::Value::as_str)
                {
                    return Some(SseEvent::Token(content.to_string()));
                }
                // Vercel AI SDK format
                if let Some(content) = parsed.get("text").and_then(serde_json::Value::as_str) {
                    return Some(SseEvent::Token(content.to_string()));
                }
            }
            // Plain text token
            return Some(SseEvent::Token(data.to_string()));
        }
    }
    None
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
}
