//! Interactive stdin-based question helpers for CLI onboarding.
//!
//! Drives the same question flow as the TUI onboarding wizard, but via
//! simple numbered prompts on stdin/stdout. Used by `complior init`.

use std::io::{self, BufRead, Write};

use super::format::colors::{bold, cyan, dim, yellow};
use super::format::separator;

/// Format a description, highlighting "HIGH RISK" in yellow.
fn format_description(desc: &str) -> String {
    if desc.contains("HIGH RISK") {
        let highlighted = desc.replace("HIGH RISK", &yellow("HIGH RISK"));
        dim(&highlighted)
    } else {
        dim(desc)
    }
}

/// Ask a single-choice question. Returns the selected option value.
pub fn ask_single(
    text: &str,
    options: &[(String, String)],
    descriptions: &serde_json::Map<String, serde_json::Value>,
    default: Option<&str>,
) -> String {
    println!("\n  {text}");

    // Find default index
    let default_idx = default
        .and_then(|d| options.iter().position(|(v, _)| v == d))
        .unwrap_or(0);

    for (i, (value, label)) in options.iter().enumerate() {
        let suffix = if i == default_idx {
            format!("  {}", cyan("(default)"))
        } else {
            String::new()
        };
        println!("    {}. {}{}", i + 1, label, suffix);
        // Show description if available
        if let Some(desc) = descriptions.get(value).and_then(|v| v.as_str()) {
            println!("       {}", format_description(desc));
        }
    }

    loop {
        print!("  Choice [{}]: ", default_idx + 1);
        io::stdout().flush().ok();

        let mut line = String::new();
        if io::stdin().lock().read_line(&mut line).is_err() || line.trim().is_empty() {
            return options[default_idx].0.clone();
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return options[default_idx].0.clone();
        }
        if let Ok(n) = trimmed.parse::<usize>()
            && n >= 1
            && n <= options.len()
        {
            return options[n - 1].0.clone();
        }
        println!("    Please enter a number between 1 and {}.", options.len());
    }
}

/// Ask a multi-choice question. Returns selected option values.
pub fn ask_multi(
    text: &str,
    options: &[(String, String)],
    descriptions: &serde_json::Map<String, serde_json::Value>,
) -> Vec<String> {
    println!("\n  {text}");
    println!("  {}", dim("(comma-separated, e.g. 1,3)"));

    for (i, (value, label)) in options.iter().enumerate() {
        let suffix = if let Some(desc) = descriptions.get(value).and_then(|v| v.as_str()) {
            if desc.contains("HIGH RISK") {
                format!("   {}", yellow("\u{26a0} HIGH RISK"))
            } else {
                String::new()
            }
        } else {
            String::new()
        };
        println!("    {}. {}{}", i + 1, label, suffix);
    }

    loop {
        print!("  Choices: ");
        io::stdout().flush().ok();

        let mut line = String::new();
        if io::stdin().lock().read_line(&mut line).is_err() || line.trim().is_empty() {
            // Default: first option
            return vec![options.first().map(|(v, _)| v.clone()).unwrap_or_default()];
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return vec![options.first().map(|(v, _)| v.clone()).unwrap_or_default()];
        }

        let mut selected = Vec::new();
        let mut valid = true;
        for part in trimmed.split(',') {
            match part.trim().parse::<usize>() {
                Ok(n) if n >= 1 && n <= options.len() => {
                    selected.push(options[n - 1].0.clone());
                }
                _ => {
                    valid = false;
                    break;
                }
            }
        }

        if valid && !selected.is_empty() {
            return selected;
        }
        println!(
            "    Please enter valid numbers between 1 and {}.",
            options.len()
        );
    }
}

/// Ask a free-text question. Returns the input or default.
pub fn ask_text(text: &str, default: Option<&str>) -> String {
    let default_hint = default.map(|d| format!(" [{d}]")).unwrap_or_default();
    print!("\n  {text}{default_hint}: ");
    io::stdout().flush().ok();

    let mut line = String::new();
    if io::stdin().lock().read_line(&mut line).is_err() || line.trim().is_empty() {
        return default.unwrap_or_default().to_string();
    }
    let trimmed = line.trim();
    if trimmed.is_empty() {
        default.unwrap_or_default().to_string()
    } else {
        trimmed.to_string()
    }
}

