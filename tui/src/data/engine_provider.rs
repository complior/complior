//! `EngineDataProvider` — HTTP client for the PROJECT API (`api.complior.ai`).
//!
//! Fetches AI Registry statistics and high-risk tool findings.  Caches results
//! for `CACHE_TTL` (30 s) and serves from cache on every DataProvider call so
//! the TUI render loop is never blocked.  A background thread refreshes the
//! cache automatically.  On any error the last cached values (or defaults) are
//! returned — the provider never panics.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

use crate::data::provider::DataProvider;
use crate::types::{ActivityEntry, Finding, Severity, Zone};

// ── Constants ────────────────────────────────────────────────────────────────

/// How long a cache entry is considered fresh.
pub const CACHE_TTL: Duration = Duration::from_secs(30);

/// Default HTTP timeout for every request.
pub const DEFAULT_TIMEOUT: Duration = Duration::from_secs(5);

/// Score returned when no cached data is available yet.
pub const DEFAULT_SCORE: f64 = 47.0;

// ── Wire types (PROJECT API) ─────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Deserialize)]
struct RegistryStatsResponse {
    #[serde(rename = "totalTools")]
    total: u32,
    #[serde(rename = "byRiskLevel")]
    by_risk: HashMap<String, u32>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct RegistryToolsResponse {
    data: Vec<RegistryTool>,
    #[allow(dead_code)]
    pagination: RegistryPagination,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct RegistryPagination {
    #[allow(dead_code)]
    total: u32,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct RegistryTool {
    slug: String,
    name: String,
    #[serde(rename = "riskLevel")]
    risk_level: Option<String>,
}

// ── Cache ────────────────────────────────────────────────────────────────────

#[derive(Clone)]
struct EngineCache {
    score: f64,
    zone: Zone,
    findings: Vec<Finding>,
    fetched_at: Instant,
}

impl Default for EngineCache {
    fn default() -> Self {
        Self {
            score: DEFAULT_SCORE,
            zone: Zone::Red,
            findings: Vec::new(),
            fetched_at: Instant::now() - CACHE_TTL - Duration::from_secs(1), // expired
        }
    }
}

impl EngineCache {
    fn is_fresh(&self) -> bool {
        self.fetched_at.elapsed() < CACHE_TTL
    }
}

// ── Provider ─────────────────────────────────────────────────────────────────

/// HTTP-backed `DataProvider` that pulls registry data from the PROJECT API.
///
/// * `connect()` must be called once at startup (blocking, ≤ `timeout`).
/// * After a successful connect a background thread refreshes the cache every
///   `CACHE_TTL` seconds.
/// * All `DataProvider` methods are non-blocking (always read from cache).
pub struct EngineDataProvider {
    base_url: String,
    api_key: String,
    timeout: Duration,
    /// Always populated — starts with defaults, updated by fetch.
    cache: Arc<RwLock<EngineCache>>,
}

impl EngineDataProvider {
    /// Create a provider with the default 5-second timeout.
    pub fn new(base_url: &str, api_key: &str) -> Self {
        Self::new_with_timeout(base_url, api_key, DEFAULT_TIMEOUT)
    }

    /// Create a provider with a custom timeout (useful in tests).
    pub fn new_with_timeout(base_url: &str, api_key: &str, timeout: Duration) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key: api_key.to_string(),
            timeout,
            cache: Arc::new(RwLock::new(EngineCache::default())),
        }
    }

    /// Initial connectivity test + first cache population.
    ///
    /// Blocks for at most `self.timeout`.  Returns `Err` if the API is
    /// unreachable or returns a non-2xx status.  On success, starts the
    /// background refresh thread.
    pub fn connect(&self) -> Result<(), String> {
        self.fetch_and_update_cache()?;
        self.spawn_refresh_thread();
        Ok(())
    }

    // ── private helpers ──────────────────────────────────────────────────────

    fn make_client(&self) -> Result<reqwest::blocking::Client, String> {
        reqwest::blocking::Client::builder()
            .timeout(self.timeout)
            .build()
            .map_err(|e| e.to_string())
    }

    fn fetch_and_update_cache(&self) -> Result<(), String> {
        let client = self.make_client()?;
        let stats = self.fetch_stats(&client)?;
        let (score, zone) = score_from_stats(&stats);
        let findings = self.fetch_findings(&client).unwrap_or_default();

        let entry = EngineCache {
            score,
            zone,
            findings,
            fetched_at: Instant::now(),
        };

        self.cache
            .write()
            .map_err(|e| e.to_string())
            .map(|mut g| *g = entry)
    }

    fn fetch_stats(
        &self,
        client: &reqwest::blocking::Client,
    ) -> Result<RegistryStatsResponse, String> {
        let url = format!("{}/v1/registry/stats", self.base_url);
        let resp = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            return Err(format!("HTTP {}", resp.status()));
        }
        resp.json::<RegistryStatsResponse>().map_err(|e| e.to_string())
    }

