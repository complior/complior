#[derive(Debug, thiserror::Error)]
pub enum TuiError {
    #[error("Engine connection error: {0}")]
    EngineConnection(#[from] reqwest::Error),

    #[error("Render error: {0}")]
    Render(String),

    #[error("Config error: {0}")]
    Config(String),

    #[error("SSE parse error: {0}")]
    SseParse(String),

    #[error("Engine timeout ({0}ms)")]
    Timeout(u64),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, TuiError>;
