//! Mock ACP agent for testing the Complior ACP client.
//!
//! Usage:  cargo run --bin mock_acp_agent
//!
//! Reads JSON-RPC 2.0 from stdin, writes responses to stdout.
//!
//! Simulated behaviour:
//!   1. Responds to `session/initialize` with capability advertisement.
//!   2. After `session/prompt`, streams a few tokens, then emits a
//!      `file/write` notification for a safe file (README.md) and another
//!      for a secrets file (.env).
//!   3. Terminates cleanly after `session/cancel` or EOF on stdin.

use std::io::{self, BufRead, Write};

use serde_json::{Value, json};

fn main() {
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) if l.trim().is_empty() => continue,
            Ok(l) => l,
            Err(_) => break,
        };

        let msg: Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(e) => {
                write_line(
                    &mut stdout,
                    &json!({
                        "jsonrpc": "2.0",
                        "id": null,
                        "error": { "code": -32700, "message": format!("Parse error: {e}") }
                    }),
                );
                continue;
            }
        };

        let id = msg.get("id").cloned().unwrap_or(Value::Null);
        let method = msg.get("method").and_then(|m| m.as_str()).unwrap_or("");

        match method {
            "session/initialize" => {
                // Respond with capabilities
                write_line(
                    &mut stdout,
                    &json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "result": {
                            "agentCapabilities": {
                                "file_write": true,
                                "tool_call": true
                            }
                        }
                    }),
                );
            }
            "session/prompt" => {
                // Stream a few tokens
                for token in &["Hello ", "from ", "mock ", "agent! "] {
                    write_line(
                        &mut stdout,
                        &json!({
                            "jsonrpc": "2.0",
                            "method": "session/update",
                            "params": { "type": "token", "text": token }
                        }),
                    );
                }

                // Safe file/write — should PASS the compliance gate
                write_line(
                    &mut stdout,
                    &json!({
                        "jsonrpc": "2.0",
                        "method": "file/write",
                        "params": {
                            "path": "README.md",
                            "content": "# Mock Agent Output\n\nThis file was written by the mock ACP agent."
                        }
                    }),
                );

                // Sensitive file/write — should be REJECTED by the compliance gate
                write_line(
                    &mut stdout,
                    &json!({
                        "jsonrpc": "2.0",
                        "method": "file/write",
                        "params": {
                            "path": ".env",
                            "content": "SECRET=hunter2\nAPI_KEY=supersecret"
                        }
                    }),
                );

                // Done
                write_line(
                    &mut stdout,
                    &json!({
                        "jsonrpc": "2.0",
                        "method": "session/update",
                        "params": { "type": "done" }
                    }),
                );
            }
            "session/cancel" => {
                // Acknowledge and exit
                write_line(
                    &mut stdout,
                    &json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "result": { "cancelled": true }
                    }),
                );
                break;
            }
            other => {
                write_line(
                    &mut stdout,
                    &json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "error": { "code": -32601, "message": format!("Method not found: {other}") }
                    }),
                );
            }
        }
    }
}

fn write_line(out: &mut impl Write, value: &Value) {
    let s = serde_json::to_string(value).expect("serialization is infallible");
    writeln!(out, "{s}").expect("stdout write failed");
    out.flush().expect("stdout flush failed");
}