    fn fetch_findings(&self, client: &reqwest::blocking::Client) -> Result<Vec<Finding>, String> {
        let url = format!(
            "{}/v1/registry/tools?limit=50&risk=high",
            self.base_url
        );
        let resp = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            return Ok(Vec::new());
        }
        let body = resp
            .json::<RegistryToolsResponse>()
            .map_err(|e| e.to_string())?;
        Ok(tools_to_findings(&body.data))
    }

    fn spawn_refresh_thread(&self) {
        let cache = Arc::clone(&self.cache);
        let base_url = self.base_url.clone();
        let api_key = self.api_key.clone();
        let timeout = self.timeout;

        std::thread::spawn(move || {
            loop {
                std::thread::sleep(CACHE_TTL);

                let Ok(client) = reqwest::blocking::Client::builder()
                    .timeout(timeout)
                    .build()
                else {
                    continue;
                };

                let stats_url = format!("{base_url}/v1/registry/stats");
                let Ok(resp) = client
                    .get(&stats_url)
                    .header("Authorization", format!("Bearer {api_key}"))
                    .send()
                else {
                    continue;
                };
                if !resp.status().is_success() {
                    continue;
                }
                let Ok(stats) = resp.json::<RegistryStatsResponse>() else {
                    continue;
                };

                let (score, zone) = score_from_stats(&stats);

                let tools_url =
                    format!("{base_url}/v1/registry/tools?limit=50&risk=high");
                let findings = client
                    .get(&tools_url)
                    .header("Authorization", format!("Bearer {api_key}"))
                    .send()
                    .ok()
                    .and_then(|r| r.json::<RegistryToolsResponse>().ok())
                    .map(|b| tools_to_findings(&b.data))
                    .unwrap_or_default();

                let Ok(mut guard) = cache.write() else { continue };
                *guard = EngineCache {
                    score,
                    zone,
                    findings,
                    fetched_at: Instant::now(),
                };
            }
        });
    }

    fn read_cache(&self) -> EngineCache {
        self.cache
            .read()
            .map(|g| g.clone())
            .unwrap_or_default()
    }
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

fn score_from_stats(stats: &RegistryStatsResponse) -> (f64, Zone) {
    if stats.total == 0 {
        return (DEFAULT_SCORE, Zone::Red);
    }
    let high = stats.by_risk.get("high").copied().unwrap_or(0);
    let unacceptable = stats.by_risk.get("unacceptable").copied().unwrap_or(0);
    let bad = high + unacceptable;

    let compliant_ratio = 1.0 - (bad as f64 / stats.total as f64);
    let score = (compliant_ratio * 100.0).clamp(0.0, 100.0);

    let zone = if score >= 85.0 {
        Zone::Green
    } else if score < 40.0 {
        Zone::Red
    } else {
        Zone::Yellow
    };
    (score, zone)
}

fn tools_to_findings(tools: &[RegistryTool]) -> Vec<Finding> {
    tools
        .iter()
        .map(|t| {
            let risk = t.risk_level.as_deref().unwrap_or("minimal");
            let severity = match risk {
                "unacceptable" => Severity::Critical,
                "high" | "gpai_systemic" => Severity::High,
                "gpai" | "limited" => Severity::Medium,
                _ => Severity::Low,
            };
            Finding {
                check_id: t.slug.clone(),
                r#type: "ai_registry".into(),
                message: format!("{} requires compliance attention", t.name),
                severity,
                obligation_id: None,
                article_reference: None,
                fix: None,
            }
        })
        .collect()
}

// ── DataProvider impl ─────────────────────────────────────────────────────────

impl DataProvider for EngineDataProvider {
    /// Always returns `DEFAULT_SCORE`.
    ///
    /// The project compliance score is determined by scanning the *local* codebase
    /// (Engine `POST /scan`) and stored in `App.last_scan`, which the dashboard already
    /// prioritises over this value.  The PROJECT API only provides AI Registry data
    /// (global tool statistics), not per-project compliance scores.
    fn score(&self) -> f64 {
        DEFAULT_SCORE
    }

    /// Always returns `Zone::Red` (unknown until a real scan runs).
    fn zone(&self) -> Zone {
        Zone::Red
    }

    fn findings(&self) -> Vec<Finding> {
        let c = self.read_cache();
        if c.is_fresh() { c.findings } else { Vec::new() }
    }

    fn timeline(&self) -> Vec<ActivityEntry> {
        Vec::new()
    }

