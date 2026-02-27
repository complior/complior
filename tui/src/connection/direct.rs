use std::future::Future;
use std::pin::Pin;

use crate::engine_client::EngineClient;
use crate::types::ScanResult;

use super::EngineConnection;

/// Wraps the existing `EngineClient`, delegating all calls.
/// Used in standalone mode (no daemon).
pub struct DirectConnection {
    client: EngineClient,
}

impl DirectConnection {
    pub fn new(client: EngineClient) -> Self {
        Self { client }
    }
}

impl EngineConnection for DirectConnection {
    fn scan(&self, path: &str) -> Pin<Box<dyn Future<Output = Result<ScanResult, String>> + Send + '_>> {
        let path = path.to_string();
        Box::pin(async move {
            self.client.scan(&path).await.map_err(|e| e.to_string())
        })
    }

    fn fix(&self, checks: &[String]) -> Pin<Box<dyn Future<Output = Result<serde_json::Value, String>> + Send + '_>> {
        let checks = checks.to_vec();
        Box::pin(async move {
            self.client
                .fix_dry_run(&checks)
                .await
                .map_err(|e| e.to_string())
        })
    }

    fn status(&self) -> Pin<Box<dyn Future<Output = Result<bool, String>> + Send + '_>> {
        Box::pin(async move {
            self.client
                .status()
                .await
                .map(|s| s.ready)
                .map_err(|e| e.to_string())
        })
    }
}
