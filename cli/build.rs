// Build script: embed git hash and target triple into the binary.
fn main() {
    // Git short hash (7 chars) — falls back to "unknown" if not in a git repo
    let git_hash = std::process::Command::new("git")
        .args(["rev-parse", "--short=7", "HEAD"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map_or_else(
            || "unknown".to_string(),
            |o| String::from_utf8_lossy(&o.stdout).trim().to_string(),
        );

    println!("cargo:rustc-env=BUILD_GIT_HASH={git_hash}");

    // Target triple from Cargo
    let target = std::env::var("TARGET").unwrap_or_else(|_| "unknown".to_string());
    println!("cargo:rustc-env=BUILD_TARGET={target}");

    // Only re-run if HEAD changes (not on every build)
    println!("cargo:rerun-if-changed=../.git/HEAD");
    println!("cargo:rerun-if-changed=../.git/refs/");
}
