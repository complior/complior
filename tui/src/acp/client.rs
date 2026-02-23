//! ACP (Agent Client Protocol) client.
//!
//! Spawns a subprocess with plain pipes (no PTY), communicates via
//! JSON-RPC 2.0 over stdin/stdout.

use std::io;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use serde_json::{Value, json};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::mpsc;

use crate::agents::registry::AgentConfig;

use super::types::{AcpCapabilities, AcpEvent, AcpResponse};

/// Outbound-only channel capacity.
const EVENT_CAPACITY: usize = 256;

/// ACP client wrapping an agent subprocess.
pub struct AcpClient {
    pub child: Child,
    stdin: ChildStdin,
    next_id: Arc<AtomicU64>,
    pub events: mpsc::Receiver<AcpEvent>,
}

impl AcpClient {
    /// Spawn the agent subprocess and start the background stdout reader.
    pub fn spawn(config: &AgentConfig) -> io::Result<Self> {
        let mut cmd = Command::new(&config.binary);
        for arg in &config.args {
            cmd.arg(arg);
        }
        for (k, v) in &config.env {
            cmd.env(k, v);
        }
        cmd.stdin(std::process::Stdio::piped());
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::null());

        let mut child = cmd.spawn()?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| io::Error::new(io::ErrorKind::BrokenPipe, "no stdin"))?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| io::Error::new(io::ErrorKind::BrokenPipe, "no stdout"))?;

        let (tx, rx) = mpsc::channel(EVENT_CAPACITY);

        // Background task: read stdout line-by-line → parse → send AcpEvent
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout).lines();
            loop {
                match reader.next_line().await {
                    Ok(Some(line)) if !line.trim().is_empty() => {
                        let event = parse_line(&line);
                        if tx.send(event).await.is_err() {
                            break; // receiver dropped
                        }
                    }
                    Ok(Some(_)) => {} // empty line — skip
                    Ok(None) | Err(_) => {
                        let _ = tx.send(AcpEvent::Done).await;
                        break;
                    }
                }
            }
        });

        Ok(Self {
            child,
            stdin,
            next_id: Arc::new(AtomicU64::new(1)),
            events: rx,
        })
    }

    /// Send a JSON-RPC request to the agent's stdin.
    pub async fn send(&mut self, method: &str, params: Value) -> io::Result<u64> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let msg = serde_json::to_string(&serde_json::json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params,
        }))?;
        self.stdin.write_all(msg.as_bytes()).await?;
        self.stdin.write_all(b"\n").await?;
        self.stdin.flush().await?;
        Ok(id)
    }

    /// Perform the `session/initialize` handshake.
    ///
    /// Sends the request and waits (up to 5 s) for a matching response.
    pub async fn initialize(&mut self) -> io::Result<AcpCapabilities> {
        self.send(
            "session/initialize",
            json!({
                "clientInfo": { "name": "complior", "version": "0.6.0" },
                "capabilities": { "file_write": true, "tool_call": true }
            }),
        )
        .await?;

        // Wait for the result (up to 5 s)
        let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(5);
        loop {
            let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
            if remaining.is_zero() {
                return Err(io::Error::new(
                    io::ErrorKind::TimedOut,
                    "ACP handshake timeout",
                ));
            }
            match tokio::time::timeout(remaining, self.events.recv()).await {
                Ok(Some(AcpEvent::Initialized(caps))) => return Ok(caps),
                Ok(Some(AcpEvent::Error(e))) => {
                    return Err(io::Error::new(io::ErrorKind::Other, e));
                }
                Ok(Some(_)) => {} // ignore other events during handshake
                Ok(None) => {
                    return Err(io::Error::new(
                        io::ErrorKind::UnexpectedEof,
                        "ACP agent closed during handshake",
                    ));
                }
                Err(_) => {
                    return Err(io::Error::new(
                        io::ErrorKind::TimedOut,
                        "ACP handshake timeout",
                    ));
                }
            }
        }
    }

    /// Send a prompt to the agent (`session/prompt`).
    pub async fn prompt(&mut self, text: &str) -> io::Result<()> {
        self.send("session/prompt", json!({ "text": text })).await?;
        Ok(())
    }

    /// Cancel the current turn and kill the subprocess.
    pub fn cancel(&mut self) {
        let _ = self.child.start_kill();
    }
}

// ─── Private helpers ───────────────────────────────────────────────────────

/// Parse a single stdout line from the agent into an `AcpEvent`.
fn parse_line(line: &str) -> AcpEvent {
    let Ok(msg) = serde_json::from_str::<AcpResponse>(line) else {
        return AcpEvent::Error(format!("invalid JSON: {line}"));
    };

    // Determine if this is a response (has id + result) or a notification (has method + params)
    if let Some(method) = &msg.method {
        parse_notification(method, msg.params.as_ref())
    } else if msg.error.is_some() {
        AcpEvent::Error(
            msg.error
                .and_then(|e| e.get("message").and_then(|m| m.as_str()).map(String::from))
                .unwrap_or_else(|| "unknown error".to_string()),
        )
    } else if let Some(result) = msg.result {
        // Response to session/initialize
        let file_write = result
            .get("agentCapabilities")
            .and_then(|c| c.get("file_write"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let tool_call = result
            .get("agentCapabilities")
            .and_then(|c| c.get("tool_call"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        AcpEvent::Initialized(AcpCapabilities { file_write, tool_call })
    } else {
        AcpEvent::Error("unrecognized message".to_string())
    }
}

fn parse_notification(method: &str, params: Option<&Value>) -> AcpEvent {
    let params = params.cloned().unwrap_or(Value::Null);
    match method {
        "session/update" => {
            let kind = params.get("type").and_then(|v| v.as_str()).unwrap_or("");
            match kind {
                "token" => {
                    let text = params
                        .get("text")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    AcpEvent::Token { text }
                }
                "tool_call" => {
                    let id = params
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let name = params
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let args = params.get("args").cloned().unwrap_or(Value::Null);
                    AcpEvent::ToolCall { id, name, args }
                }
                "done" => AcpEvent::Done,
                other => AcpEvent::Error(format!("unknown session/update type: {other}")),
            }
        }
        "file/write" => {
            let path = params
                .get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let content = params
                .get("content")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            AcpEvent::FileWrite { path, content }
        }
        other => AcpEvent::Error(format!("unknown method: {other}")),
    }
}
