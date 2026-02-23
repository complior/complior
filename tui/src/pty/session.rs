use std::io::{self, Write};
use std::sync::{Arc, Mutex};

use portable_pty::{native_pty_system, CommandBuilder, PtySize};

use crate::agents::registry::AgentConfig;
use super::buffer::RingBuffer;

/// Lifecycle state of a guest agent PTY session.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AgentState {
    /// Process spawned, waiting for ready_pattern.
    Starting,
    /// Ready pattern matched — agent is idle at prompt.
    Ready,
    /// Agent is processing a command.
    Working,
    /// Process exited.
    Dead,
}

impl AgentState {
    pub fn label(self) -> &'static str {
        match self {
            Self::Starting => "starting",
            Self::Ready => "ready",
            Self::Working => "working",
            Self::Dead => "dead",
        }
    }
}

/// An active PTY session hosting a guest coding agent.
pub struct AgentSession {
    pub id: usize,
    pub config: AgentConfig,
    pub state: AgentState,
    /// Shared ring buffer populated by the background reader thread.
    pub output: Arc<Mutex<RingBuffer>>,
    /// VT100 screen emulator — properly renders cursor-positioned TUI output.
    pub screen: Arc<Mutex<vt100::Parser>>,
    /// Scroll offset for the agent's viewport.
    pub scroll_offset: usize,
    /// Elapsed seconds since spawn (cheap monotonic).
    pub uptime_secs: u64,
    writer: Box<dyn Write + Send>,
    master: Box<dyn portable_pty::MasterPty + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
    _reader_task: tokio::task::JoinHandle<()>,
}

impl AgentSession {
    /// Spawn the agent binary in a new PTY pair.
    ///
    /// The reader thread is started immediately and pushes bytes into
    /// both `self.output` (raw ring buffer) and `self.screen` (vt100 parser).
    /// Callers must be inside a Tokio runtime.
    pub fn spawn(id: usize, config: AgentConfig, size: PtySize) -> io::Result<Self> {
        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(size)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

        let mut cmd = CommandBuilder::new(&config.binary);
        for arg in &config.args {
            cmd.arg(arg);
        }
        for (k, v) in &config.env {
            cmd.env(k, v);
        }

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

        let output = Arc::new(Mutex::new(RingBuffer::new()));
        let output_clone = Arc::clone(&output);

        // VT100 parser sized to PTY dimensions (scrollback=0: only current screen).
        let screen = Arc::new(Mutex::new(vt100::Parser::new(size.rows, size.cols, 0)));
        let screen_clone = Arc::clone(&screen);

        // Spawn a blocking thread that drains the PTY master reader.
        let reader_task = tokio::task::spawn_blocking(move || {
            use std::io::Read;
            let mut reader = reader;
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        if let Ok(mut guard) = output_clone.lock() {
                            guard.push(&buf[..n]);
                        }
                        if let Ok(mut guard) = screen_clone.lock() {
                            guard.process(&buf[..n]);
                        }
                    }
                }
            }
        });

        Ok(Self {
            id,
            config,
            state: AgentState::Starting,
            output,
            screen,
            scroll_offset: 0,
            uptime_secs: 0,
            writer,
            master: pair.master,
            child,
            _reader_task: reader_task,
        })
    }

    /// Send raw text (e.g. a command + newline) to the agent's stdin.
    pub fn send_input(&mut self, text: &str) -> io::Result<()> {
        self.writer.write_all(text.as_bytes())
    }

    /// Send raw bytes to the agent's stdin (used for PTY passthrough mode).
    pub fn send_raw(&mut self, bytes: &[u8]) -> io::Result<()> {
        self.writer.write_all(bytes)
    }

    /// Resize the PTY and update the VT100 parser dimensions.
    pub fn resize(&self, size: PtySize) {
        let _ = self.master.resize(size);
        if let Ok(mut parser) = self.screen.lock() {
            parser.set_size(size.rows, size.cols);
        }
    }

    /// Return the current VT100 screen as lines (last `n` rows).
    ///
    /// Each cell is rendered as its character (or a space for empty cells).
    /// Trailing whitespace is trimmed per row.
    pub fn screen_rows(&self, n: usize) -> Vec<String> {
        if let Ok(parser) = self.screen.lock() {
            let s = parser.screen();
            let (total_rows, cols) = s.size();
            let total = total_rows as usize;
            let start = total.saturating_sub(n);
            (start..total)
                .map(|row| {
                    let mut line = String::new();
                    for col in 0..cols {
                        if let Some(cell) = s.cell(row as u16, col) {
                            let c = cell.contents();
                            if c.is_empty() {
                                line.push(' ');
                            } else {
                                line.push_str(&c);
                            }
                        }
                    }
                    line.trim_end().to_string()
                })
                .collect()
        } else {
            Vec::new()
        }
    }

    /// Send SIGTERM / kill the child process.
    pub fn kill(&mut self) {
        let _ = self.child.kill();
        self.state = AgentState::Dead;
    }

    /// Check whether the child process has exited.
    pub fn poll_exit(&mut self) -> bool {
        if let Ok(Some(_)) = self.child.try_wait() {
            self.state = AgentState::Dead;
            return true;
        }
        false
    }
}
