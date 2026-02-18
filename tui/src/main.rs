mod app;
mod components;
mod config;
mod engine_client;
mod error;
mod input;
mod theme;
mod types;
mod views;

use std::io;
use std::time::Duration;

use crossterm::event::{Event, EventStream};
use crossterm::execute;
use crossterm::terminal::{
    EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode,
};
use futures_util::StreamExt;
use ratatui::backend::CrosstermBackend;
use ratatui::Terminal;
use tokio::sync::mpsc;

use app::{App, AppCommand};
use config::load_config;
use engine_client::SseEvent;
use views::dashboard::render_dashboard;

#[tokio::main]
async fn main() -> color_eyre::Result<()> {
    color_eyre::install()?;
    tracing_subscriber::fmt()
        .with_env_filter("complior_tui=info")
        .with_writer(io::stderr)
        .init();

    let config = load_config();
    let mut app = App::new(config);

    // Build initial file tree
    app.load_file_tree();

    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;
    terminal.clear()?;

    // Run the event loop
    let result = run_event_loop(&mut terminal, &mut app).await;

    // Restore terminal
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;

    result?;
    Ok(())
}

async fn run_event_loop(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
    app: &mut App,
) -> color_eyre::Result<()> {
    let mut event_stream = EventStream::new();
    let tick_rate = Duration::from_millis(app.config.tick_rate_ms);
    let mut tick_interval = tokio::time::interval(tick_rate);

    // SSE channel for streaming responses
    let (sse_tx, mut sse_rx) = mpsc::unbounded_channel::<SseEvent>();

    // Try to connect to engine
    match app.engine_client.status().await {
        Ok(status) if status.ready => {
            app.engine_status = types::EngineConnectionStatus::Connected;
            app.messages.push(types::ChatMessage {
                role: types::MessageRole::System,
                content: "Connected to engine.".to_string(),
            });
        }
        _ => {
            app.engine_status = types::EngineConnectionStatus::Disconnected;
            app.messages.push(types::ChatMessage {
                role: types::MessageRole::System,
                content: "Engine not running. Start with: cd engine && npm run dev".to_string(),
            });
        }
    }

    while app.running {
        // Render
        terminal.draw(|frame| render_dashboard(frame, app))?;

        // Event multiplexing
        tokio::select! {
            // Terminal events (keyboard/mouse)
            maybe_event = event_stream.next() => {
                if let Some(Ok(Event::Key(key))) = maybe_event {
                    let action = input::handle_key_event(key, app);
                    if let Some(cmd) = app.apply_action(action) {
                        execute_command(app, cmd, sse_tx.clone()).await;
                    }
                }
            }

            // SSE events from engine
            Some(event) = sse_rx.recv() => {
                app.handle_sse_event(event);
            }

            // Tick for animations
            _ = tick_interval.tick() => {
                app.tick();
            }
        }
    }

    Ok(())
}

async fn execute_command(app: &mut App, cmd: AppCommand, sse_tx: mpsc::UnboundedSender<SseEvent>) {
    match cmd {
        AppCommand::Scan => {
            let path = app.project_path.to_string_lossy().to_string();
            match app.engine_client.scan(&path).await {
                Ok(result) => app.set_scan_result(result),
                Err(e) => {
                    app.messages.push(types::ChatMessage {
                        role: types::MessageRole::System,
                        content: format!("Scan failed: {e}"),
                    });
                }
            }
        }
        AppCommand::Chat(message) => {
            let client = app.engine_client.clone_for_stream();
            let msg = message.clone();
            tokio::spawn(async move {
                if let Err(e) = client.chat_stream(&msg, sse_tx).await {
                    tracing::error!("Chat stream error: {e}");
                }
            });
        }
        AppCommand::OpenFile(path) => match app.engine_client.read_file(&path).await {
            Ok(content) => app.open_file(&path, content),
            Err(_) => {
                // Fallback: try reading locally
                match tokio::fs::read_to_string(&path).await {
                    Ok(content) => app.open_file(&path, content),
                    Err(e) => {
                        app.messages.push(types::ChatMessage {
                            role: types::MessageRole::System,
                            content: format!("Cannot open file: {e}"),
                        });
                    }
                }
            }
        },
        AppCommand::RunCommand(command) => {
            app.terminal_output
                .push(format!("$ {command}"));
            match app.engine_client.run_command(&command).await {
                Ok(output) => {
                    for line in output.lines() {
                        app.terminal_output.push(line.to_string());
                    }
                }
                Err(e) => {
                    app.terminal_output
                        .push(format!("Error: {e}"));
                }
            }
        }
    }
}
