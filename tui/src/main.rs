mod animation;
mod app;
mod components;
mod config;
mod engine_client;
mod engine_process;
mod error;
mod input;
mod layout;
mod obligations;
mod providers;
mod session;
mod theme;
mod theme_picker;
mod types;
mod views;
mod watcher;
mod widgets;

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
    // Workspace root is parent of tui/ (CARGO_MANIFEST_DIR at compile time)
    let workspace_root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."));

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
        let mut mgr = EngineManager::new(workspace_root);
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
    // Start splash animation (only in production, not in tests)
    app.animation.start_splash();

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

    // Animation tick: 50ms (20fps) — only fires when animations are active
    let mut anim_interval = tokio::time::interval(Duration::from_millis(50));

    // SSE channel for streaming responses
    let (sse_tx, mut sse_rx) = mpsc::unbounded_channel::<SseEvent>();

    // Watch mode channel + handle
    let (watch_tx, mut watch_rx) = mpsc::unbounded_channel::<std::path::PathBuf>();
    let mut watch_handle: Option<tokio::task::JoinHandle<()>> = None;

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

    // Auto-start watch if configured
    if app.config.watch_on_start {
        watch_handle = Some(watcher::spawn_watcher(app.project_path.clone(), watch_tx.clone()));
        app.watch_active = true;
        app.messages.push(types::ChatMessage::new(
            types::MessageRole::System,
            "Watch mode started (auto).".to_string(),
        ));
    }

    // Tick counter for periodic health checks (~5s at 250ms tick)
    let mut tick_count: u32 = 0;
    let health_check_interval: u32 = 20; // 20 ticks × 250ms = 5s

    while app.running {
        // Compute click areas for mouse support
        if let Ok(size) = crossterm::terminal::size() {
            app.rebuild_click_areas(size.0, size.1);
        }

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
                            execute_command(app, cmd, sse_tx.clone(), &watch_tx, &mut watch_handle).await;
                        }
                    }
                    Some(Ok(Event::Mouse(mouse))) => {
                        let action = input::handle_mouse_event(mouse, app);
                        if let Some(cmd) = app.apply_action(action) {
                            execute_command(app, cmd, sse_tx.clone(), &watch_tx, &mut watch_handle).await;
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

            // File watch events
            Some(path) = watch_rx.recv(), if app.watch_active => {
                app.push_activity(types::ActivityKind::Watch, path.display().to_string());
                execute_command(app, AppCommand::AutoScan, sse_tx.clone(), &watch_tx, &mut watch_handle).await;
            }

            // Tick for general state + health checks (250ms)
            _ = tick_interval.tick() => {
                if let Some(cmd) = app.tick() {
                    execute_command(app, cmd, sse_tx.clone(), &watch_tx, &mut watch_handle).await;
                }
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

            // Animation tick (50ms, 20fps) — only when animations active
            _ = anim_interval.tick(), if app.animation.active() => {
                app.animation.step();
            }
        }
    }

    // Clean up watcher on exit
    if let Some(handle) = watch_handle.take() {
        handle.abort();
    }

    Ok(())
}

