use std::io;

use crate::pty::PtyManager;

/// Deterministic orchestrator commands — no LLM involved.
pub enum WrapperCommand {
    /// Send text to a specific agent.
    Send { agent_id: usize, text: String },
    /// Hand off context from one agent to another.
    Handoff { from: usize, to: usize, context: String },
    /// Kill a specific agent.
    Kill { agent_id: usize },
    /// Restart a specific agent (kill then re-launch).
    Restart { agent_id: usize },
    /// Send the same text to all live agents.
    BroadcastSync { text: String },
}

/// Execute a wrapper command against the agent manager.
pub fn execute_wrapper_cmd(cmd: WrapperCommand, manager: &mut PtyManager) -> io::Result<()> {
    match cmd {
        WrapperCommand::Send { agent_id, text } => {
            if let Some(handle) = manager.get_mut(agent_id) {
                handle.send_input(&text);
            }
        }
        WrapperCommand::Kill { agent_id } => {
            manager.kill(agent_id);
        }
        WrapperCommand::Restart { agent_id } => {
            // Mark the existing session dead; actual re-launch happens in the event loop
            manager.kill(agent_id);
        }
        WrapperCommand::BroadcastSync { text } => {
            // Collect ids first to avoid borrow conflict
            let ids: Vec<usize> = manager
                .sessions()
                .iter()
                .map(|s| s.id())
                .collect();
            for id in ids {
                if let Some(handle) = manager.get_mut(id) {
                    handle.send_input(&text);
                }
            }
        }
        WrapperCommand::Handoff { from, to, context } => {
            // Send context summary to target agent
            if let Some(handle) = manager.get_mut(to) {
                let msg = format!("[handoff from agent {from}]\n{context}\n");
                handle.send_input(&msg);
            }
        }
    }
    Ok(())
}
