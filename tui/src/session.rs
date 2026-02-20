use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::types::{ChatMessage, ScanResult};

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionData {
    pub messages: Vec<ChatMessage>,
    pub score_history: Vec<f64>,
    pub open_file_path: Option<String>,
    pub terminal_output: Vec<String>,
    pub last_scan: Option<ScanResult>,
}

fn sessions_dir() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("complior")
        .join("sessions")
}

pub async fn save_session(data: &SessionData, name: &str) -> Result<(), String> {
    let dir = sessions_dir();
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("mkdir: {e}"))?;

    let path = dir.join(format!("{name}.json"));
    let json = serde_json::to_string_pretty(data).map_err(|e| format!("serialize: {e}"))?;
    tokio::fs::write(&path, json)
        .await
        .map_err(|e| format!("write: {e}"))?;
    Ok(())
}

pub async fn load_session(name: &str) -> Result<SessionData, String> {
    let path = sessions_dir().join(format!("{name}.json"));
    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("read: {e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("parse: {e}"))
}

pub async fn list_sessions() -> Vec<String> {
    let dir = sessions_dir();
    let Ok(mut entries) = tokio::fs::read_dir(&dir).await else {
        return Vec::new();
    };

    let mut names = Vec::new();
    while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "json") {
            if let Some(stem) = path.file_stem() {
                names.push(stem.to_string_lossy().to_string());
            }
        }
    }

    names.sort();
    names
}

pub async fn first_run_done() -> bool {
    let marker = sessions_dir().join(".first_run_done");
    tokio::fs::try_exists(&marker).await.unwrap_or(false)
}

pub async fn mark_first_run_done() {
    let dir = sessions_dir();
    let _ = tokio::fs::create_dir_all(&dir).await;
    let marker = dir.join(".first_run_done");
    let _ = tokio::fs::write(marker, "done").await;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::MessageRole;

    #[test]
    fn test_session_roundtrip() {
        let data = SessionData {
            messages: vec![ChatMessage::new(
                MessageRole::System,
                "test".to_string(),
            )],
            score_history: vec![42.0, 65.0],
            open_file_path: Some("src/main.rs".to_string()),
            terminal_output: vec!["$ ls".to_string()],
            last_scan: None,
        };

        let json = serde_json::to_string(&data).expect("serialize");
        let loaded: SessionData = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(loaded.messages.len(), 1);
        assert_eq!(loaded.score_history.len(), 2);
    }
}