    fn activity_log(&self) -> Vec<ActivityEntry> {
        Vec::new()
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;

    // ── helper ───────────────────────────────────────────────────────────────

    fn stats_body(total: u32, high: u32, medium: u32) -> String {
        format!(
            r#"{{"totalTools":{total},"byRiskLevel":{{"high":{high},"limited":{medium},"minimal":{}}}}}"#,
            total.saturating_sub(high + medium)
        )
    }

    // ── B6-1: no API key → connect fails immediately ──────────────────────────

    #[test]
    fn test_falls_back_to_mock_on_no_key() {
        // Empty key still tries but gets 401 or connection refused — either
        // way connect() must return Err so the caller falls back to mock.
        let provider =
            EngineDataProvider::new_with_timeout("http://127.0.0.1:1", "", Duration::from_millis(200));
        assert!(
            provider.connect().is_err(),
            "Provider with no reachable endpoint must return Err"
        );
    }

    // ── B6-2: non-responding server → timeout → connect fails ────────────────

    #[test]
    fn test_falls_back_on_timeout() {
        // Bind a socket but never accept → client TCP handshake succeeds but
        // HTTP response never arrives → read timeout fires.
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        // Keep listener in scope so the port stays open for the duration.
        let _listener = listener;

        let provider = EngineDataProvider::new_with_timeout(
            &format!("http://{addr}"),
            "key",
            Duration::from_millis(300),
        );
        assert!(provider.connect().is_err(), "Timeout must make connect() return Err");
        // score() should return DEFAULT while cache is empty / stale
        assert_eq!(provider.score(), DEFAULT_SCORE);
    }

    // ── B6-3: successful response is parsed correctly ─────────────────────────

    #[test]
    fn test_parses_registry_stats_response() {
        let mut server = mockito::Server::new();

        let _stats_mock = server
            .mock("GET", "/v1/registry/stats")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(stats_body(100, 5, 20))
            .create();

        let _tools_mock = server
            .mock("GET", mockito::Matcher::Regex(r"^/v1/registry/tools".into()))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{"tools":[],"total":0}"#)
            .create();

        let provider = EngineDataProvider::new_with_timeout(
            &server.url(),
            "test_key",
            Duration::from_secs(5),
        );
        assert!(provider.connect().is_ok(), "Valid mock server must connect OK");

        // US-S0212: EngineDataProvider.score() always returns DEFAULT_SCORE.
        // The project compliance score comes from App.last_scan (Engine POST /scan),
        // not from global AI Registry statistics.
        let score = provider.score();
        assert_eq!(
            score, DEFAULT_SCORE,
            "EngineDataProvider.score() must always return DEFAULT_SCORE (not registry %)"
        );
    }

    // ── B6-4: findings are served from cache while fresh ─────────────────────

    #[test]
    fn test_cache_valid_within_ttl() {
        let provider =
            EngineDataProvider::new_with_timeout("http://nonexistent", "key", Duration::from_millis(10));

        // Manually inject a fresh cache entry with some findings.
        let test_finding = Finding {
            check_id: "test-tool".into(),
            r#type: "ai_registry".into(),
            message: "test tool requires compliance attention".into(),
            severity: Severity::High,
            obligation_id: None,
            article_reference: None,
            fix: None,
        };
        {
            let mut guard = provider.cache.write().unwrap();
            *guard = EngineCache {
                score: 75.0, // stored but not exposed — score() returns DEFAULT_SCORE
                zone: Zone::Green,
                findings: vec![test_finding],
                fetched_at: Instant::now(),
            };
        }

        // US-S0212: score() always returns DEFAULT_SCORE regardless of cache
        assert_eq!(provider.score(), DEFAULT_SCORE, "score() must always return DEFAULT_SCORE");
        // findings() comes from the cache when fresh
        assert_eq!(provider.findings().len(), 1, "Fresh cache findings must be served");
    }

    // ── B6-5: expired cache returns empty findings ────────────────────────────

    #[test]
    fn test_cache_expired_after_ttl() {
        let provider =
            EngineDataProvider::new_with_timeout("http://nonexistent", "key", Duration::from_millis(10));

        // Inject an already-expired cache entry.
        {
            let mut guard = provider.cache.write().unwrap();
            *guard = EngineCache {
                score: 99.0,
                zone: Zone::Green,
                findings: vec![],
                fetched_at: Instant::now() - CACHE_TTL - Duration::from_secs(1),
            };
        }

        // score() always returns DEFAULT_SCORE regardless of cache freshness
        assert_eq!(
            provider.score(),
            DEFAULT_SCORE,
            "score() must return DEFAULT_SCORE (US-S0212)"
        );
        // findings are empty when cache is expired
        assert!(
            provider.findings().is_empty(),
            "Expired cache must return empty findings"
        );
    }

    // ── score helper ──────────────────────────────────────────────────────────

    #[test]
    fn test_score_from_stats_all_compliant() {
        let stats = RegistryStatsResponse {
            total: 50,
            by_risk: HashMap::from([
                ("minimal".into(), 50u32),
            ]),
        };
        let (score, zone) = score_from_stats(&stats);
        assert_eq!(score, 100.0);
        assert_eq!(zone, Zone::Green);
    }

    #[test]
    fn test_score_from_stats_all_high_risk() {
        let stats = RegistryStatsResponse {
            total: 10,
            by_risk: HashMap::from([("high".into(), 10u32)]),
        };
        let (score, zone) = score_from_stats(&stats);
        assert_eq!(score, 0.0);
        assert_eq!(zone, Zone::Red);
    }

    #[test]
    fn test_score_from_stats_empty_registry() {
        let stats = RegistryStatsResponse {
            total: 0,
            by_risk: HashMap::new(),
        };
        let (score, _zone) = score_from_stats(&stats);
        assert_eq!(score, DEFAULT_SCORE);
    }
}
