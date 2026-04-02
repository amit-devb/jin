use serde_json::Value;
use std::collections::BTreeMap;

pub fn flatten_json(value: &Value) -> BTreeMap<String, Value> {
    fn walk(prefix: Option<String>, value: &Value, out: &mut BTreeMap<String, Value>) {
        match value {
            Value::Object(map) => {
                for (key, child) in map {
                    let next = match &prefix {
                        Some(prefix) => format!("{prefix}.{key}"),
                        None => key.clone(),
                    };
                    walk(Some(next), child, out);
                }
            }
            Value::Array(items) => {
                for (idx, child) in items.iter().enumerate() {
                    let next = match &prefix {
                        Some(prefix) => format!("{prefix}.{idx}"),
                        None => idx.to_string(),
                    };
                    walk(Some(next), child, out);
                }
            }
            _ => {
                if let Some(prefix) = prefix {
                    out.insert(prefix, value.clone());
                }
            }
        }
    }

    let mut out = BTreeMap::new();
    walk(None, value, &mut out);
    out
}

pub fn lookup_path(value: &Value, path: &str) -> Option<Value> {
    let mut current = value;
    for part in path.split('.') {
        match current {
            Value::Object(map) => current = map.get(part)?,
            _ => return None,
        }
    }
    Some(current.clone())
}

pub fn numeric_value(value: &Value) -> Option<f64> {
    match value {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s.parse().ok(),
        _ => None,
    }
}
