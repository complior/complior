use reqwest::Client;

use crate::config::TuiConfig;
use crate::error::Result;
use crate::types::{EngineStatus, ScanResult};

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

    /// T906: Dry-run fix — simulate without writing files.
    pub async fn fix_dry_run(&self, selected: &[String]) -> Result<serde_json::Value> {
        let resp = self
            .client
            .post(format!("{}/fix", self.base_url))
            .json(&serde_json::json!({
                "checks": selected,
                "dry_run": true
            }))
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await?;
        let result = resp.json::<serde_json::Value>().await?;
        Ok(result)
    }

    /// Generic GET returning JSON — used for agent passport and other endpoints.
    pub async fn get_json(&self, endpoint: &str) -> Result<serde_json::Value> {
        let resp = self
            .client
            .get(format!("{}{endpoint}", self.base_url))
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await?;
        let result = resp.json::<serde_json::Value>().await?;
        Ok(result)
    }

    /// Generic POST with JSON body — used for report generation and other endpoints.
    pub async fn post_json(&self, endpoint: &str, body: &serde_json::Value) -> Result<serde_json::Value> {
        let resp = self
            .client
            .post(format!("{}{endpoint}", self.base_url))
            .json(body)
            .timeout(std::time::Duration::from_secs(30))
            .send()
            .await?;
        let result = resp.json::<serde_json::Value>().await?;
        Ok(result)
    }

}

