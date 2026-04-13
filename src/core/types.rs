use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub enum LicenseTier {
    Starter,  // 1 Project Free
    Pro,      // Paid
    Business, // Enterprise
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[allow(dead_code)]
pub struct LicenseMeta {
    pub site_id: String,
    pub tier: LicenseTier,
    pub project_limit: u32,
    pub projects_active: u32,
    pub trust_score: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    pub dimension_fields: Vec<String>,
    pub kpi_fields: Vec<String>,
    #[serde(default = "default_tolerance")]
    pub tolerance_pct: f64,
    #[serde(default = "default_relaxed_tolerance")]
    pub tolerance_relaxed: f64,
    #[serde(default = "default_tolerance")]
    pub tolerance_normal: f64,
    #[serde(default = "default_strict_tolerance")]
    pub tolerance_strict: f64,
    #[serde(default = "default_active_tolerance")]
    pub active_tolerance: String,
    #[serde(default)]
    pub confirmed: bool,
    #[serde(default)]
    pub kpi_weights: std::collections::HashMap<String, f64>,
    #[allow(dead_code)]
    #[serde(default = "default_currency")]
    pub currency: String,
    #[serde(default)]
    pub time_field: Option<String>,
    #[serde(default)]
    pub rows_path: Option<String>,
    #[serde(default)]
    pub time_end_field: Option<String>,
    #[serde(default = "default_time_profile")]
    pub time_profile: String,
    #[serde(default = "default_granularity")]
    pub time_granularity: String,
    #[serde(default = "default_extraction_rule")]
    pub time_extraction_rule: String,
    #[serde(default)]
    pub time_format: Option<String>,
    #[serde(default)]
    pub time_pin: bool,
}

pub fn default_granularity() -> String {
    "minute".to_string()
}

pub fn default_time_profile() -> String {
    "auto".to_string()
}

pub fn default_extraction_rule() -> String {
    "single".to_string()
}

#[derive(Debug, Deserialize)]
pub struct RequestPayload {
    #[serde(default)]
    pub path: Value,
    #[serde(default)]
    pub query: Value,
    #[serde(default)]
    pub body: Value,
    #[serde(default)]
    pub headers: Value,
}

#[derive(Debug, Serialize, Clone)]
pub struct AnomalyResult {
    pub kpi_field: String,
    pub actual: f64,
    pub expected: f64,
    pub pct_change: f64,
    pub method: String,
    pub severity: String,
    pub priority: String, // "P0", "P1", etc.
    #[serde(default)]
    pub correlated_with: Vec<String>, // IDs or names of related anomalies
    pub confidence: f64,
    pub impact: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct ComparisonResult {
    pub kpi_field: String,
    pub actual: f64,
    pub expected: Option<f64>,
    pub delta: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delta_pct: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tolerance_pct: Option<f64>,
    pub reconciliation_status: String,
    pub reason: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ReconciliationSummary {
    pub total_checks: usize,
    pub matched: usize,
    pub mismatched: usize,
    pub missing_reference: usize,
}

#[derive(Debug, Serialize)]
pub struct ProcessResult {
    pub grain_key: String,
    pub status: String,
    pub dimension_json: Value,
    pub kpi_json: Value,
    pub anomalies: Vec<AnomalyResult>,
    pub comparisons: Vec<ComparisonResult>,
    pub reconciliation: ReconciliationSummary,
}

pub fn default_tolerance() -> f64 {
    10.0
}

pub fn default_relaxed_tolerance() -> f64 {
    20.0
}

pub fn default_strict_tolerance() -> f64 {
    5.0
}

pub fn default_active_tolerance() -> String {
    "normal".to_string()
}

pub fn default_currency() -> String {
    "$".to_string()
}
