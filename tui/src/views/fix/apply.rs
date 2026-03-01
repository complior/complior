use std::path::Path;

use crate::types::{Finding, FindingType};

/// Result of applying a single fix.
pub struct ApplyResult {
    pub success: bool,
    pub detail: String,
}

/// Apply a single finding's fix to the filesystem.
///
/// - Type A/C with `fix_diff`: replaces lines in existing file, adds import if needed.
/// - Type B (missing doc): creates the file with proposed content.
/// - Fallback: returns error if no structured fix data available.
pub fn apply_fix_to_file(project_path: &Path, finding: &Finding) -> ApplyResult {
    let check_id = finding.check_id.clone();
    let ft = finding.finding_type();

    // Type B: create new document
    if ft == FindingType::B && finding.file.is_none() {
        let rel = infer_doc_path(&check_id);
        let abs = project_path.join(&rel);
        if abs.exists() {
            return ApplyResult {
                success: false,
                detail: format!("{rel} already exists"),
            };
        }
        // Ensure parent dir exists
        if let Some(parent) = abs.parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                return ApplyResult {
                    success: false,
                    detail: format!("mkdir failed: {e}"),
                };
            }
        }
        let content = finding.fix.as_deref().unwrap_or("");
        match std::fs::write(&abs, content) {
            Ok(()) => ApplyResult {
                success: true,
                detail: format!("Created {rel}"),
            },
            Err(e) => ApplyResult {
                success: false,
                detail: format!("write failed: {e}"),
            },
        }
    } else if let Some(diff) = &finding.fix_diff {
        // Type A/C: apply structured diff
        let abs = project_path.join(&diff.file_path);
        let content = match std::fs::read_to_string(&abs) {
            Ok(c) => c,
            Err(e) => {
                return ApplyResult {
                    success: false,
                    detail: format!("read failed: {e}"),
                };
            }
        };

        let mut lines: Vec<String> = content.lines().map(String::from).collect();
        let start = (diff.start_line as usize).saturating_sub(1);
        let end = start + diff.before.len();

        // Validate that before-lines match the file content
        if end > lines.len() {
            return ApplyResult {
                success: false,
                detail: "Line range out of bounds".to_string(),
            };
        }
        let file_slice: Vec<&str> = lines[start..end].iter().map(|s| s.trim()).collect();
        let expected: Vec<&str> = diff.before.iter().map(|s| s.trim()).collect();
        if file_slice != expected {
            return ApplyResult {
                success: false,
                detail: "File content changed since scan — re-scan first".to_string(),
            };
        }

        // Replace lines
        let after: Vec<String> = diff.after.iter().cloned().collect();
        lines.splice(start..end, after);

        // Add import line if needed
        if let Some(import) = &diff.import_line {
            // Check it's not already present
            if !lines.iter().any(|l| l.contains(import.as_str())) {
                // Insert after the last existing import
                let insert_at = lines
                    .iter()
                    .rposition(|l| l.starts_with("import "))
                    .map_or(0, |i| i + 1);
                lines.insert(insert_at, import.clone());
            }
        }

        // Write back
        let output = lines.join("\n");
        // Preserve trailing newline if original had one
        let final_output = if content.ends_with('\n') && !output.ends_with('\n') {
            output + "\n"
        } else {
            output
        };

        match std::fs::write(&abs, final_output) {
            Ok(()) => ApplyResult {
                success: true,
                detail: format!("Modified {}", diff.file_path),
            },
            Err(e) => ApplyResult {
                success: false,
                detail: format!("write failed: {e}"),
            },
        }
    } else {
        ApplyResult {
            success: false,
            detail: "No structured fix available — manual action required".to_string(),
        }
    }
}

/// Infer a target document path from a check_id for Type B findings.
pub(super) fn infer_doc_path(check_id: &str) -> String {
    match check_id {
        "l2-fria" => "docs/fria.md".to_string(),
        "l2-transparency" => "docs/transparency.md".to_string(),
        "l2-risk-management" => "docs/risk-management.md".to_string(),
        "l2-data-governance" => "docs/data-governance.md".to_string(),
        "l2-human-oversight" => "docs/human-oversight.md".to_string(),
        "l2-accuracy" => "docs/accuracy-robustness.md".to_string(),
        "l2-logging" => "docs/logging-policy.md".to_string(),
        "l2-conformity" => "docs/conformity-assessment.md".to_string(),
        "l1-readme" => "README.md".to_string(),
        _ => {
            // Extract meaningful suffix: "l2-foo-bar" -> "docs/foo-bar.md"
            let suffix = check_id.split('-').skip(1).collect::<Vec<_>>().join("-");
            if suffix.is_empty() {
                "docs/document.md".to_string()
            } else {
                format!("docs/{suffix}.md")
            }
        }
    }
}
