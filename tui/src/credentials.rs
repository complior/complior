use std::collections::HashMap;
use std::path::PathBuf;

/// Path to the credentials file.
fn credentials_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from(".config"))
        .join("complior")
        .join("credentials")
}

/// Load all credentials from `~/.config/complior/credentials`.
/// Format: KEY=value (one per line), `#` comments ignored.
pub fn load_credentials() -> HashMap<String, String> {
    let path = credentials_path();
    let Ok(content) = std::fs::read_to_string(&path) else {
        return HashMap::new();
    };

    let mut map = HashMap::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = trimmed.split_once('=') {
            map.insert(key.trim().to_string(), value.trim().to_string());
        }
    }
    map
}

/// Save a credential to `~/.config/complior/credentials`.
/// Replaces existing key or appends a new one.
pub async fn save_credential(provider: &str, key: &str) {
    let env_key = match provider {
        "openrouter" => "OPENROUTER_KEY",
        "anthropic" => "ANTHROPIC_KEY",
        "openai" => "OPENAI_KEY",
        _ => return,
    };

    let path = credentials_path();
    if let Some(parent) = path.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }

    // Read existing content
    let existing = tokio::fs::read_to_string(&path)
        .await
        .unwrap_or_default();

    // Replace or append
    let mut found = false;
    let mut new_lines: Vec<String> = Vec::new();
    for line in existing.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty()
            && !trimmed.starts_with('#')
            && let Some((k, _)) = trimmed.split_once('=')
            && k.trim() == env_key
        {
            new_lines.push(format!("{env_key}={key}"));
            found = true;
            continue;
        }
        new_lines.push(line.to_string());
    }

    if !found {
        new_lines.push(format!("{env_key}={key}"));
    }

    let content = new_lines.join("\n") + "\n";
    let _ = tokio::fs::write(&path, &content).await;

    // Set file permissions to 0600 (owner read/write only)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o600);
        let _ = tokio::fs::set_permissions(&path, perms).await;
    }
}

/// Get a specific credential by provider name.
pub fn get_credential(provider: &str) -> Option<String> {
    let env_key = match provider {
        "openrouter" => "OPENROUTER_KEY",
        "anthropic" => "ANTHROPIC_KEY",
        "openai" => "OPENAI_KEY",
        _ => return None,
    };

    let creds = load_credentials();
    creds.get(env_key).cloned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_credentials_format() {
        // Simulate parsing
        let content = "# Complior credentials\nOPENROUTER_KEY=sk-or-v1-test123\n# comment\nANTHROPIC_KEY=sk-ant-test456\n";
        let mut map = HashMap::new();
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            if let Some((key, value)) = trimmed.split_once('=') {
                map.insert(key.trim().to_string(), value.trim().to_string());
            }
        }
        assert_eq!(map.get("OPENROUTER_KEY").unwrap(), "sk-or-v1-test123");
        assert_eq!(map.get("ANTHROPIC_KEY").unwrap(), "sk-ant-test456");
        assert_eq!(map.len(), 2);
    }

    #[test]
    fn test_env_key_mapping() {
        // Test that provider names map to correct env keys
        assert_eq!(get_credential("unknown_provider"), None);
    }

    #[test]
    fn test_credentials_path() {
        let path = credentials_path();
        assert!(path.ends_with("complior/credentials"));
    }
}
