use crate::cli::DocAction;
use crate::config::TuiConfig;

use super::common::{ensure_engine, resolve_project_path_buf};

const VALID_DOC_TYPES: &[&str] = &[
    "ai-literacy",
    "art5-screening",
    "technical-documentation",
    "incident-report",
    "declaration-of-conformity",
    "monitoring-policy",
    "fria",
    "worker-notification",
    "risk-management",
    "data-governance",
    "qms",
    "instructions-for-use",
    "gpai-transparency",
    "gpai-systemic-risk",
    "iso42001-ai-policy",
    "iso42001-soa",
    "iso42001-risk-register",
];

pub async fn run_doc_command(action: &DocAction, config: &TuiConfig) -> i32 {
    match action {
        DocAction::Generate {
            name,
            doc_type,
            all,
            organization,
            json,
            path,
        } => {
            run_doc_generate(
                name,
                doc_type.as_deref(),
                *all,
                organization.as_deref(),
                *json,
                path.as_deref(),
                config,
            )
            .await
        }
    }
}

async fn run_doc_generate(
    name: &str,
    doc_type: Option<&str>,
    all: bool,
    organization: Option<&str>,
    json: bool,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    // Validate: must specify --type or --all
    if !all && doc_type.is_none() {
        eprintln!("Error: Must specify --type <type> or --all");
        eprintln!("Valid types: {}", VALID_DOC_TYPES.join(", "));
        return 1;
    }

    // Validate doc type if provided
    if let Some(dt) = doc_type
        && !VALID_DOC_TYPES.contains(&dt)
    {
        eprintln!("Error: Invalid document type: {dt}");
        eprintln!("Valid types: {}", VALID_DOC_TYPES.join(", "));
        return 1;
    }

    let project_path = resolve_project_path_buf(path);

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    if all {
        // Generate all documents
        if !json {
            println!("Generating all compliance documents for '{name}'...");
        }

        let body = serde_json::json!({
            "path": project_path.to_string_lossy(),
            "name": name,
            "organization": organization,
        });

        match client.post_json("/fix/doc/all", &body).await {
            Ok(result) => {
                if json {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&result).unwrap_or_default()
                    );
                    return 0;
                }

                let generated = result.get("generated").and_then(|v| v.as_array());
                let errors = result.get("errors").and_then(|v| v.as_array());

                if let Some(docs) = generated
                    && !docs.is_empty()
                {
                    println!("\nGenerated {} document(s):\n", docs.len());
                    for doc in docs {
                        let dt = doc.get("docType").and_then(|v| v.as_str()).unwrap_or("?");
                        let sp = doc.get("savedPath").and_then(|v| v.as_str()).unwrap_or("?");
                        println!("  {dt:<30} -> {sp}");
                    }
                }

                if let Some(errs) = errors
                    && !errs.is_empty()
                {
                    eprintln!("\nErrors ({}):", errs.len());
                    for err in errs {
                        if let Some(e) = err.as_str() {
                            eprintln!("  {e}");
                        }
                    }
                }

                let gen_count = generated.map_or(0, std::vec::Vec::len);
                let err_count = errors.map_or(0, std::vec::Vec::len);
                println!("\nComplete: {gen_count} generated, {err_count} error(s).");

                i32::from(err_count > 0)
            }
            Err(e) => {
                eprintln!("Error: Failed to generate documents: {e}");
                1
            }
        }
    } else {
        // Generate single document
        let Some(dt) = doc_type else {
            eprintln!("  Error: document type is required when --all is not set");
            return 1;
        };

        if !json {
            println!("Generating '{dt}' document for '{name}'...");
        }

        let body = serde_json::json!({
            "path": project_path.to_string_lossy(),
            "name": name,
            "docType": dt,
            "organization": organization,
        });

        match client.post_json("/fix/doc/generate", &body).await {
            Ok(result) => {
                if json {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&result).unwrap_or_default()
                    );
                    return 0;
                }

                let saved_path = result
                    .get("savedPath")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let prefilled = result
                    .get("prefilledFields")
                    .and_then(|v| v.as_array())
                    .map_or(0, std::vec::Vec::len);
                let manual = result
                    .get("manualFields")
                    .and_then(|v| v.as_array())
                    .map_or(0, std::vec::Vec::len);

                println!("\nDocument generated:");
                println!("  Type:        {dt}");
                println!("  Saved to:    {saved_path}");
                println!("  Prefilled:   {prefilled} field(s)");
                println!("  Manual:      {manual} field(s) remaining");

                // List manual fields
                if let Some(fields) = result.get("manualFields").and_then(|v| v.as_array())
                    && !fields.is_empty()
                {
                    println!("\n  Fields to complete manually:");
                    for field in fields {
                        if let Some(f) = field.as_str() {
                            println!("    - {f}");
                        }
                    }
                }

                0
            }
            Err(e) => {
                eprintln!("Error: Failed to generate document: {e}");
                1
            }
        }
    }
}

/// Run `fix --doc <type>` — generate a single compliance document.
/// Agent name defaults to "default" if not provided.
#[cfg(feature = "extras")]
pub async fn run_doc_generate_fix(
    doc_type: &str,
    agent: Option<&str>,
    json: bool,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    if !VALID_DOC_TYPES.contains(&doc_type) {
        eprintln!("Error: Invalid document type: {doc_type}");
        eprintln!("Valid types: {}", VALID_DOC_TYPES.join(", "));
        return 1;
    }

    let project_path = resolve_project_path_buf(path);
    let agent_name = agent.unwrap_or("default");

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    if !json {
        println!("Generating '{doc_type}' document for passport '{agent_name}'...");
    }

    let body = serde_json::json!({
        "path": project_path.to_string_lossy(),
        "name": agent_name,
        "docType": doc_type,
    });

    match client.post_json("/fix/doc/generate", &body).await {
        Ok(result) => {
            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            let saved_path = result
                .get("savedPath")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            let prefilled = result
                .get("prefilledFields")
                .and_then(|v| v.as_array())
                .map_or(0, std::vec::Vec::len);
            let manual = result
                .get("manualFields")
                .and_then(|v| v.as_array())
                .map_or(0, std::vec::Vec::len);

            println!("\nDocument generated:");
            println!("  Type:        {doc_type}");
            println!("  Passport:    {agent_name}");
            println!("  Saved to:   {saved_path}");
            println!("  Prefilled:  {prefilled} field(s)");
            println!("  Manual:     {manual} field(s) remaining");

            if let Some(fields) = result.get("manualFields").and_then(|v| v.as_array())
                && !fields.is_empty()
            {
                println!("\n  Fields to complete manually:");
                for field in fields {
                    if let Some(f) = field.as_str() {
                        println!("    - {f}");
                    }
                }
            }

            0
        }
        Err(e) => {
            eprintln!("Error: Failed to generate document: {e}");
            1
        }
    }
}
