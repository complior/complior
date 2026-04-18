use reqwest::Client;

use crate::config::TuiConfig;
use crate::error::{Result, TuiError};
use crate::types::{
    CostEstimateResult, DebtResult, EngineStatus, MultiFrameworkScoreResult, ReadinessResult,
    ScanResult,
};

/// Check whether an error is a transient connection error worth retrying.
fn is_connection_error(e: &TuiError) -> bool {
    let msg = e.to_string().to_lowercase();
    msg.contains("connection refused")
        || msg.contains("connection reset")
        || msg.contains("broken pipe")
        || msg.contains("os error")
        || msg.contains("connect error")
}

#[derive(Clone)]
pub struct EngineClient {
    client: Client,
    base_url: String,
}

impl EngineClient {
    pub fn new(config: &TuiConfig) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("HTTP client must be constructable");
        Self {
            client,
            base_url: config.engine_url(),
        }
    }

    pub fn from_url(url: &str) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("HTTP client must be constructable");
        Self {
            client,
            base_url: url.trim_end_matches('/').to_string(),
        }
    }

    pub async fn status(&self) -> Result<EngineStatus> {
        let resp = self
            .client
            .get(format!("{}/status", self.base_url))
            .timeout(std::time::Duration::from_secs(3))
            .send()
            .await?;
        let status = resp.json::<EngineStatus>().await?;
        Ok(status)
    }

    pub async fn scan(&self, path: &str) -> Result<ScanResult> {
        let resp = self
            .client
            .post(format!("{}/scan", self.base_url))
            .json(&serde_json::json!({ "path": path }))
            .send()
            .await?;
        let result = resp.json::<ScanResult>().await?;
        Ok(result)
    }

    pub async fn run_command(&self, command: &str) -> Result<String> {
        let resp = self
            .client
            .post(format!("{}/shell", self.base_url))
            .json(&serde_json::json!({ "command": command }))
            .send()
            .await?;
        let body = resp.text().await?;
        Ok(body)
    }

    pub async fn read_file(&self, path: &str) -> Result<String> {
        let resp = self
            .client
            .post(format!("{}/file/read", self.base_url))
            .json(&serde_json::json!({ "path": path }))
            .send()
            .await?;

        #[derive(serde::Deserialize)]
        struct FileResponse {
            content: String,
        }

        let file_resp = resp.json::<FileResponse>().await?;
        Ok(file_resp.content)
    }

    pub async fn undo(&self, id: Option<u32>) -> Result<serde_json::Value> {
        let mut body = serde_json::json!({});
        if let Some(id) = id {
            body["id"] = serde_json::Value::Number(serde_json::Number::from(id));
        }
        let resp = self
            .client
            .post(format!("{}/fix/undo", self.base_url))
            .json(&body)
            .send()
            .await?;
        let result = resp.json::<serde_json::Value>().await?;
        Ok(result)
    }

    pub async fn undo_history(&self) -> Result<Vec<serde_json::Value>> {
        let resp = self
            .client
            .get(format!("{}/fix/history", self.base_url))
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await?;
        let result = resp.json::<Vec<serde_json::Value>>().await?;
        Ok(result)
    }

    pub async fn suggestions(&self) -> Result<Vec<serde_json::Value>> {
        let resp = self
            .client
            .get(format!("{}/suggestions", self.base_url))
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await?;
        let result = resp.json::<Vec<serde_json::Value>>().await?;
        Ok(result)
    }

    /// T905: What-if scenario analysis.
    pub async fn whatif(&self, scenario: &str) -> Result<serde_json::Value> {
        let resp = self
            .client
            .post(format!("{}/whatif", self.base_url))
            .json(&serde_json::json!({ "scenario": scenario }))
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await?;
        let result = resp.json::<serde_json::Value>().await?;
        Ok(result)
    }

    /// T906: Dry-run fix — preview fixes without writing files.
    /// Uses GET /fix/preview to get planned fixes and their score impact.
    /// Applies diminishing returns (5% per fix) to avoid over-predicting score.
    /// `known_score` is the current scan score (passed by caller since /status may not have it).
    pub async fn fix_dry_run(&self, known_score: f64) -> Result<serde_json::Value> {
        let preview = self.get_json("/fix/preview").await?;
        let fixes = preview.get("fixes").and_then(|v| v.as_array());

        // Collect individual score impacts, sorted descending for diminishing returns
        let mut impacts: Vec<f64> = fixes.map_or(Vec::new(), |f| {
            f.iter()
                .filter_map(|p| p.get("scoreImpact").and_then(serde_json::Value::as_f64))
                .collect()
        });
        impacts.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));

        // Apply 5% diminishing returns per subsequent fix
        let adjusted_impact: f64 = impacts
            .iter()
            .enumerate()
            .map(|(i, &imp)| imp * 0.95_f64.powi(i as i32))
            .sum();

        let changes: Vec<serde_json::Value> = fixes
            .map(|f| f.iter().map(|plan| {
                let actions = plan.get("actions").and_then(|v| v.as_array());
                let first_action = actions.and_then(|a| a.first());
                let action_type = first_action
                    .and_then(|a| a.get("type"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("MODIFY");
                let path = first_action
                    .and_then(|a| a.get("path"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                serde_json::json!({
                    "path": path,
                    "action": if action_type == "create" { "CREATE" } else { "MODIFY" },
                    "checkId": plan.get("checkId").and_then(|v| v.as_str()).unwrap_or("?"),
                    "scoreImpact": plan.get("scoreImpact").and_then(serde_json::Value::as_f64).unwrap_or(0.0),
                })
            }).collect())
            .unwrap_or_default();

        let predicted = (known_score + adjusted_impact).clamp(known_score, 100.0);

        Ok(serde_json::json!({
            "changes": changes,
            "predictedScore": predicted,
            "totalImpact": adjusted_impact,
        }))
    }

    /// Retry an async operation on connection errors with exponential backoff.
    /// 3 attempts max, 300ms initial backoff doubling each retry (300, 600, 1200ms).
    async fn with_retry<F, Fut, T>(&self, mut op: F) -> Result<T>
    where
        F: FnMut() -> Fut,
        Fut: std::future::Future<Output = Result<T>>,
    {
        let mut delay = std::time::Duration::from_millis(300);
        let max_attempts = 3u32;

        for attempt in 1..=max_attempts {
            match op().await {
                Ok(val) => return Ok(val),
                Err(e) if attempt < max_attempts && is_connection_error(&e) => {
                    tokio::time::sleep(delay).await;
                    delay *= 2;
                }
                Err(e) => return Err(e),
            }
        }
        unreachable!()
    }

    /// Generic GET returning JSON — used for agent passport and other endpoints.
    pub async fn get_json(&self, endpoint: &str) -> Result<serde_json::Value> {
        let url = format!("{}{endpoint}", self.base_url);
        self.with_retry(|| {
            let url = url.clone();
            async move {
                let resp = self
                    .client
                    .get(&url)
                    .timeout(std::time::Duration::from_secs(10))
                    .send()
                    .await?;
                let status = resp.status();
                let text = resp.text().await?;
                if !status.is_success() {
                    // Try to parse as JSON error, fall back to plain text
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                        return Ok(val);
                    }
                    return Err(crate::error::TuiError::Engine(format!(
                        "HTTP {status}: {text}"
                    )));
                }
                let result: serde_json::Value = serde_json::from_str(&text)?;
                Ok(result)
            }
        })
        .await
    }

    /// Generic POST with JSON body — used for report generation and other endpoints.
    pub async fn post_json(
        &self,
        endpoint: &str,
        body: &serde_json::Value,
    ) -> Result<serde_json::Value> {
        let url = format!("{}{endpoint}", self.base_url);
        let body = body.clone();
        self.with_retry(|| {
            let url = url.clone();
            let body = body.clone();
            async move {
                let resp = self
                    .client
                    .post(&url)
                    .json(&body)
                    .timeout(std::time::Duration::from_secs(30))
                    .send()
                    .await?;
                let status = resp.status();
                let text = resp.text().await?;
                if !status.is_success() {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                        return Ok(val);
                    }
                    return Err(crate::error::TuiError::Engine(format!(
                        "HTTP {status}: {text}"
                    )));
                }
                let result: serde_json::Value = serde_json::from_str(&text)?;
                Ok(result)
            }
        })
        .await
    }

    /// Fetch multi-framework scores from engine (E-105, E-106, E-107).
    pub async fn framework_scores(&self) -> Result<MultiFrameworkScoreResult> {
        let resp = self
            .client
            .get(format!("{}/frameworks/scores", self.base_url))
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await?;
        let result = resp.json::<MultiFrameworkScoreResult>().await?;
        Ok(result)
    }

    /// Fetch cost estimate from engine.
    pub async fn cost_estimate(&self) -> Result<CostEstimateResult> {
        let resp = self
            .client
            .get(format!("{}/cost-estimate", self.base_url))
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await?;
        let result = resp.json::<CostEstimateResult>().await?;
        Ok(result)
    }

    /// Fetch compliance debt score from engine.
    pub async fn debt_score(&self) -> Result<DebtResult> {
        let resp = self
            .client
            .get(format!("{}/debt", self.base_url))
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await?;
        let result = resp.json::<DebtResult>().await?;
        Ok(result)
    }

    /// Fetch AIUC-1 readiness score from engine.
    pub async fn readiness_score(&self, name: &str, path: &str) -> Result<ReadinessResult> {
        let name_enc = crate::headless::common::url_encode(name);
        let path_enc = crate::headless::common::url_encode(path);
        let resp = self
            .client
            .get(format!(
                "{}/cert/readiness?name={}&path={}",
                self.base_url, name_enc, path_enc
            ))
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await?;
        let result = resp.json::<ReadinessResult>().await?;
        Ok(result)
    }

    /// Generic GET returning raw bytes — used for binary downloads (e.g. tar.gz).
    pub async fn get_bytes(&self, endpoint: &str) -> Result<Vec<u8>> {
        let url = format!("{}{endpoint}", self.base_url);
        self.with_retry(|| {
            let url = url.clone();
            async move {
                let resp = self
                    .client
                    .get(&url)
                    .timeout(std::time::Duration::from_secs(30))
                    .send()
                    .await?;
                let status = resp.status();
                if !status.is_success() {
                    let text = resp.text().await.unwrap_or_default();
                    return Err(crate::error::TuiError::Engine(format!(
                        "HTTP {status}: {text}"
                    )));
                }
                let bytes = resp.bytes().await?;
                Ok(bytes.to_vec())
            }
        })
        .await
    }

    /// POST returning raw response for SSE stream parsing.
    pub async fn post_stream(
        &self,
        endpoint: &str,
        body: &serde_json::Value,
    ) -> Result<reqwest::Response> {
        let url = format!("{}{endpoint}", self.base_url);
        let resp = self
            .client
            .post(&url)
            .header("Accept", "text/event-stream")
            .json(body)
            .timeout(std::time::Duration::from_mins(2))
            .send()
            .await?;
        if resp.status() == 429 {
            return Err(crate::error::TuiError::Engine(
                "Rate limit exceeded — max chat requests per hour reached".to_string(),
            ));
        }
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(crate::error::TuiError::Engine(format!(
                "HTTP {status}: {text}"
            )));
        }
        Ok(resp)
    }

    /// POST returning raw response for SSE stream parsing with long timeout (3600s).
    /// Used for eval streaming where hundreds of tests may take over an hour.
    pub async fn post_stream_long(
        &self,
        endpoint: &str,
        body: &serde_json::Value,
    ) -> Result<reqwest::Response> {
        let url = format!("{}{endpoint}", self.base_url);
        let resp = self
            .client
            .post(&url)
            .header("Accept", "text/event-stream")
            .json(body)
            .timeout(std::time::Duration::from_hours(1))
            .send()
            .await?;
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(crate::error::TuiError::Engine(format!(
                "HTTP {status}: {text}"
            )));
        }
        Ok(resp)
    }

    /// POST with long timeout (1800s) — for eval/adversarial endpoints (hundreds of LLM calls).
    pub async fn post_json_long(
        &self,
        endpoint: &str,
        body: &serde_json::Value,
    ) -> Result<serde_json::Value> {
        let resp = self
            .client
            .post(format!("{}{endpoint}", self.base_url))
            .json(body)
            .timeout(std::time::Duration::from_mins(30))
            .send()
            .await?;
        let status = resp.status();
        let text = resp.text().await?;
        if !status.is_success() {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                return Ok(val);
            }
            return Err(crate::error::TuiError::Engine(format!(
                "HTTP {status}: {text}"
            )));
        }
        let result: serde_json::Value = serde_json::from_str(&text)?;
        Ok(result)
    }
}
