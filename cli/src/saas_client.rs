use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct DeviceCodeResponse {
    #[serde(rename = "deviceCode")]
    pub device_code: String,
    #[serde(rename = "userCode")]
    pub user_code: String,
    #[serde(rename = "verificationUri")]
    pub verification_uri: String,
    #[serde(rename = "expiresIn")]
    pub expires_in: u64,
    pub interval: u64,
}

// SaaS token poll returns either:
//   {"error":"authorization_pending"} or {"error":"expired_token"}
//   {"accessToken":"...","refreshToken":"...","expiresIn":3600,"tokenType":"Bearer",
//    "userEmail":"user@example.com","orgName":"Acme Corp"}
// Note: userEmail and orgName should be added to the SaaS /api/auth/token response.
// Fallback: JWT claims (email, orgName) → GET /api/auth/me
#[derive(Debug)]
pub enum TokenPollResult {
    Pending,
    Success {
        access_token: String,
        refresh_token: String,
        expires_in: u64,
        user_email: Option<String>,
        org_name: Option<String>,
    },
    Expired,
}

#[derive(Debug, Deserialize)]
struct TokenSuccessResponse {
    #[serde(rename = "accessToken")]
    access_token: String,
    #[serde(rename = "refreshToken")]
    refresh_token: String,
    #[serde(rename = "expiresIn")]
    expires_in: u64,
    #[serde(rename = "userEmail")]
    user_email: Option<String>,
    #[serde(rename = "orgName")]
    org_name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct SyncResult {
    pub action: String,
    #[serde(rename = "toolId")]
    pub tool_id: Option<i64>,
    pub conflicts: Option<Vec<serde_json::Value>>,
    #[serde(rename = "fieldsUpdated")]
    pub fields_updated: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct SyncScanResult {
    pub processed: i64,
    pub tools: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct SyncStatusResult {
    pub stats: SyncStats,
    #[serde(rename = "recentHistory")]
    pub recent_history: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SyncStats {
    #[serde(rename = "totalSyncs")]
    pub total_syncs: i64,
    #[serde(rename = "passportSyncs")]
    pub passport_syncs: i64,
    #[serde(rename = "scanSyncs")]
    pub scan_syncs: i64,
    #[serde(rename = "lastSyncAt")]
    pub last_sync_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct SyncDocResult {
    pub synced: i64,
    pub created: i64,
    pub updated: i64,
}

pub struct SaasClient {
    client: reqwest::Client,
    base_url: String,
}

impl SaasClient {
    pub fn new(base_url: &str) -> Result<Self, String> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {e}"))?;
        Ok(Self {
            client,
            base_url: base_url.trim_end_matches('/').to_string(),
        })
    }

    pub async fn request_device_code(&self) -> Result<DeviceCodeResponse, String> {
        let url = format!("{}/api/auth/device", self.base_url);
        let resp = self.client.post(&url)
            .header("Content-Type", "application/json")
            .body("{}")
            .send()
            .await
            .map_err(|e| format!("Failed to connect to SaaS: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Device code request failed ({status}): {body}"));
        }
        resp.json().await.map_err(|e| format!("Failed to parse device code response: {e}"))
    }

    pub async fn poll_token(&self, device_code: &str) -> Result<TokenPollResult, String> {
        let url = format!("{}/api/auth/token", self.base_url);
        let resp = self.client.post(&url)
            .json(&serde_json::json!({ "deviceCode": device_code }))
            .send()
            .await
            .map_err(|e| format!("Token poll failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Token poll failed ({status}): {body}"));
        }
        let body: serde_json::Value = resp.json().await
            .map_err(|e| format!("Failed to parse token response: {e}"))?;

        // Check for error field (pending/expired)
        if let Some(err) = body.get("error").and_then(|v| v.as_str()) {
            return match err {
                "authorization_pending" => Ok(TokenPollResult::Pending),
                "expired_token" => Ok(TokenPollResult::Expired),
                other => Err(format!("Token poll error: {other}")),
            };
        }

        // Parse as success response
        let success: TokenSuccessResponse = serde_json::from_value(body)
            .map_err(|e| format!("Failed to parse token success: {e}"))?;

        // Try 3 sources for user info: response body → JWT claims → /auth/me
        let (mut email, mut org) = (success.user_email.clone(), success.org_name.clone());
        if email.is_none() && org.is_none() {
            let (je, jo) = extract_jwt_claims(&success.access_token);
            email = je;
            org = jo;
        }
        if email.is_none() && org.is_none() {
            let (me, mo) = self.fetch_user_info(&success.access_token).await;
            email = me;
            org = mo;
        }

        Ok(TokenPollResult::Success {
            access_token: success.access_token,
            refresh_token: success.refresh_token,
            expires_in: success.expires_in,
            user_email: email,
            org_name: org,
        })
    }

    /// Fetch user profile from `SaaS` (email, org name).
    pub async fn fetch_user_info(&self, token: &str) -> (Option<String>, Option<String>) {
        let url = format!("{}/api/auth/me", self.base_url);
        let resp = match self.client.get(&url).bearer_auth(token).send().await {
            Ok(r) if r.status().is_success() => r,
            _ => return (None, None),
        };
        let body: serde_json::Value = match resp.json().await {
            Ok(v) => v,
            Err(_) => return (None, None),
        };
        let email = body.get("email")
            .or_else(|| body.get("userEmail"))
            .and_then(|v| v.as_str())
            .map(std::string::ToString::to_string);
        let org = body.get("orgName")
            .or_else(|| body.get("organizationName"))
            .or_else(|| body.get("org_name"))
            .and_then(|v| v.as_str())
            .map(std::string::ToString::to_string);
        (email, org)
    }

    #[allow(dead_code)]
    pub async fn sync_status(&self, token: &str) -> Result<SyncStatusResult, String> {
        let url = format!("{}/api/sync/status", self.base_url);
        let resp = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await
            .map_err(|e| format!("Sync status request failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Sync status failed ({status}): {body}"));
        }
        resp.json().await.map_err(|e| format!("Failed to parse sync status: {e}"))
    }
}

/// Extract email and org from JWT access token payload (base64url-decoded claims).
/// JWT format: header.payload.signature — payload is base64url-encoded JSON.
fn extract_jwt_claims(token: &str) -> (Option<String>, Option<String>) {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return (None, None);
    }
    let payload = match base64url_decode(parts[1]) {
        Some(bytes) => bytes,
        None => return (None, None),
    };
    let claims: serde_json::Value = match serde_json::from_slice(&payload) {
        Ok(v) => v,
        Err(_) => return (None, None),
    };
    let email = claims.get("email")
        .or_else(|| claims.get("userEmail"))
        .or_else(|| claims.get("sub"))
        .and_then(|v| v.as_str())
        .filter(|s| s.contains('@')) // sub may be a UUID, only use if it looks like email
        .map(std::string::ToString::to_string);
    let org = claims.get("orgName")
        .or_else(|| claims.get("org_name"))
        .or_else(|| claims.get("organization"))
        .and_then(|v| v.as_str())
        .map(std::string::ToString::to_string);
    (email, org)
}

/// Decode base64url (no padding) to bytes.
fn base64url_decode(input: &str) -> Option<Vec<u8>> {
    use base64::engine::{general_purpose::URL_SAFE_NO_PAD, Engine};
    URL_SAFE_NO_PAD.decode(input).ok()
}
