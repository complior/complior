mod animation;
mod app;
mod contract_test;
mod cli;
mod components;
mod config;
mod daemon;
mod engine_client;
mod engine_process;
mod saas_client;
mod error;
mod headless;
mod input;
mod layout;
mod obligations;

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

use clap::Parser;

use app::executor::execute_command;
use app::{App, AppCommand};
use config::load_config;
use engine_process::EngineManager;
use views::dashboard::render_dashboard;

#[tokio::main]
#[allow(clippy::too_many_lines)]
async fn main() -> color_eyre::Result<()> {
    color_eyre::install()?;
    tracing_subscriber::fmt()
        .with_env_filter("complior_cli=info")
        .with_writer(io::stderr)
        .init();

    let mut config = load_config();

    // Parse CLI args with clap
    let parsed_cli = cli::Cli::parse();
    let resume = parsed_cli.resume;
    config.engine_url_override = parsed_cli.engine_url.clone();

    // Apply theme from CLI if provided
    if let Some(ref theme_name) = parsed_cli.theme {
        config.theme = theme_name.clone();
    }

    // Auto-discover daemon port from PID file (if no --engine-url override)
    if config.engine_url_override.is_none() {
        let project_path = std::env::current_dir().unwrap_or_default();
        if let Some(info) = daemon::find_running_daemon(&project_path) {
            config.engine_url_override = Some(format!("http://127.0.0.1:{}", info.port));
        }
    }

    // Handle headless commands (non-TUI)
    if cli::is_headless(&parsed_cli) {
        match &parsed_cli.command {
            Some(cli::Command::Scan { ci, json, sarif, no_tui, threshold, fail_on, path }) => {
                let code = headless::run_headless_scan(
                    *ci,
                    *json,
                    *sarif,
                    *no_tui,
                    *threshold,
                    fail_on.as_deref(),
                    path.as_deref(),
                    &config,
                )
                .await;
                std::process::exit(code);
            }
            Some(cli::Command::Fix { dry_run, json, path }) => {
                let code = headless::run_headless_fix(
                    *dry_run,
                    *json,
                    path.as_deref(),
                    &config,
                )
                .await;
                std::process::exit(code);
            }
            Some(cli::Command::Version) => {
                headless::run_version();
                return Ok(());
            }
            Some(cli::Command::Doctor) => {
                headless::run_doctor(&config).await;
                return Ok(());
            }
            Some(cli::Command::Report { format, output, path }) => {
                let code = headless::run_report(format, output.as_deref(), path.as_deref(), &config).await;
                std::process::exit(code);
            }
            Some(cli::Command::Init { path }) => {
                headless::run_init(path.as_deref());
                return Ok(());
            }
            Some(cli::Command::Update) => {
                headless::run_update().await;
                return Ok(());
            }
            Some(cli::Command::Daemon { action, watch }) => {
                let project_path = std::env::current_dir().unwrap_or_default();
                headless::daemon::run_daemon(action.as_ref(), *watch, &project_path, &config).await;
                return Ok(());
            }
            Some(cli::Command::Agent { action }) => {
                let code = headless::agent::run_agent_command(action, &config).await;
                std::process::exit(code);
            }
            Some(cli::Command::Login) => {
                match headless::run_login(&config).await {
                    Ok(()) => return Ok(()),
                    Err(e) => {
                        eprintln!("Login failed: {e}");
                        std::process::exit(1);
                    }
                }
            }
            Some(cli::Command::Logout) => {
                match headless::run_logout(&config).await {
                    Ok(()) => return Ok(()),
                    Err(e) => {
                        eprintln!("Logout failed: {e}");
                        std::process::exit(1);
                    }
                }
            }
            Some(cli::Command::Sync { passport, scan, docs, .. }) => {
                let code = headless::run_sync(*passport, *scan, *docs, &config).await;
                std::process::exit(code);
            }
            None => unreachable!(),
        }
    }

    // Initialize theme from config
    theme::init_theme(&config.theme);

    // Engine manager: auto-launch or external
    // Workspace root is parent of cli/ (CARGO_MANIFEST_DIR at compile time)
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
        // Check for existing daemon before auto-launching
        let project_path = std::env::current_dir().unwrap_or_default();
        if let Some(info) = daemon::find_running_daemon(&project_path) {
            // Reuse existing daemon (External mode — won't be killed on TUI exit)
            tracing::info!("Found daemon on port {} (PID {})", info.port, info.pid);
            EngineManager::external(info.port)
        } else {
            // Auto-launch with PID file so other instances can discover it
            let mut mgr = EngineManager::new(workspace_root);
            let pid_path = daemon::pid_file_path(&project_path);
            match mgr.start_with_pid(&pid_path, config.watch_on_start) {
                Ok(port) => {
                    tracing::info!("Engine auto-launched on port {port}");
                }
                Err(e) => {
                    tracing::warn!("Failed to auto-launch engine: {e}");
                    // Fall through — will use default port from config
                }
            }
            mgr
        }
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

    let mut app = App::new(config.clone());
    // Override engine client with the effective URL
    app.engine_client = engine_client::EngineClient::from_url(&effective_url);
    // Start splash animation (only in production, not in tests)
    app.animation.start_splash();

    // Check for --resume flag
    if resume
        && let Ok(data) = session::load_session("latest").await
    {
        app.load_session_data(data);
        tracing::info!("Resumed session 'latest'");
    }

    // Parse --yes flag for non-interactive onboarding
    let skip_onboarding = parsed_cli.yes
        || std::env::var("CI").is_ok();

    // Show onboarding on first run, or provider setup if no providers
    if !config.onboarding_completed && !skip_onboarding {
        // Check for partial resume
        let wiz = if let Some(last_step) = config.onboarding_last_step {
            crate::views::onboarding::OnboardingWizard::resume(last_step)
        } else {
            crate::views::onboarding::OnboardingWizard::new()
        };
        app.onboarding = Some(wiz);
        app.overlay = types::Overlay::Onboarding;
    } else if !config.onboarding_completed && skip_onboarding {
        // --yes or CI: apply defaults and mark complete
        config::mark_onboarding_complete().await;
        app.config.onboarding_completed = true;
    }

    // Build initial file tree
    app.load_file_tree().await;

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
    if let Err(e) = session::save_session(&app.to_session_data(), "latest").await {
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

    // Watch mode channel + handle
    let (watch_tx, mut watch_rx) = mpsc::unbounded_channel::<std::path::PathBuf>();
    let mut watch_handle: Option<tokio::task::JoinHandle<()>> = None;

    // Background command results channel (non-blocking async operations)
    let mut bg_rx = app.take_bg_rx();

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
                            execute_command(app, cmd, &watch_tx, &mut watch_handle).await;
                        }
                    }
                    Some(Ok(Event::Mouse(mouse))) => {
                        let action = input::handle_mouse_event(mouse, app);
                        if let Some(cmd) = app.apply_action(action) {
                            execute_command(app, cmd, &watch_tx, &mut watch_handle).await;
                        }
                    }
                    Some(Ok(Event::Resize(_w, _h))) => {
                        // Resize handled naturally by ratatui on next render
                    }
                    _ => {
                        // Other events — terminal re-renders on next loop
                    }
                }
            }

            // Background command results (non-blocking async operations)
            Some(bg_cmd) = bg_rx.recv() => {
                execute_command(app, bg_cmd, &watch_tx, &mut watch_handle).await;
            }

            // File watch events
            Some(path) = watch_rx.recv(), if app.watch_active => {
                app.push_activity(types::ActivityKind::Watch, path.display().to_string());
                execute_command(app, AppCommand::AutoScan, &watch_tx, &mut watch_handle).await;
            }

            // Tick for general state + health checks (250ms)
            _ = tick_interval.tick() => {
                if let Some(cmd) = app.tick() {
                    execute_command(app, cmd, &watch_tx, &mut watch_handle).await;
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

