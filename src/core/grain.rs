use crate::core::json::lookup_path;
use crate::core::types::RequestPayload;
use serde_json::Value;
use std::collections::BTreeMap;

const TECHNICAL_GRAIN_FIELDS: &[&str] = &["api_version", "label", "timestamp", "_jin_id"];

fn field_leaf(field: &str) -> &str {
    field
        .trim()
        .trim_end_matches("[]")
        .split('.')
        .next_back()
        .unwrap_or(field)
}

fn is_technical_grain_field(field: &str) -> bool {
    let leaf = field_leaf(field);
    TECHNICAL_GRAIN_FIELDS
        .iter()
        .any(|candidate| candidate == &leaf)
}

pub fn canonical_grain_key(grain_key: &str) -> String {
    if !grain_key.contains('|') {
        return grain_key.to_string();
    }

    let mut parts = grain_key.split('|');
    let endpoint = parts.next().unwrap_or_default();
    let mut normalized_parts: Vec<String> = parts
        .filter_map(|part| {
            let mut kv = part.splitn(2, '=');
            let key = kv.next().unwrap_or_default().trim();
            let value = kv.next().unwrap_or_default();
            if key.is_empty() || is_technical_grain_field(key) {
                return None;
            }
            Some(format!("{key}={value}"))
        })
        .collect();
    normalized_parts.sort();
    if normalized_parts.is_empty() {
        endpoint.to_string()
    } else {
        format!("{endpoint}|{}", normalized_parts.join("|"))
    }
}

pub fn lookup_dimension(
    method: &str,
    request: &RequestPayload,
    response_flat: &BTreeMap<String, Value>,
    field: &str,
) -> Option<String> {
    let sources = match method {
        "GET" => [
            &request.path,
            &request.query,
            &request.body,
            &request.headers,
        ],
        "POST" => [
            &request.body,
            &request.path,
            &request.query,
            &request.headers,
        ],
        _ => [
            &request.path,
            &request.body,
            &request.query,
            &request.headers,
        ],
    };

    for source in sources {
        if let Some(value) = lookup_path(source, field) {
            match value {
                Value::String(s) => return Some(s),
                Value::Number(n) => return Some(n.to_string()),
                Value::Bool(b) => return Some(b.to_string()),
                _ => {}
            }
        }
    }

    response_flat.get(field).and_then(|value| match value {
        Value::String(s) => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        Value::Bool(b) => Some(b.to_string()),
        _ => None,
    })
}

pub fn build_grain_key(endpoint: &str, dims: &BTreeMap<String, String>) -> String {
    if dims.is_empty() {
        return endpoint.to_string();
    }
    let suffix = dims
        .iter()
        .map(|(key, value)| format!("{key}={value}"))
        .collect::<Vec<_>>()
        .join("|");
    format!("{endpoint}|{suffix}")
}
