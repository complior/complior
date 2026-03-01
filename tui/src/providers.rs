use std::collections::HashMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[allow(dead_code)] // Used by provider_setup (wired, not yet called from main flow)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderEntry {
    pub api_key: String,
}

#[allow(dead_code)] // Used by provider_setup (wired, not yet called from main flow)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ProviderConfig {
    pub active_provider: String,
    pub active_model: String,
    pub providers: HashMap<String, ProviderEntry>,
}

impl Default for ProviderConfig {
    fn default() -> Self {
        Self {
            active_provider: String::new(),
            active_model: String::new(),
            providers: HashMap::new(),
        }
    }
}

#[allow(dead_code)] // Used by provider_setup (wired, not yet called from main flow)
pub struct ModelInfo {
    pub id: &'static str,
    pub display_name: &'static str,
    pub provider: &'static str,
}

#[allow(dead_code)] // Used by provider_setup (wired, not yet called from main flow)
pub fn available_models() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            id: "complior-zen-v1",
            display_name: "Complior Zen (Free)",
            provider: "complior",
        },
        ModelInfo {
            id: "claude-sonnet-4-5-20250929",
            display_name: "Claude Sonnet 4.5",
            provider: "anthropic",
        },
        ModelInfo {
            id: "claude-haiku-4-5-20251001",
            display_name: "Claude Haiku 4.5",
            provider: "anthropic",
        },
        ModelInfo {
            id: "claude-opus-4-6",
            display_name: "Claude Opus 4.6",
            provider: "anthropic",
        },
        ModelInfo {
            id: "gpt-4o",
            display_name: "GPT-4o",
            provider: "openai",
        },
        ModelInfo {
            id: "gpt-4o-mini",
            display_name: "GPT-4o Mini",
            provider: "openai",
        },
        ModelInfo {
            id: "o3-mini",
            display_name: "o3-mini",
            provider: "openai",
        },
        ModelInfo {
            id: "anthropic/claude-sonnet-4-5-20250929",
            display_name: "Claude Sonnet 4.5",
            provider: "openrouter",
        },
        ModelInfo {
            id: "openai/gpt-4o",
            display_name: "GPT-4o",
            provider: "openrouter",
        },
        ModelInfo {
            id: "meta-llama/llama-3.1-405b-instruct",
            display_name: "Llama 3.1 405B",
            provider: "openrouter",
        },
        ModelInfo {
            id: "mistralai/mixtral-8x7b-instruct",
            display_name: "Mixtral 8x7B",
            provider: "openrouter",
        },
        ModelInfo {
            id: "google/gemini-2.5-pro",
            display_name: "Gemini 2.5 Pro",
            provider: "openrouter",
        },
        ModelInfo {
            id: "deepseek/deepseek-r1",
            display_name: "DeepSeek R1",
            provider: "openrouter",
        },
    ]
}

#[allow(dead_code)] // Used by provider_setup (wired, not yet called from main flow)
pub fn models_for_provider(provider: &str) -> Vec<&'static ModelInfo> {
    // Leak the Vec so we can return references with 'static lifetime.
    // This is called infrequently and the catalog is small, so the leak is fine.
    let models: &'static Vec<ModelInfo> = Box::leak(Box::new(available_models()));
    models.iter().filter(|m| m.provider == provider).collect()
}

#[allow(dead_code)] // Used by provider_setup (wired, not yet called from main flow)
pub fn provider_config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from(".config"))
        .join("complior")
        .join("providers.toml")
}

#[allow(dead_code)] // Used by provider_setup (wired, not yet called from main flow)
pub fn load_provider_config() -> ProviderConfig {
    let path = provider_config_path();
    match std::fs::read_to_string(&path) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => ProviderConfig::default(),
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_provider_config() {
        let config = ProviderConfig::default();
        assert!(config.active_provider.is_empty());
        assert!(config.active_model.is_empty());
        assert!(config.providers.is_empty());
    }

    #[test]
    fn test_available_models_count() {
        let models = available_models();
        assert_eq!(models.len(), 13);
    }

    #[test]
    fn test_models_for_provider() {
        let anthropic = models_for_provider("anthropic");
        assert_eq!(anthropic.len(), 3);
        let openrouter = models_for_provider("openrouter");
        assert_eq!(openrouter.len(), 6);
    }

    #[test]
    fn test_provider_config_serialization() {
        let mut config = ProviderConfig::default();
        config.active_provider = "anthropic".to_string();
        config.active_model = "claude-opus-4-6".to_string();
        config.providers.insert(
            "anthropic".to_string(),
            ProviderEntry {
                api_key: "sk-ant-test".to_string(),
            },
        );

        let toml_str = toml::to_string_pretty(&config).expect("serialize");
        let loaded: ProviderConfig = toml::from_str(&toml_str).expect("deserialize");
        assert_eq!(loaded.active_provider, "anthropic");
        assert_eq!(loaded.active_model, "claude-opus-4-6");
        assert!(loaded.providers.contains_key("anthropic"));
    }
}
