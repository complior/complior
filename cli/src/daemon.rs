//! PID file management for the Complior daemon.
//!
//! The TS engine writes the PID file on startup (via `COMPLIOR_PID_FILE` env var).
//! Rust only reads and cleans up stale PID files.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Information about a running daemon, persisted as JSON in the PID file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonInfo {
    pub pid: u32,
    pub port: u16,
    pub started_at: String,
}

/// Returns the path to the PID file for a given project.
/// Location: `{project_path}/.complior/daemon.pid`
pub fn pid_file_path(project_path: &Path) -> PathBuf {
    project_path.join(".complior").join("daemon.pid")
}

/// Reads a PID file and returns `DaemonInfo` if valid.
/// Returns `None` if the file is missing, unreadable, or contains invalid JSON.
pub fn read_pid_file(path: &Path) -> Option<DaemonInfo> {
    let content = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

/// Removes the PID file (best-effort, ignores errors).
pub fn remove_pid_file(path: &Path) {
    let _ = std::fs::remove_file(path);
}

/// Checks if a process with the given PID is still alive.
#[cfg(unix)]
pub fn is_process_alive(pid: u32) -> bool {
    // kill(pid, 0) checks existence without sending a signal
    unsafe { libc::kill(pid.cast_signed(), 0) == 0 }
}

#[cfg(not(unix))]
pub fn is_process_alive(pid: u32) -> bool {
    // Windows: check if process exists via tasklist
    std::process::Command::new("tasklist")
        .args(["/FI", &format!("PID eq {pid}"), "/NH"])
        .output()
        .map(|o| {
            o.status.success() && String::from_utf8_lossy(&o.stdout).contains(&pid.to_string())
        })
        .unwrap_or(true) // conservatively assume alive if check fails
}

/// Looks for a running daemon in the given project directory.
/// If the PID file exists but the process is dead, cleans up the stale file.
pub fn find_running_daemon(project_path: &Path) -> Option<DaemonInfo> {
    let path = pid_file_path(project_path);
    let info = read_pid_file(&path)?;

    if is_process_alive(info.pid) {
        Some(info)
    } else {
        tracing::debug!("Stale PID file for PID {}, removing", info.pid);
        remove_pid_file(&path);
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn pid_file_path_returns_correct_location() {
        let path = pid_file_path(Path::new("/home/user/project"));
        assert_eq!(
            path,
            PathBuf::from("/home/user/project/.complior/daemon.pid")
        );
    }

    #[test]
    fn read_pid_file_valid_json() {
        let dir = std::env::temp_dir().join("complior-test-pid-valid");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("daemon.pid");

        let mut f = std::fs::File::create(&path).unwrap();
        write!(
            f,
            r#"{{"pid":12345,"port":3099,"started_at":"2026-03-01T10:00:00Z"}}"#
        )
        .unwrap();

        let info = read_pid_file(&path).expect("should parse valid JSON");
        assert_eq!(info.pid, 12345);
        assert_eq!(info.port, 3099);
        assert_eq!(info.started_at, "2026-03-01T10:00:00Z");

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn read_pid_file_missing_returns_none() {
        let path = Path::new("/tmp/complior-test-nonexistent/daemon.pid");
        assert!(read_pid_file(path).is_none());
    }

    #[test]
    fn read_pid_file_invalid_json_returns_none() {
        let dir = std::env::temp_dir().join("complior-test-pid-invalid");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("daemon.pid");
        std::fs::write(&path, "not json").unwrap();

        assert!(read_pid_file(&path).is_none());

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn find_running_daemon_cleans_stale_pid() {
        let dir = std::env::temp_dir().join("complior-test-stale-pid");
        let complior_dir = dir.join(".complior");
        std::fs::create_dir_all(&complior_dir).unwrap();
        let pid_path = complior_dir.join("daemon.pid");

        // PID 999999999 is almost certainly not alive
        std::fs::write(
            &pid_path,
            r#"{"pid":999999999,"port":3099,"started_at":"2026-01-01T00:00:00Z"}"#,
        )
        .unwrap();

        let result = find_running_daemon(&dir);
        assert!(result.is_none(), "Dead PID should return None");
        assert!(!pid_path.exists(), "Stale PID file should be cleaned up");

        std::fs::remove_dir_all(&dir).ok();
    }
}
