use std::future::Future;
use std::pin::Pin;

use crate::types::ScanResult;

use super::EngineConnection;

/// HTTP-based connection to the Complior daemon.
/// Stub — will be implemented in S03.
pub struct HttpConnection;

impl HttpConnection {
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self
    }
}

impl EngineConnection for HttpConnection {
    fn scan(&self, _path: &str) -> Pin<Box<dyn Future<Output = Result<ScanResult, String>> + Send + '_>> {
        Box::pin(async { Err("daemon not implemented — coming in S03".to_string()) })
    }

    fn fix(&self, _checks: &[String]) -> Pin<Box<dyn Future<Output = Result<serde_json::Value, String>> + Send + '_>> {
        Box::pin(async { Err("daemon not implemented — coming in S03".to_string()) })
    }

    fn status(&self) -> Pin<Box<dyn Future<Output = Result<bool, String>> + Send + '_>> {
        Box::pin(async { Err("daemon not implemented — coming in S03".to_string()) })
    }
}
