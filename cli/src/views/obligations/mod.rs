mod render;

#[cfg(test)]
mod tests;

pub use render::render_obligations_view;

/// Filter for the obligations list.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ObligationFilter {
    All,
    RoleProvider,
    RoleDeployer,
    RiskHigh,
    RiskLimited,
    CoveredOnly,
    UncoveredOnly,
    SeverityCritical,
}

impl ObligationFilter {
    /// Cycle to the next filter on key press.
    pub fn cycle(self) -> Self {
        match self {
            Self::All => Self::RoleProvider,
            Self::RoleProvider => Self::RoleDeployer,
            Self::RoleDeployer => Self::RiskHigh,
            Self::RiskHigh => Self::RiskLimited,
            Self::RiskLimited => Self::CoveredOnly,
            Self::CoveredOnly => Self::UncoveredOnly,
            Self::UncoveredOnly => Self::SeverityCritical,
            Self::SeverityCritical => Self::All,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::All => "All",
            Self::RoleProvider => "Provider",
            Self::RoleDeployer => "Deployer",
            Self::RiskHigh => "High Risk",
            Self::RiskLimited => "Limited Risk",
            Self::CoveredOnly => "Covered",
            Self::UncoveredOnly => "Uncovered",
            Self::SeverityCritical => "Critical",
        }
    }
}

/// A single obligation item loaded from the engine.
#[derive(Debug, Clone)]
pub struct ObligationItem {
    pub id: String,
    pub article: String,
    pub title: String,
    pub role: String,
    pub risk_levels: Vec<String>,
    pub severity: String,
    pub deadline: Option<String>,
    pub obligation_type: String,
    pub covered: bool,
    pub description: String,
    pub linked_checks: Vec<String>,
}

impl ObligationItem {
    /// Whether this obligation is on the critical path (uncovered + has deadline).
    pub fn is_critical_path(&self) -> bool {
        !self.covered && self.deadline.is_some()
    }
}

/// State for the Obligations View.
#[derive(Debug, Clone)]
pub struct ObligationsViewState {
    pub obligations: Vec<ObligationItem>,
    pub selected_index: usize,
    pub scroll_offset: usize,
    pub filter: ObligationFilter,
}

impl Default for ObligationsViewState {
    fn default() -> Self {
        Self {
            obligations: Vec::new(),
            selected_index: 0,
            scroll_offset: 0,
            filter: ObligationFilter::All,
        }
    }
}

impl ObligationsViewState {
    /// Get filtered obligations based on current filter.
    pub fn filtered_obligations(&self) -> Vec<&ObligationItem> {
        self.obligations
            .iter()
            .filter(|o| match self.filter {
                ObligationFilter::All => true,
                ObligationFilter::RoleProvider => o.role == "provider" || o.role == "both",
                ObligationFilter::RoleDeployer => o.role == "deployer" || o.role == "both",
                ObligationFilter::RiskHigh => {
                    o.risk_levels.iter().any(|r| r == "high" || r == "unacceptable")
                }
                ObligationFilter::RiskLimited => {
                    o.risk_levels.iter().any(|r| r == "limited" || r == "minimal")
                }
                ObligationFilter::CoveredOnly => o.covered,
                ObligationFilter::UncoveredOnly => !o.covered,
                ObligationFilter::SeverityCritical => o.severity == "critical",
            })
            .collect()
    }

    /// Count of covered obligations.
    pub fn covered_count(&self) -> usize {
        self.obligations.iter().filter(|o| o.covered).count()
    }

    /// Count of critical-path obligations (uncovered + has deadline).
    pub fn critical_path_count(&self) -> usize {
        self.obligations
            .iter()
            .filter(|o| !o.covered && o.deadline.is_some())
            .count()
    }

    /// Load obligations from engine JSON response.
    pub fn load_from_json(&mut self, data: &[serde_json::Value]) {
        self.obligations = data
            .iter()
            .filter_map(|v| {
                Some(ObligationItem {
                    id: v.get("id")?.as_str()?.to_string(),
                    article: v.get("article")?.as_str()?.to_string(),
                    title: v.get("title")?.as_str()?.to_string(),
                    role: v.get("role")?.as_str().unwrap_or("both").to_string(),
                    risk_levels: v
                        .get("risk_levels")
                        .and_then(|r| r.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str().map(String::from))
                                .collect()
                        })
                        .unwrap_or_default(),
                    severity: v.get("severity")?.as_str().unwrap_or("medium").to_string(),
                    deadline: v.get("deadline").and_then(|d| d.as_str()).map(String::from),
                    obligation_type: v
                        .get("obligation_type")
                        .and_then(|t| t.as_str())
                        .unwrap_or("")
                        .to_string(),
                    covered: v.get("covered").and_then(|c| c.as_bool()).unwrap_or(false),
                    description: v
                        .get("description")
                        .and_then(|d| d.as_str())
                        .unwrap_or("")
                        .to_string(),
                    linked_checks: v
                        .get("linked_checks")
                        .and_then(|lc| lc.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str().map(String::from))
                                .collect()
                        })
                        .unwrap_or_default(),
                })
            })
            .collect();
        self.selected_index = 0;
        self.scroll_offset = 0;
    }
}
