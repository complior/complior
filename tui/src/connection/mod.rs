pub mod direct;
pub mod http;

use std::future::Future;
use std::pin::Pin;

use crate::types::ScanResult;

/// Abstraction over engine communication.
///
/// `DirectConnection` wraps the current `EngineClient` (standalone mode).
/// `HttpConnection` will talk to the daemon over HTTP (S03).
pub trait EngineConnection: Send + Sync {
    fn scan(&self, path: &str) -> Pin<Box<dyn Future<Output = Result<ScanResult, String>> + Send + '_>>;
    fn fix(&self, checks: &[String]) -> Pin<Box<dyn Future<Output = Result<serde_json::Value, String>> + Send + '_>>;
    fn status(&self) -> Pin<Box<dyn Future<Output = Result<bool, String>> + Send + '_>>;
}
