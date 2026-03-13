//! Headless `complior chat` — stream chat response from engine.

use futures_util::StreamExt;

use crate::chat_stream::is_json_response;
use crate::config::TuiConfig;

use super::common::ensure_engine;

/// Run a chat request and stream the response to stdout.
pub async fn run_chat(
    message: &str,
    json: bool,
    model: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let mut body = serde_json::json!({ "message": message });
    if let Some(m) = model {
        body["model"] = serde_json::Value::String(m.to_string());
    }

    let resp = match client.post_stream("/chat", &body).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Error: {e}");
            return 1;
        }
    };

    // Slash commands (e.g. /mode, /cost) return JSON directly, not SSE
    if is_json_response(&resp) {
        return handle_json_response(resp, json).await;
    }

    // Parse SSE stream
    parse_sse_stream(resp, json).await
}

/// Handle a JSON response (slash commands).
async fn handle_json_response(resp: reqwest::Response, raw_json: bool) -> i32 {
    let text = resp.text().await.unwrap_or_default();
    if raw_json {
        println!("{text}");
    } else if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
        // Pretty-print command responses
        if let Some(cmd) = val.get("command").and_then(|v| v.as_str()) {
            match cmd {
                "mode" => {
                    let mode = val.get("mode").and_then(|v| v.as_str()).unwrap_or("?");
                    let label = val.get("label").and_then(|v| v.as_str()).unwrap_or(mode);
                    println!("Mode: {label}");
                }
                "cost" => {
                    let cost = val.get("totalCost").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let tokens = val.get("totalTokens").and_then(|v| v.as_u64()).unwrap_or(0);
                    println!("Session cost: ${cost:.4}  ({tokens} tokens)");
                }
                "model" => {
                    let msg = val.get("message").and_then(|v| v.as_str()).unwrap_or("?");
                    println!("{msg}");
                }
                _ => println!("{text}"),
            }
        } else {
            println!("{text}");
        }
    } else {
        println!("{text}");
    }
    0
}

/// Parse an SSE stream and print text deltas to stdout.
async fn parse_sse_stream(resp: reqwest::Response, json: bool) -> i32 {
    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();
    let mut current_event = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => {
                eprintln!("\nStream error: {e}");
                return 1;
            }
        };

        buffer.push_str(&String::from_utf8_lossy(&chunk));

        // Process complete lines from buffer
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

                if json {
                    println!(
                        "{}",
                        serde_json::json!({
                            "event": &current_event,
                            "data": data,
                        })
                    );
                    continue;
                }

                // Streaming text mode
                match current_event.as_str() {
                    "text" => {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(content) =
                                parsed.get("content").and_then(|v| v.as_str())
                            {
                                print!("{content}");
                                use std::io::Write;
                                let _ = std::io::stdout().flush();
                            }
                        }
                    }
                    "error" => {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            let msg = parsed
                                .get("message")
                                .and_then(|v| v.as_str())
                                .unwrap_or(data);
                            eprintln!("\nError: {msg}");
                        }
                    }
                    "done" => {
                        println!(); // Final newline
                        return 0;
                    }
                    _ => {}
                }
            }
        }
    }

    if !json {
        println!(); // Ensure final newline
    }
    0
}
