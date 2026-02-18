mod app;
mod components;
mod config;
mod engine_client;
mod engine_process;
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
use engine_process::EngineManager;
use views::dashboard::render_dashboard;

#[tokio::main]
#[allow(clippy::too_many_lines)]
async fn main() -> color_eyre::Result<()> {
    color_eyre::install()?;
    tracing_subscriber::fmt()
        .with_env_filter("complior_tui=info")
        .with_writer(io::stderr)
        .init();

    let mut config = load_config();

    // Parse CLI args
    let args: Vec<String> = std::env::args().collect();
    let mut resume = false;
    let mut engine_url_override: Option<String> = None;

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--resume" => resume = true,
            "--engine-url" => {
                if i + 1 < args.len() {
                    engine_url_override = Some(args[i + 1].clone());
                    i += 1;
                }
            }
            _ => {}
        }
        i += 1;
    }

    config.engine_url_override = engine_url_override;

    // Initialize theme from config
    theme::init_theme(&config.theme);

    // Engine manager: auto-launch or external
    #[allow(clippy::option_if_let_else)]
    let mut engine_mgr = if let Some(ref url) = config.engine_url_override {
        // External mode — extract port for display
        let port = url
            .rsplit(':')
            .next()
            .and_then(|p| p.trim_end_matches('/').parse::<u16>().ok())
            .unwrap_or(3099);
        EngineManager::external(port)
    } else {
        let mut mgr = EngineManager::new();
        match mgr.start() {
            Ok(port) => {
                tracing::info!("Engine auto-launched on port {port}");
            }
            Err(e) => {
                tracing::warn!("Failed to auto-launch engine: {e}");
                // Fall through — will use default port from config
            }
        }
        mgr
    };

    // Create app with engine URL (either auto-launched or override)
    let effective_url = config
        .engine_url_override
        .clone()
        .unwrap_or_else(|| {
            if engine_mgr.port > 0 {
                engine_mgr.engine_url()
            } else {
                config.engine_url()
            }
        });

    let mut app = App::new(config);
    // Override engine client with the effective URL
    app.engine_client = engine_client::EngineClient::from_url(&effective_url);

    // Check for --resume flag
    if resume
        && let Ok(data) = session::load_session("latest")
    {
        app.load_session_data(data);
        tracing::info!("Resumed session 'latest'");
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

    // Wait for engine if we auto-launched it
    if engine_mgr.status == engine_process::EngineProcessStatus::Starting {
        app.engine_status = types::EngineConnectionStatus::Connecting;
        app.messages.push(types::ChatMessage::new(
            types::MessageRole::System,
            "Starting engine...".to_string(),
        ));

        // Render once to show "Starting engine..."
        terminal.draw(|frame| render_dashboard(frame, &app))?;

        if engine_mgr.wait_for_ready(&app.engine_client).await {
            app.engine_status = types::EngineConnectionStatus::Connected;
            app.messages.push(types::ChatMessage::new(
                types::MessageRole::System,
                format!("Engine ready on port {}.", engine_mgr.port),
            ));
        } else {
            app.engine_status = types::EngineConnectionStatus::Disconnected;
            app.messages.push(types::ChatMessage::new(
                types::MessageRole::System,
                "Engine failed to start. Use /reconnect or restart.".to_string(),
            ));
        }
    }

    // Run the event loop
    let result = run_event_loop(&mut terminal, &mut app, &mut engine_mgr).await;

    // Shutdown engine
    engine_mgr.shutdown();

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
    engine_mgr: &mut EngineManager,
) -> color_eyre::Result<()> {
    let mut event_stream = EventStream::new();
    let tick_rate = Duration::from_millis(app.config.tick_rate_ms);
    let mut tick_interval = tokio::time::interval(tick_rate);

    // SSE channel for streaming responses
    let (sse_tx, mut sse_rx) = mpsc::unbounded_channel::<SseEvent>();

    // Try to connect to engine (if we haven't already from auto-launch)
    if app.engine_status != types::EngineConnectionStatus::Connected {
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
    }

    // Tick counter for periodic health checks (~5s at 250ms tick)
    let mut tick_count: u32 = 0;
    let health_check_interval: u32 = 20; // 20 ticks × 250ms = 5s

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
                    _ => {
                        // Resize and other events — terminal re-renders on next loop
                    }
                }
            }

            // SSE events from engine
            Some(event) = sse_rx.recv() => {
                app.handle_sse_event(event);
            }

            // Tick for animations + health checks
            _ = tick_interval.tick() => {
                app.tick();
                tick_count += 1;

                // Periodic engine health check
                if tick_count % health_check_interval == 0
                    && !engine_mgr.is_alive()
                    && engine_mgr.status == engine_process::EngineProcessStatus::Stopped
                {
                    tracing::warn!("Engine process died, attempting restart");
                    match engine_mgr.try_restart() {
                        Ok(port) => {
                            app.engine_client = engine_client::EngineClient::from_url(
                                &format!("http://127.0.0.1:{port}"),
                            );
                            app.engine_status = types::EngineConnectionStatus::Connecting;
                            app.messages.push(types::ChatMessage::new(
                                types::MessageRole::System,
                                format!("Engine restarting on port {port}..."),
                            ));
                        }
                        Err(e) => {
                            app.engine_status = types::EngineConnectionStatus::Error;
                            app.messages.push(types::ChatMessage::new(
                                types::MessageRole::System,
                                format!("Engine restart failed: {e}"),
                            ));
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

#[allow(clippy::too_many_lines)]
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
