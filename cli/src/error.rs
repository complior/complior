#[derive(Debug, thiserror::Error)]
pub enum TuiError {
    #[error("Engine connection error: {0}")]
    EngineConnection(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, TuiError>;