/// Drive the full onboarding flow from engine question blocks JSON.
///
/// Expected format from `GET /onboarding/questions`:
/// ```json
/// { "blocks": [{ "id": "...", "title": "...", "questions": [...] }] }
/// ```
///
/// Returns a flat `{ "question_id": "answer_value" }` map suitable for
/// `POST /onboarding/complete`.
pub fn run_interactive_onboarding(questions_json: &serde_json::Value) -> serde_json::Value {
    let mut answers = serde_json::Map::new();

    let blocks = match questions_json.get("blocks").and_then(|b| b.as_array()) {
        Some(b) => b,
        None => return serde_json::Value::Object(answers),
    };

    for block in blocks {
        let title = block.get("title").and_then(|t| t.as_str()).unwrap_or("");
        println!("\n  {}", bold(&title.to_uppercase()));
        println!("  {}", separator());

        let questions = match block.get("questions").and_then(|q| q.as_array()) {
            Some(q) => q,
            None => continue,
        };

        for question in questions {
            let id = question.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let text = question.get("text").and_then(|v| v.as_str()).unwrap_or("");
            let qtype = question
                .get("type")
                .and_then(|v| v.as_str())
                .unwrap_or("single");
            let default = question.get("default").and_then(|v| v.as_str());
            let descriptions = question
                .get("descriptions")
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or_default();

            let options: Vec<(String, String)> = question
                .get("options")
                .and_then(|o| o.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|opt| {
                            let value = opt.get("value")?.as_str()?.to_string();
                            let label = opt.get("label")?.as_str()?.to_string();
                            Some((value, label))
                        })
                        .collect()
                })
                .unwrap_or_default();

            match qtype {
                "single" => {
                    let answer = ask_single(text, &options, &descriptions, default);
                    answers.insert(id.to_string(), serde_json::Value::String(answer));
                }
                "multi" => {
                    let selected = ask_multi(text, &options, &descriptions);
                    let arr: Vec<serde_json::Value> = selected
                        .into_iter()
                        .map(serde_json::Value::String)
                        .collect();
                    answers.insert(id.to_string(), serde_json::Value::Array(arr));
                }
                "text" => {
                    let answer = ask_text(text, default);
                    answers.insert(id.to_string(), serde_json::Value::String(answer));
                }
                _ => {}
            }
        }
    }

    serde_json::Value::Object(answers)
}

/// Build default answers from question blocks (for --yes / non-TTY mode).
pub fn build_default_answers(questions_json: &serde_json::Value) -> serde_json::Value {
    let mut answers = serde_json::Map::new();

    let blocks = match questions_json.get("blocks").and_then(|b| b.as_array()) {
        Some(b) => b,
        None => return serde_json::Value::Object(answers),
    };

    for block in blocks {
        let questions = match block.get("questions").and_then(|q| q.as_array()) {
            Some(q) => q,
            None => continue,
        };

        for question in questions {
            let id = question.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let qtype = question
                .get("type")
                .and_then(|v| v.as_str())
                .unwrap_or("single");
            let default = question.get("default").and_then(|v| v.as_str());

            match qtype {
                "single" | "text" => {
                    let value = default
                        .or_else(|| {
                            question
                                .get("options")
                                .and_then(|o| o.as_array())
                                .and_then(|arr| arr.first())
                                .and_then(|opt| opt.get("value"))
                                .and_then(|v| v.as_str())
                        })
                        .unwrap_or("");
                    answers.insert(id.to_string(), serde_json::Value::String(value.to_string()));
                }
                "multi" => {
                    let value = default
                        .or_else(|| {
                            question
                                .get("options")
                                .and_then(|o| o.as_array())
                                .and_then(|arr| arr.first())
                                .and_then(|opt| opt.get("value"))
                                .and_then(|v| v.as_str())
                        })
                        .unwrap_or("");
                    answers.insert(
                        id.to_string(),
                        serde_json::Value::Array(vec![serde_json::Value::String(
                            value.to_string(),
                        )]),
                    );
                }
                _ => {}
            }
        }
    }

    serde_json::Value::Object(answers)
}

/// V1-M28: Load `[onboarding_answers]` table from `.complior/project.toml`.
///
/// Returns `Some(serde_json::Value)` with the answers map if:
///   - `project_toml_path` exists and contains `[onboarding_answers]`
///   - the section is non-empty
///
/// Returns `None` if the file or section is absent/malformed.
/// The returned JSON is suitable for `POST /onboarding/complete { answers }`.
pub fn load_onboarding_answers_from_toml(
    project_toml_path: &std::path::Path,
) -> Option<serde_json::Value> {
    let content = std::fs::read_to_string(project_toml_path).ok()?;
    let parsed: toml::Value = content.parse().ok()?;

    let section = parsed.get("onboarding_answers")?;
    let table = section.as_table()?;

    // Convert TOML table to serde_json::Object
    fn to_json(val: &toml::Value) -> serde_json::Value {
        match val {
            toml::Value::String(s) => serde_json::Value::String(s.clone()),
            toml::Value::Integer(i) => serde_json::Value::Number((*i).into()),
            toml::Value::Float(f) => serde_json::Number::from_f64(*f)
                .map_or(serde_json::Value::Null, serde_json::Value::Number),
            toml::Value::Boolean(b) => serde_json::Value::Bool(*b),
            toml::Value::Array(arr) => serde_json::Value::Array(arr.iter().map(to_json).collect()),
            toml::Value::Table(t) => {
                serde_json::Value::Object(t.iter().map(|(k, v)| (k.clone(), to_json(v))).collect())
            }
            toml::Value::Datetime(dt) => serde_json::Value::String(dt.to_string()),
        }
    }

    let obj: serde_json::Map<String, serde_json::Value> =
        table.iter().map(|(k, v)| (k.clone(), to_json(v))).collect();
    if obj.is_empty() {
        return None;
    }
    Some(serde_json::Value::Object(obj))
}