#[allow(clippy::too_many_lines)]
async fn execute_command(
    app: &mut App,
    cmd: AppCommand,
    sse_tx: mpsc::UnboundedSender<SseEvent>,
    watch_tx: &mpsc::UnboundedSender<std::path::PathBuf>,
    watch_handle: &mut Option<tokio::task::JoinHandle<()>>,
) {
    match cmd {
        AppCommand::ToggleWatch => {
            if app.watch_active {
                // Stop watcher
                if let Some(handle) = watch_handle.take() {
                    handle.abort();
                }
                app.watch_active = false;
                app.mode = types::Mode::Scan;
                app.messages.push(types::ChatMessage::new(
                    types::MessageRole::System,
                    "Watch mode stopped.".to_string(),
                ));
            } else {
                // Start watcher
                *watch_handle = Some(watcher::spawn_watcher(
                    app.project_path.clone(),
                    watch_tx.clone(),
                ));
                app.watch_active = true;
                app.mode = types::Mode::Watch;
                app.messages.push(types::ChatMessage::new(
                    types::MessageRole::System,
                    "Watch mode started. Editing files will trigger auto-scan.".to_string(),
                ));
            }
        }
        AppCommand::AutoScan => {
            // Save previous score for regression detection
            let prev_score = app.last_scan.as_ref().map(|s| s.score.total_score);
            app.watch_last_score = prev_score;

            let path = app.project_path.to_string_lossy().to_string();
            match app.engine_client.scan(&path).await {
                Ok(result) => {
                    let new_score = result.score.total_score;
                    app.set_scan_result(result);

                    // Regression detection
                    if let Some(old) = prev_score {
                        let diff = new_score - old;
                        if diff < -5.0 {
                            app.messages.push(types::ChatMessage::new(
                                types::MessageRole::System,
                                format!(
                                    "REGRESSION: Score dropped {:.0} → {:.0} ({diff:+.0})",
                                    old, new_score
                                ),
                            ));
                        } else if diff > 0.0 {
                            app.messages.push(types::ChatMessage::new(
                                types::MessageRole::System,
                                format!(
                                    "IMPROVED: Score {:.0} → {:.0} ({diff:+.0})",
                                    old, new_score
                                ),
                            ));
                        }
                    }
                }
                Err(e) => {
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        format!("Auto-scan failed: {e}"),
                    ));
                }
            }
        }
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
        AppCommand::Undo(id) => {
            match app.engine_client.undo(id).await {
                Ok(result) => {
                    let msg = result
                        .get("message")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Undo applied");
                    app.toasts.push(
                        components::toast::ToastKind::Success,
                        msg.to_string(),
                    );
                    app.push_activity(types::ActivityKind::Fix, "Undo");
                    app.animation.start_checkmark();
                }
                Err(_) => {
                    app.toasts.push(
                        components::toast::ToastKind::Warning,
                        "Nothing to undo",
                    );
                }
            }
        }
        AppCommand::FetchUndoHistory => {
            match app.engine_client.undo_history().await {
                Ok(entries) => {
                    app.undo_history.entries = entries
                        .iter()
                        .filter_map(|v| {
                            Some(components::undo_history::UndoEntry {
                                id: v.get("id")?.as_u64()? as u32,
                                timestamp: v
                                    .get("timestamp")
                                    .and_then(|t| t.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                action: v
                                    .get("action")
                                    .and_then(|a| a.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                status: match v
                                    .get("status")
                                    .and_then(|s| s.as_str())
                                    .unwrap_or("applied")
                                {
                                    "undone" => {
                                        components::undo_history::UndoStatus::Undone
                                    }
                                    "baseline" => {
                                        components::undo_history::UndoStatus::Baseline
                                    }
                                    _ => {
                                        components::undo_history::UndoStatus::Applied
                                    }
                                },
                                score_delta: v
                                    .get("scoreDelta")
                                    .and_then(|d| d.as_f64()),
                            })
                        })
                        .collect();
                    app.undo_history.selected = 0;
                }
                Err(_) => {
                    app.undo_history.entries.clear();
                }
            }
        }
        AppCommand::FetchSuggestions => {
            app.idle_suggestions.fetch_pending = false;
            match app.engine_client.suggestions().await {
                Ok(items) if !items.is_empty() => {
                    if let Some(first) = items.first() {
                        let kind_str = first
                            .get("kind")
                            .and_then(|k| k.as_str())
                            .unwrap_or("tip");
                        let kind = match kind_str {
                            "fix" => components::suggestions::SuggestionKind::Fix,
                            "deadline" => {
                                components::suggestions::SuggestionKind::DeadlineWarning
                            }
                            "score" => {
                                components::suggestions::SuggestionKind::ScoreImprovement
                            }
                            "new" => {
                                components::suggestions::SuggestionKind::NewFeature
                            }
                            _ => components::suggestions::SuggestionKind::Tip,
                        };
                        app.idle_suggestions.current =
                            Some(components::suggestions::Suggestion {
                                kind,
                                text: first
                                    .get("text")
                                    .and_then(|t| t.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                detail: first
                                    .get("detail")
                                    .and_then(|d| d.as_str())
                                    .map(String::from),
                            });
                    }
                }
                _ => {
                    // Engine doesn't have /suggestions or returned empty — use local context
                    let suggestion = build_local_suggestion(app);
                    app.idle_suggestions.current = Some(suggestion);
                }
            }
        }
    }
}

/// Build a context-aware suggestion from local app state when engine /suggestions is unavailable.
fn build_local_suggestion(app: &App) -> components::suggestions::Suggestion {
    use components::suggestions::{Suggestion, SuggestionKind};

    // Priority 1: If no scan yet, suggest scanning
    if app.last_scan.is_none() {
        return Suggestion {
            kind: SuggestionKind::Tip,
            text: "Try /scan to check your project's compliance score".into(),
            detail: Some("Press any key to dismiss".into()),
        };
    }

    let scan = app.last_scan.as_ref().unwrap();
    let score = scan.score.total_score;

    // Priority 2: Findings present — suggest fix
    let finding_count = scan.findings.len();
    if finding_count > 0 {
        return Suggestion {
            kind: SuggestionKind::Fix,
            text: format!("Score {score:.0}/100. {finding_count} findings to fix — press 3 for Fix view"),
            detail: Some("Quick wins can boost your score significantly".into()),
        };
    }

    // Priority 3: Deadline warning
    if score < 80.0 {
        return Suggestion {
            kind: SuggestionKind::DeadlineWarning,
            text: format!("Score {score:.0}/100 — EU AI Act full enforcement Aug 2, 2026"),
            detail: Some("Press 5 for Timeline view".into()),
        };
    }

    // Priority 4: High score celebration
    Suggestion {
        kind: SuggestionKind::ScoreImprovement,
        text: format!("Score {score:.0}/100 — Looking good! Run /scan to verify latest changes"),
        detail: None,
    }
}
