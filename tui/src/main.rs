mod app;
mod components;
mod config;
mod engine_client;
mod error;
mod input;
mod providers;
mod session;
mod theme;
mod types;
mod views;

use std::io;
use std::time::Duration;

use crossterm::event::{
    DisableMouseCapture, EnableMouseCapture, Event, EventStream,
};
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

    // Initialize theme from config
    theme::init_theme(&config.theme);

    let mut app = App::new(config);

    // Check for --resume flag
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "--resume") {
        if let Ok(data) = session::load_session("latest") {
            app.load_session_data(data);
            tracing::info!("Resumed session 'latest'");
        }
    }

    // Show getting started on first run, or provider setup if no providers
    if !session::first_run_done() {
        app.overlay = types::Overlay::GettingStarted;
    } else if !providers::is_configured(&app.provider_config) {
        app.overlay = types::Overlay::ProviderSetup;
    }

    // Build initial file tree
    app.load_file_tree();

    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;
    terminal.clear()?;

    // Run the event loop
    let result = run_event_loop(&mut terminal, &mut app).await;

    // Auto-save session on exit
    if let Err(e) = session::save_session(&app.to_session_data(), "latest") {
        tracing::warn!("Failed to save session: {e}");
    }

    // Restore terminal
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
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
            app.messages.push(types::ChatMessage::new(
                types::MessageRole::System,
                "Connected to engine.".to_string(),
            ));
        }
        _ => {
            app.engine_status = types::EngineConnectionStatus::Disconnected;
            app.messages.push(types::ChatMessage::new(
                types::MessageRole::System,
                "Engine not running. Start with: cd engine && npm run dev".to_string(),
            ));
        }
    }

    while app.running {
        // Render
        terminal.draw(|frame| render_dashboard(frame, app))?;

        // Event multiplexing
        tokio::select! {
            // Terminal events (keyboard/mouse)
            maybe_event = event_stream.next() => {
                match maybe_event {
                    Some(Ok(Event::Key(key))) => {
                        let action = input::handle_key_event(key, app);
                        if let Some(cmd) = app.apply_action(action) {
                            execute_command(app, cmd, sse_tx.clone()).await;
                        }
                    }
                    Some(Ok(Event::Mouse(mouse))) => {
                        let action = input::handle_mouse_event(mouse, app);
                        if let Some(cmd) = app.apply_action(action) {
                            execute_command(app, cmd, sse_tx.clone()).await;
                        }
                    }
                    Some(Ok(Event::Resize(_, _))) => {
                        // Terminal will re-render on next loop
                    }
                    _ => {}
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
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        format!("Scan failed: {e}"),
                    ));
                    app.operation_start = None;
                }
            }
        }
        AppCommand::Chat(message) => {
            let client = app.engine_client.clone_for_stream();
            let provider = if providers::is_configured(&app.provider_config) {
                Some(app.provider_config.active_provider.clone())
            } else {
                None
            };
            let model = if provider.is_some() {
                Some(app.provider_config.active_model.clone())
            } else {
                None
            };
            let api_key = provider.as_ref().and_then(|p| {
                app.provider_config.providers.get(p).map(|e| e.api_key.clone())
            });
            let error_tx = sse_tx.clone();
            tokio::spawn(async move {
                if let Err(e) = client.chat_stream(
                    &message,
                    provider.as_deref(),
                    model.as_deref(),
                    api_key.as_deref(),
                    sse_tx,
                ).await {
                    tracing::error!("Chat stream error: {e}");
                    let _ = error_tx.send(SseEvent::Error(format!("Connection error: {e}")));
                    let _ = error_tx.send(SseEvent::Done);
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
                        app.messages.push(types::ChatMessage::new(
                            types::MessageRole::System,
                            format!("Cannot open file: {e}"),
                        ));
                    }
                }
            }
        },
        AppCommand::RunCommand(command) => {
            app.add_terminal_line(format!("$ {command}"));
            match app.engine_client.run_command(&command).await {
                Ok(output) => {
                    for line in output.lines() {
                        app.add_terminal_line(line.to_string());
                    }
                }
                Err(e) => {
                    app.add_terminal_line(format!("Error: {e}"));
                }
            }
        }
        AppCommand::Reconnect => {
            app.messages.push(types::ChatMessage::new(
                types::MessageRole::System,
                "Reconnecting to engine...".to_string(),
            ));
            match app.engine_client.status().await {
                Ok(status) if status.ready => {
                    app.engine_status = types::EngineConnectionStatus::Connected;
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        "Reconnected successfully.".to_string(),
                    ));
                }
                _ => {
                    app.engine_status = types::EngineConnectionStatus::Disconnected;
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        "Reconnect failed. Is engine running?".to_string(),
                    ));
                }
            }
        }
        AppCommand::SwitchTheme(name) => {
            theme::init_theme(&name);
            app.messages.push(types::ChatMessage::new(
                types::MessageRole::System,
                format!("Theme switched to: {name}"),
            ));
        }
        AppCommand::SaveSession(name) => {
            let data = app.to_session_data();
            match session::save_session(&data, &name) {
                Ok(()) => {
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        format!("Session saved: {name}"),
                    ));
                }
                Err(e) => {
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        format!("Save failed: {e}"),
                    ));
                }
            }
        }
        AppCommand::LoadSession(name) => match session::load_session(&name) {
            Ok(data) => {
                app.load_session_data(data);
                app.messages.push(types::ChatMessage::new(
                    types::MessageRole::System,
                    format!("Session loaded: {name}"),
                ));
            }
            Err(e) => {
                app.messages.push(types::ChatMessage::new(
                    types::MessageRole::System,
                    format!("Load failed: {e}"),
                ));
            }
        },
    }
}
