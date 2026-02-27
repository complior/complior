# Complior — Стандарты кодирования: Rust TUI

**Версия:** 3.0.0
**Дата:** 2026-02-19
**Автор:** Marcus (CTO) via Claude Code
**Зависимости:** [CODING-STANDARDS.md](CODING-STANDARDS.md) (общие правила)

---

## 1. Парадигма: Функциональный стиль

Rust не FP-язык, но мы следуем функциональным принципам:

```rust
// ✅ GOOD — чистые функции, иммутабельность по умолчанию
fn calculate_layout(area: Rect, panels: &[PanelConfig]) -> Vec<Rect> {
    panels.iter()
        .map(|p| constrain_panel(area, p))
        .collect()
}

// ✅ GOOD — builder pattern вместо мутабельной конфигурации
let client = EngineClient::builder()
    .port(port)
    .timeout(Duration::from_secs(5))
    .retry_count(3)
    .build()?;

// ❌ BAD — мутабельное состояние без необходимости
let mut layout = Vec::new();
for p in panels {
    let rect = constrain_panel(area, p);
    layout.push(rect); // мутация
}
```

---

## 2. Язык и инструменты

| Настройка | Значение |
|-----------|----------|
| Edition | 2024 |
| Форматирование | `rustfmt` (конфиг по умолчанию) |
| Линтер | `clippy` — `#![warn(clippy::all, clippy::pedantic)]` |
| Async | Tokio (multi-threaded runtime) |
| Сериализация | `serde` + `serde_json` |
| HTTP клиент | `reqwest` (async, TLS) |
| TUI | Ratatui 0.30+ + Crossterm |
| Подсветка синтаксиса | `syntect` |
| File tree | `ratatui-explorer` |
| Редактор | `ratatui-code-editor` |
| Сборка | `cargo build --release`, кросс-компиляция через `cross-rs` |
| Тесты | `cargo test` + `insta` для snapshot-тестирования |
| Логирование | `tracing` + `tracing-subscriber` |

---

## 3. Именование

### Файлы

| Тип | Паттерн | Пример |
|-----|---------|--------|
| Модуль | `snake_case.rs` | `engine_client.rs` |
| Unit тест | inline `mod tests` | В том же файле |
| Integration тест | `snake_case.rs` | `tests/tui_rendering.rs` |

### Код

| Тип | Паттерн | Пример |
|-----|---------|--------|
| Функции / переменные | `snake_case` | `render_score_panel`, `finding_count` |
| Типы / Enums | `PascalCase` | `ComplianceScore`, `AgentMode` |
| Константы | `UPPER_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_PORT` |
| Модули | `snake_case` | `engine_client`, `score_panel` |
| Traits | `PascalCase` (прилагательное) | `Renderable`, `Scannable` |
| Lifetime | `'a`, `'b` (короткие) или `'input`, `'config` (семантические) | `'a`, `'cfg` |
| Crate | `kebab-case` | `complior-tui` |
| Feature flags | `kebab-case` | `syntax-highlighting`, `dev-tools` |
| Макросы | `snake_case!` | `ensure!`, `bail!` |

---

## 4. Ownership и Borrowing

Основа безопасности памяти в Rust. Строгие правила:

```rust
// ✅ GOOD — заимствование вместо клонирования
fn render_findings(findings: &[Finding], area: Rect, frame: &mut Frame) {
    for finding in findings {
        render_finding_line(finding, frame);
    }
}

// ❌ BAD — ненужное клонирование
fn render_findings(findings: Vec<Finding>, area: Rect, frame: &mut Frame) {
    for finding in findings.clone() { // клон всего вектора — зачем?
        render_finding_line(&finding, frame);
    }
}

// ✅ GOOD — Cow для "возможно-модифицируемых" данных
use std::borrow::Cow;
fn format_message<'a>(msg: &'a str, truncate: bool) -> Cow<'a, str> {
    if truncate && msg.len() > 80 {
        Cow::Owned(format!("{}...", &msg[..77]))
    } else {
        Cow::Borrowed(msg)
    }
}

// ✅ GOOD — передача владения когда нужно
fn start_engine(config: EngineConfig) -> JoinHandle<()> {
    tokio::spawn(async move {
        // config перемещён сюда, spawn владеет им
        let client = connect(config.port).await;
    })
}
```

### Правила заимствования

| Правило | Почему |
|---------|--------|
| Предпочитай `&T` и `&[T]` для чтения | Избегает ненужного копирования |
| `&mut T` только когда мутация необходима | Минимизация мутабельности |
| `Clone` только если семантически нужна копия | `.clone()` без причины — code smell |
| `Cow<'_, str>` для строк "может быть модифицируемых" | Лучше чем всегда `String` |
| `Arc<T>` для shared ownership между потоками | Не `Rc<T>` — мы async + multi-threaded |
| `impl AsRef<str>` / `impl Into<String>` для гибких API | Принимаем и `&str`, и `String` |

---

## 5. Lifetime Annotations

```rust
// ✅ GOOD — lifetime когда возвращаем ссылку на входные данные
fn find_critical<'a>(findings: &'a [Finding]) -> Option<&'a Finding> {
    findings.iter().find(|f| f.severity == Severity::Critical)
}

// ✅ GOOD — lifetime elision работает, явная аннотация не нужна
fn first_line(text: &str) -> &str {
    text.lines().next().unwrap_or("")
}

// ✅ GOOD — 'static только для данных, живущих всё время программы
static SEVERITY_LABELS: &[&str] = &["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

// ❌ BAD — 'static там, где не нужен
fn process(data: &'static str) -> String { ... } // Слишком ограничительно
```

---

## 6. Перечисления (Enums) — не строки

```rust
// ✅ GOOD — enum для конечного множества значений
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
enum AgentMode {
    Build,
    Comply,
    Audit,
    Learn,
}

// ✅ GOOD — enum с данными (algebraic data types)
#[derive(Debug)]
enum EngineEvent {
    TokenReceived { content: String, model: String },
    ScanComplete { score: u8, findings: Vec<Finding> },
    Error { code: String, message: String },
    Connected,
    Disconnected,
}

// ❌ BAD — строки для конечных множеств
let mode: String = "build".to_string(); // Нет type safety
```

---

## 7. Pattern Matching — исчерпывающий

```rust
// ✅ GOOD — match покрывает все варианты
fn severity_color(severity: Severity) -> Color {
    match severity {
        Severity::Critical => Color::Red,
        Severity::High => Color::LightRed,
        Severity::Medium => Color::Yellow,
        Severity::Low => Color::Blue,
        Severity::Info => Color::Gray,
    }
    // Если добавить новый Severity — компилятор ЗАСТАВИТ обработать
}

// ❌ BAD — wildcard `_` в match, где нужна полнота
fn severity_color(severity: Severity) -> Color {
    match severity {
        Severity::Critical => Color::Red,
        _ => Color::White, // Скрывает необработанные варианты
    }
}
```

---

## 8. Trait реализации

```rust
// ✅ GOOD — derive всё что можно
#[derive(Debug, Clone, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
struct Finding {
    rule: String,
    severity: Severity,
    message: String,
    file: PathBuf,
    line: usize,
}

// ✅ GOOD — Display для человеко-читаемого вывода
impl fmt::Display for Finding {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {} ({}:{})", self.severity, self.message, self.file.display(), self.line)
    }
}

// ✅ GOOD — From для конвертации ошибок
impl From<reqwest::Error> for TuiError {
    fn from(err: reqwest::Error) -> Self {
        TuiError::EngineConnection(err)
    }
}
```

---

## 9. Обработка ошибок

```rust
// thiserror для библиотечных/модульных ошибок
#[derive(Debug, thiserror::Error)]
enum TuiError {
    #[error("Ошибка подключения к движку: {0}")]
    EngineConnection(#[from] reqwest::Error),

    #[error("Ошибка рендеринга: {0}")]
    Render(String),

    #[error("Ошибка конфигурации: {0}")]
    Config(#[from] toml::de::Error),

    #[error("Ошибка парсинга SSE: {0}")]
    SseParse(String),

    #[error("Движок не отвечает (timeout {0}ms)")]
    Timeout(u64),
}

// color_eyre для main() — красивые трассировки при разработке
fn main() -> color_eyre::Result<()> {
    color_eyre::install()?;
    let config = load_config()?;
    run_tui(config)?;
    Ok(())
}
```

### Правила

| Правило | Почему |
|---------|--------|
| Никогда `unwrap()` в продакшн-коде | Паника обрушивает процесс |
| `expect("контекст")` только если panic = баг | Документирует инвариант |
| `?` для проброса ошибок вверх | Лаконично, type-safe |
| `thiserror` для enum ошибок модулей | Derive `Display`, `Error`, `From` |
| `color_eyre` только в `main()` | Dev-диагностика |
| `anyhow` запрещён в библиотечном коде | Стирает типы |
| `.wrap_err("...")` для контекста | Понятные сообщения |

```rust
// ✅ GOOD — `?` с контекстом
use color_eyre::eyre::WrapErr;

let config = std::fs::read_to_string(&config_path)
    .wrap_err_with(|| format!("Не удалось прочитать конфиг: {}", config_path.display()))?;

// ✅ GOOD — expect с документированным инвариантом
let port = config.port.expect("port ОБЯЗАН быть установлен после validate()");

// ❌ BAD — unwrap без контекста
let config = std::fs::read_to_string("config.toml").unwrap();
```

---

## 10. Async (Tokio)

```rust
// ✅ GOOD — async fn для I/O-bound операций
async fn fetch_engine_status(client: &reqwest::Client, port: u16) -> Result<EngineStatus, TuiError> {
    let resp = client
        .get(format!("http://127.0.0.1:{port}/status"))
        .timeout(Duration::from_secs(3))
        .send()
        .await?;
    let status = resp.json::<EngineStatus>().await?;
    Ok(status)
}

// ✅ GOOD — select! для конкурентного ожидания (main event loop)
loop {
    tokio::select! {
        event = terminal_events.next() => {
            if let Some(event) = event {
                handle_key_event(event, &mut app)?;
            }
        }
        message = sse_stream.next() => {
            if let Some(msg) = message {
                app.process_engine_event(msg?);
            }
        }
        _ = tokio::time::sleep(Duration::from_millis(16)) => {
            // 60fps tick для анимаций (spinner, gauge)
            app.tick();
        }
    }
    terminal.draw(|frame| render(&app, frame))?;
}

// ❌ BAD — блокирующий I/O в async контексте
async fn load_config() -> Config {
    let data = std::fs::read_to_string("config.toml").unwrap(); // Блокирует runtime!
    toml::from_str(&data).unwrap()
}
```

### Правила async

| Правило | Почему |
|---------|--------|
| `tokio::fs` вместо `std::fs` в async | `std::fs` блокирует runtime thread |
| `tokio::spawn` для фоновых задач | Не блокирует текущий поток |
| `tokio::select!` для мультиплексирования | Event loop паттерн для TUI |
| Не держи `MutexGuard` через `.await` | Deadlock |
| `tokio::sync::Mutex` для shared state | std Mutex не async-safe |
| `tokio::sync::mpsc` для каналов | Async-ready, backpressure |
| `CancellationToken` для graceful shutdown | Чистое завершение |

```rust
// ❌ BAD — MutexGuard через await point
let guard = state.lock().await;
let data = fetch_remote(guard.url()).await; // Другие задачи ждут!
guard.update(data);

// ✅ GOOD — минимизируй время удержания lock
let url = {
    let guard = state.lock().await;
    guard.url().to_string()
}; // guard дропнут
let data = fetch_remote(&url).await;
{
    let mut guard = state.lock().await;
    guard.update(data);
} // guard дропнут
```

---

## 11. Unsafe

- **Запрещён** без обоснования через ADR.
- TUI-клиент не должен требовать `unsafe` — это тонкий UI-клиент.
- Если `unsafe` необходим (FFI, performance-critical path) — оборачивай в safe API:

```rust
// ✅ GOOD — safe обёртка над unsafe
pub fn fast_hash(data: &[u8]) -> u64 {
    // SAFETY: data — valid slice, функция не мутирует вход
    unsafe { internal_hash_impl(data.as_ptr(), data.len()) }
}

// ❌ BAD — unsafe без обёртки и комментария SAFETY
let ptr = data.as_ptr();
unsafe { *ptr.add(5) = 0; }
```

---

## 12. Clippy-линты

```toml
# Cargo.toml
[lints.clippy]
all = "warn"
pedantic = "warn"
nursery = "warn"
# Допускаемые исключения
module_name_repetitions = "allow"  # struct TuiConfig в модуле tui — ок
must_use_candidate = "allow"       # Не на каждой функции
missing_errors_doc = "allow"       # Doc comments — не на MVP
```

### Критические линты (никогда не подавлять)

| Линт | Что ловит |
|------|-----------|
| `clippy::unwrap_used` | `.unwrap()` в не-тестовом коде |
| `clippy::panic` | Явные `panic!()` |
| `clippy::todo` | `todo!()` в коммитах |
| `clippy::dbg_macro` | `dbg!()` в коммитах |
| `clippy::print_stdout` | `println!()` — используй `tracing` |
| `clippy::wildcard_enum_match_arm` | `_ =>` в match по нашим enum |
| `clippy::large_enum_variant` | Enum варианты > 200 байт |
| `clippy::clone_on_ref_ptr` | `.clone()` на `Arc`/`Rc` без причины |

### Rustfmt

```toml
# rustfmt.toml
edition = "2024"
max_width = 100
use_field_init_shorthand = true
use_try_shorthand = true
```

---

## 13. Архитектура и паттерны проектирования

### 13.1 Трёхслойная архитектура TUI

```
┌─────────────────────────────────────────────────┐
│  Presentation Layer (views/, components/, widgets/)  │
│  Чистые функции: fn render(&App) → Frame             │
│  Нет побочных эффектов, нет сетевых вызовов          │
├─────────────────────────────────────────────────┤
│  Application Layer (app.rs, input.rs, main.rs)       │
│  Координация: event loop, state machine, commands    │
│  Единственный слой с &mut App                        │
├─────────────────────────────────────────────────┤
│  Infrastructure Layer (engine_client.rs, config.rs,  │
│  session.rs, providers.rs)                           │
│  I/O: HTTP, файлы, конфиг, SSE                      │
└─────────────────────────────────────────────────┘
```

| Слой | Отвечает за | Запрещено |
|------|-------------|-----------|
| **Presentation** | Рендеринг UI, layout, стили | Сетевые вызовы, мутация App, I/O |
| **Application** | Event loop, state transitions, command dispatch | Бизнес-логика (она в Engine) |
| **Infrastructure** | HTTP к Engine, файлы, конфиг | Рендеринг, прямой доступ к UI state |

### 13.2 Module System & Visibility

```rust
// ✅ GOOD — pub mod в mod.rs, контролируемый re-export
// components/mod.rs
pub mod toast;
pub mod spinner;
pub mod confirm_dialog;
pub mod undo_history;

// ✅ GOOD — pub(crate) для внутренних хелперов
pub(crate) fn render_owl_header(frame: &mut Frame, area: Rect) { ... }

// ✅ GOOD — private по умолчанию
fn interpolate(from: f64, to: f64, t: f64) -> f64 { ... }

// ❌ BAD — всё pub
pub fn internal_helper() { ... } // Утекает в публичный API
```

**Правила видимости:**

| Элемент | Видимость | Почему |
|---------|-----------|--------|
| Типы данных (struct, enum) | `pub` | Используются между модулями |
| Render-функции верхнего уровня | `pub` | Вызываются из dashboard.rs |
| View-специфичные хелперы | `pub(crate)` или `fn` | Не нужны вне crate |
| Константы модуля | `const` (private) | Видны только внутри модуля |
| Test helpers | `pub(crate)` в `#[cfg(test)]` | Переиспользуемы в тестах |

### 13.3 Import Rules — граф зависимостей

```
main.rs ──→ app.rs ──→ types.rs
  │           │
  │           ├──→ views/*       (только &App чтение)
  │           ├──→ components/*  (только &App чтение)
  │           └──→ theme.rs      (цвета и стили)
  │
  ├──→ engine_client.rs ──→ types.rs
  ├──→ input.rs ──→ types.rs, app.rs (только Action enum)
  ├──→ config.rs
  └──→ headless.rs ──→ engine_client.rs, config.rs
```

```rust
// ✅ GOOD — views импортируют только types и theme
// views/scan.rs
use crate::types::{Finding, ScanResult, Severity};
use crate::theme;
use crate::app::App;

// ✅ GOOD — input.rs возвращает Action, не мутирует App
use crate::types::Action;
pub fn handle_key_event(key: KeyEvent, app: &App) -> Action { ... }

// ❌ BAD — view импортирует engine_client
use crate::engine_client::EngineClient; // VIOLATION: presentation → infrastructure

// ❌ BAD — component мутирует App напрямую
pub fn render_toast(frame: &mut Frame, app: &mut App) { // &mut — violation!
    app.toasts.gc(); // side effect в render
}
```

### 13.4 Elm Architecture (MVU — Model-View-Update)

TUI следует паттерну Elm Architecture:

```
Event → handle_input() → Action → app.apply_action() → Option<AppCommand>
                                                              │
                         ┌────────────────────────────────────┘
                         ▼
              execute_command() [async I/O]
                         │
                         ▼
              app.update_state() → мутация AppState
                         │
                         ▼
              terminal.draw(|f| render(f, &app)) → pixels
```

```rust
// ✅ GOOD — Action как чистый value object (нет побочных эффектов)
#[derive(Debug, Clone, PartialEq)]
pub enum Action {
    None,
    Quit,
    SwitchView(ViewState),
    ScanStart,
    FixApply(String),
    ChatSend(String),
    Toast(ToastKind, String),
    ClickAt(ClickTarget),
}

// ✅ GOOD — AppCommand для side-effectful операций
#[derive(Debug)]
pub enum AppCommand {
    Scan,
    Fix(String),
    Chat(String),
    SaveSession,
    AutoScan,
}

// apply_action: Action → State mutation + optional Command
impl App {
    pub fn apply_action(&mut self, action: Action) -> Option<AppCommand> {
        match action {
            Action::None => None,
            Action::Quit => { self.running = false; None },
            Action::SwitchView(v) => { self.view_state = v; None },
            Action::ScanStart => Some(AppCommand::Scan), // I/O нужен — возвращаем Command
            Action::ChatSend(msg) => Some(AppCommand::Chat(msg)),
            Action::Toast(kind, msg) => { self.toasts.push(kind, msg); None },
            // ...
        }
    }
}
```

### 13.5 Продвинутые паттерны Rust

#### Newtype Pattern — type safety через обёртки

```rust
// ✅ GOOD — newtype предотвращает путаницу параметров
struct Port(u16);
struct Score(f64);
struct CheckId(String);

fn connect(port: Port) -> Result<()> { ... }
fn display_score(score: Score) -> Span { ... }

// Невозможно перепутать:
connect(Port(3099));        // ✅
connect(Score(72.0));       // ❌ Compile error!

// ❌ BAD — bare types, легко перепутать
fn connect(port: u16) -> Result<()> { ... }
fn display_score(score: f64) -> Span { ... }
connect(72); // Компилируется, но это score, не port!
```

#### Typestate Pattern — compile-time state machine

```rust
// ✅ GOOD — невалидные переходы невозможны на уровне типов
struct Disconnected;
struct Connected;
struct Scanning;

struct Engine<State> {
    client: reqwest::Client,
    base_url: String,
    _state: std::marker::PhantomData<State>,
}

impl Engine<Disconnected> {
    fn connect(self) -> Result<Engine<Connected>> {
        // Проверяем доступность Engine
        Ok(Engine { client: self.client, base_url: self.base_url, _state: PhantomData })
    }
}

impl Engine<Connected> {
    fn scan(self, path: &str) -> Result<Engine<Scanning>> { ... }
    fn disconnect(self) -> Engine<Disconnected> { ... }
}

impl Engine<Scanning> {
    fn get_result(&self) -> Result<ScanResult> { ... }
}

// Невозможно вызвать scan() без connect():
// Engine::<Disconnected>::scan() — не скомпилируется!
```

#### Builder Pattern — ergonomic construction

```rust
// ✅ GOOD — Builder для сложных конфигураций
pub struct EngineClientBuilder {
    host: String,
    port: u16,
    timeout: Duration,
    retries: u32,
}

impl EngineClientBuilder {
    pub fn new() -> Self {
        Self {
            host: "127.0.0.1".into(),
            port: 3099,
            timeout: Duration::from_secs(5),
            retries: 3,
        }
    }

    pub fn port(mut self, port: u16) -> Self { self.port = port; self }
    pub fn timeout(mut self, timeout: Duration) -> Self { self.timeout = timeout; self }
    pub fn retries(mut self, retries: u32) -> Self { self.retries = retries; self }

    pub fn build(self) -> EngineClient {
        EngineClient {
            client: reqwest::Client::builder()
                .timeout(self.timeout)
                .build()
                .expect("reqwest client build"),
            base_url: format!("http://{}:{}", self.host, self.port),
        }
    }
}

// Использование:
let client = EngineClientBuilder::new()
    .port(3199)
    .timeout(Duration::from_secs(10))
    .build();
```

#### Dependency Injection через параметры и closures

```rust
// ✅ GOOD — DI через параметры (как в TS factory functions)
pub fn execute_command(
    app: &mut App,
    cmd: AppCommand,
    sse_tx: mpsc::UnboundedSender<SseEvent>,  // канал инжектирован
    watch_tx: mpsc::UnboundedSender<PathBuf>,  // канал инжектирован
) {
    match cmd {
        AppCommand::Chat(msg) => {
            let client = app.engine_client.clone_for_stream();
            tokio::spawn(async move {
                client.chat_stream(&msg, sse_tx).await;
            });
        }
        // ...
    }
}

// ✅ GOOD — Trait-based DI для testability (продвинутый уровень)
pub trait EnginePort: Send + Sync {
    async fn scan(&self, path: &str) -> Result<ScanResult>;
    async fn fix(&self, check_id: &str) -> Result<FixResult>;
    async fn status(&self) -> Result<EngineStatus>;
}

// Production implementation
pub struct HttpEngineClient { /* reqwest */ }
impl EnginePort for HttpEngineClient { ... }

// Test implementation
pub struct MockEngineClient { pub scan_result: ScanResult }
impl EnginePort for MockEngineClient {
    async fn scan(&self, _path: &str) -> Result<ScanResult> {
        Ok(self.scan_result.clone())
    }
    // ...
}

// App становится generic или использует dyn
pub struct App<E: EnginePort = HttpEngineClient> {
    engine: E,
    // ...
}
```

#### Strategy Pattern через enum dispatch (вместо dyn Trait)

```rust
// ✅ GOOD — enum dispatch: zero-cost, exhaustive match
#[derive(Debug, Clone)]
pub enum OutputFormat {
    Json,
    Sarif,
    Human,
    Ci { threshold: u8, fail_on: Severity },
}

fn format_result(result: &ScanResult, format: &OutputFormat) -> String {
    match format {
        OutputFormat::Json => serde_json::to_string_pretty(result).unwrap_or_default(),
        OutputFormat::Sarif => format_sarif(result),
        OutputFormat::Human => format_human(result),
        OutputFormat::Ci { threshold, fail_on } => format_ci(result, *threshold, *fail_on),
    }
    // Новый формат → компилятор заставит добавить ветку
}

// ❌ BAD — dyn Trait для конечного множества вариантов
trait OutputFormatter { fn format(&self, result: &ScanResult) -> String; }
struct JsonFormatter;
struct SarifFormatter;
// Overhead: vtable, heap allocation, нет exhaustive check
```

### 13.6 Модульная организация — правила

| Правило | Почему |
|---------|--------|
| Один модуль = одна ответственность | SRP, тестируемость |
| Файлы < 500 строк (views < 300) | Читаемость |
| Модули общаются через `app.rs` (hub) | Star topology, нет circular deps |
| Новый view = новый файл в `views/` + `pub mod` в mod.rs | Единообразие |
| Новый компонент = файл в `components/` | Переиспользуемость |
| Shared types только в `types.rs` | Single source of truth |
| Тема только в `theme.rs` | Нет хардкода цветов |

### 13.7 IPC-клиент

```rust
// ✅ GOOD — IPC только localhost
let listener = TcpListener::bind("127.0.0.1:0").await?;
// Порт 0 = OS выбирает свободный, нет внешнего доступа

// ❌ BAD — слушать на всех интерфейсах
let listener = TcpListener::bind("0.0.0.0:3000").await?; // Открыт для мира!
```

### 13.8 Ключевые архитектурные принципы

- **TUI — тонкий клиент** — никакой бизнес-логики, никаких проверок комплаенса
- **Все данные от TS-движка** через HTTP/SSE
- **Views — чистые функции**: `fn render(frame: &mut Frame, app: &App)` — только чтение
- **Elm цикл**: Event → Action → Command → I/O → State Update → Render
- **Star topology**: модули не зависят друг от друга — только через `app.rs`
- **Цвета и стили** — только через `theme.rs`
- **Error boundary** — каждый слой конвертирует ошибки нижнего слоя в свой тип

---

## 14. Performance Patterns

### Stack vs Heap — когда что

```rust
// ✅ GOOD — фиксированный массив на стеке (0 аллокаций)
pub layer_progress: [LayerProgress; 5],

// ❌ BAD — Vec для фиксированного размера (heap аллокация)
pub layer_progress: Vec<LayerProgress>,

// ✅ GOOD — pre-allocation когда размер известен заранее
let mut items = Vec::with_capacity(findings.len());
for f in findings {
    items.push(transform(f));
}

// ❌ BAD — Vec::new() с множеством push → re-allocations
let mut items = Vec::new(); // 0, 1, 2, 4, 8... reallocations
for f in findings {
    items.push(transform(f));
}
```

### Generics vs `dyn Trait` — мономорфизация vs dynamic dispatch

```rust
// ✅ GOOD — generics: zero-cost, мономорфизация при компиляции
fn render_list<I: IntoIterator<Item = &Finding>>(items: I, frame: &mut Frame) {
    for item in items {
        render_line(item, frame);
    }
}

// ⚠️ ОСТОРОЖНО — dyn Trait: vtable lookup, heap allocation через Box
fn render_list(items: &[Box<dyn Renderable>], frame: &mut Frame) {
    for item in items {
        item.render(frame); // indirect call через vtable
    }
}
```

**Когда `dyn Trait` допустим:**
- Гетерогенная коллекция (разные типы в одном Vec)
- Plugin-архитектура (загрузка модулей в runtime)
- Размер binary критичен (мономорфизация раздувает код)

**В нашем TUI:** предпочитаем generics и enum dispatch — нет нужды в `dyn`.

### Избегание аллокаций

```rust
// ✅ GOOD — write! в существующий буфер, 0 аллокаций
use std::fmt::Write;
let mut buf = String::with_capacity(64);
write!(buf, "[{}] {} ({}:{})", severity, message, file, line).unwrap();

// ❌ BAD — format! каждый раз создаёт новый String
let msg = format!("[{}] {} ({}:{})", severity, message, file, line);

// ✅ GOOD — переиспользуй буфер между итерациями
let mut buf = String::with_capacity(128);
for finding in &findings {
    buf.clear();
    write!(buf, "{}: {}", finding.check_id, finding.message).unwrap();
    render_line(&buf, frame);
}

// ✅ GOOD — &str для строковых литералов, не аллоцируй
const FRAMES: &[&str] = &["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
```

### Правила

| Правило | Почему |
|---------|--------|
| `[T; N]` для фиксированных коллекций | Stack, нет heap alloc |
| `Vec::with_capacity(n)` когда размер ~известен | Одна аллокация вместо log(n) |
| Generics (`impl Trait`) по умолчанию | Zero-cost мономорфизация |
| `dyn Trait` только для гетерогенных коллекций | Dynamic dispatch + heap |
| `write!` в буфер vs `format!` | Переиспользуй аллокацию |
| `&[T]` для передачи срезов | Нет копии, нет владения |
| `iter().filter().map()` без промежуточного `collect()` | Lazy, 0 аллокаций до финального collect |

---

## 15. Iterator & String Patterns

### Итераторы — ленивые цепочки

```rust
// ✅ GOOD — цепочка без промежуточных аллокаций
let fixable: Vec<FixableItem> = findings
    .iter()
    .enumerate()
    .filter(|(_, f)| f.fix.is_some())
    .map(|(i, f)| FixableItem {
        finding_index: i,
        check_id: f.check_id.clone(),
        message: f.message.clone(),
        status: FixItemStatus::Pending,
    })
    .collect(); // единственная аллокация — финальный Vec

// ❌ BAD — промежуточные collect()
let with_fix: Vec<_> = findings.iter().filter(|f| f.fix.is_some()).collect(); // аллокация 1
let items: Vec<_> = with_fix.iter().map(|f| transform(f)).collect(); // аллокация 2
```

### `iter()` vs `into_iter()` vs `iter_mut()`

```rust
// iter() — заимствование, не потребляет коллекцию
let count = findings.iter().filter(|f| f.severity == Severity::Critical).count();
// findings всё ещё доступен

// into_iter() — потребляет коллекцию, перемещает элементы
let messages: Vec<String> = findings.into_iter().map(|f| f.message).collect();
// findings больше НЕ доступен (moved)

// iter_mut() — мутабельное заимствование
for finding in findings.iter_mut() {
    finding.status = CheckStatus::Reviewed;
}
```

### `filter_map` vs `filter().map()`

```rust
// ✅ GOOD — filter_map для Option-возвращающих трансформаций
let obligations: Vec<String> = values
    .iter()
    .filter_map(|v| v.as_str().map(String::from))
    .collect();

// ⚠️ VERBOSE — эквивалент через filter + map
let obligations: Vec<String> = values
    .iter()
    .filter(|v| v.as_str().is_some())
    .map(|v| v.as_str().unwrap().to_string()) // unwrap после filter — safe но ugly
    .collect();
```

### Полезные адаптеры

```rust
// position() — найти индекс
let active = layers.iter().position(|l| l.status == LayerStatus::Running);

// find() — первый подходящий элемент
let critical = findings.iter().find(|f| f.severity == Severity::Critical);

// any() / all() — предикаты (short-circuit)
let has_critical = findings.iter().any(|f| f.severity == Severity::Critical);
let all_pass = findings.iter().all(|f| f.r#type == "pass");

// fold() — аккумуляция с начальным значением
let total_weight = findings.iter().fold(0u32, |acc, f| acc + severity_weight(f.severity));

// chunks() — обработка группами (полезно для UI-строк)
for row in items.chunks(3) {
    render_row(row, frame);
}

// zip() — параллельная итерация
for (finding, rect) in findings.iter().zip(layout_rects.iter()) {
    render_finding(finding, rect, frame);
}
```

### String — decision tree

```
Нужна строка?
├── Литерал → &'static str или &str
│     "hello", SEVERITY_LABELS[i]
├── Параметр функции (только чтение) → &str
│     fn render_title(title: &str)
├── Гибкий API (принимает и &str, и String) → impl AsRef<str>
│     fn push_toast(msg: impl Into<String>)
├── Владение нужно (хранение в struct) → String
│     pub message: String
├── Может быть модифицирован, может нет → Cow<'_, str>
│     fn truncate(msg: &str) -> Cow<'_, str>
└── Файловый путь → PathBuf (владение) / &Path (заимствование)
      pub project_path: PathBuf
      fn scan(path: &Path)
```

### PathBuf vs &Path

```rust
// ✅ GOOD — PathBuf для хранения, &Path для передачи
pub struct App {
    pub project_path: PathBuf, // владеет путём
}

fn load_config(path: &Path) -> Result<Config> { // заимствует
    let content = tokio::fs::read_to_string(path).await?;
    // ...
}

// ✅ GOOD — конвертация
let path = config.project_path
    .as_deref()                          // Option<&str>
    .map(PathBuf::from)                  // Option<PathBuf>
    .unwrap_or_else(|| PathBuf::from(".")); // fallback

// ❌ BAD — String для путей
pub project_path: String, // Нет OS-specific path handling
```

### `to_string_lossy()` для OsStr

```rust
// ✅ GOOD — безопасная конвертация OsStr → String (non-UTF8 заменяется на ?)
let name = path.file_stem()
    .map(|s| s.to_string_lossy().to_string())
    .unwrap_or_default();
```

---

## 16. Serde & Validation

### Derive-атрибуты

```rust
// ✅ GOOD — полная конфигурация serde для Engine JSON API
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]  // JSON camelCase → Rust snake_case
pub struct Finding {
    pub check_id: String,
    pub r#type: String,             // `type` — зарезервированное слово
    pub message: String,
    pub severity: Severity,
    #[serde(default)]               // отсутствующее поле → None
    pub obligation_id: Option<String>,
    #[serde(default)]
    pub article_reference: Option<String>,
    #[serde(default)]
    pub fix: Option<String>,
}
```

### Ключевые атрибуты serde

| Атрибут | Назначение | Пример |
|---------|-----------|--------|
| `rename_all = "camelCase"` | JSON ↔ Rust конвертация | Всегда для Engine API |
| `default` | Отсутствующее поле → `Default::default()` | Optional fields |
| `deny_unknown_fields` | Ошибка при лишних полях | Строгая валидация конфига |
| `skip_serializing_if = "Option::is_none"` | Не включать None в JSON | Компактный output |
| `rename = "type"` | Кастомное имя поля | Зарезервированные слова |
| `flatten` | Вложенный объект → flat struct | Composition |
| `tag = "kind"` | Internally tagged enum | Discriminated unions |

### Custom Serialize — когда derive недостаточно

```rust
// Когда формат вывода отличается от структуры
impl Serialize for ScoreBreakdown {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut state = s.serialize_struct("ScoreBreakdown", 4)?;
        state.serialize_field("totalScore", &self.total_score)?;
        // enum → lowercase string для JSON
        state.serialize_field("zone", &format!("{:?}", self.zone).to_lowercase())?;
        state.serialize_field("categoryScores", &self.category_scores)?;
        state.end()
    }
}
```

### Enum сериализация — tagged unions

```rust
// ✅ GOOD — internally tagged enum для Engine SSE
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "event", content = "data")]
pub enum EngineMessage {
    #[serde(rename = "token")]
    Token { content: String },
    #[serde(rename = "scan.complete")]
    ScanComplete { score: f64, findings: Vec<Finding> },
    #[serde(rename = "error")]
    Error { code: String, message: String },
}
```

### Обработка ошибок десериализации

```rust
// ✅ GOOD — контекстная ошибка при парсинге JSON от Engine
let scan_result: ScanResult = serde_json::from_str(&body)
    .map_err(|e| TuiError::EngineParse(format!(
        "Не удалось распарсить /scan ответ: {e}\nBody: {body:.200}" // первые 200 символов
    )))?;

// ✅ GOOD — fallback при невалидных данных
let score = response.get("score")
    .and_then(|v| v.as_f64())
    .unwrap_or(0.0); // безопасный default вместо panic

// ❌ BAD — unwrap на JSON-парсинге
let result: ScanResult = serde_json::from_str(&body).unwrap(); // panic на невалидном JSON
```

### Валидация после десериализации

```rust
// ✅ GOOD — TryFrom для валидации бизнес-правил
#[derive(Debug, Deserialize)]
struct RawConfig {
    port: u16,
    jurisdiction: String,
}

#[derive(Debug)]
struct ValidConfig {
    port: u16,
    jurisdiction: Jurisdiction,
}

impl TryFrom<RawConfig> for ValidConfig {
    type Error = ConfigError;

    fn try_from(raw: RawConfig) -> Result<Self, Self::Error> {
        if raw.port == 0 {
            return Err(ConfigError::InvalidPort);
        }
        let jurisdiction = raw.jurisdiction.parse::<Jurisdiction>()
            .map_err(|_| ConfigError::UnknownJurisdiction(raw.jurisdiction))?;
        Ok(ValidConfig { port: raw.port, jurisdiction })
    }
}
```

---

## 17. State Management & Event Loop

### Архитектура состояния — Elm-паттерн

```
KeyEvent / MouseEvent / SSE / Timer
           │
           ▼
    ┌──────────────┐
    │  handle_input │ → Action enum
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  app.update() │ → мутирует AppState
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  render()    │ → читает &AppState → Frame
    └──────────────┘
```

### AppState — flat struct с domain-группировкой

```rust
// ✅ GOOD — flat верхний уровень, вложенность для доменов
pub struct App {
    // Lifecycle
    pub running: bool,
    pub mode: Mode,
    pub view_state: ViewState,

    // Navigation
    pub active_panel: Panel,
    pub input_mode: InputMode,

    // Engine connection
    pub engine_status: EngineConnectionStatus,
    pub engine_client: EngineClient,

    // Chat (domain state)
    pub messages: Vec<ChatMessage>,
    pub input: String,
    pub streaming_response: Option<String>,

    // View-specific state (выносим в sub-structs)
    pub scan_view: ScanViewState,
    pub fix_view: FixViewState,
    pub timeline_view: TimelineViewState,

    // UI state
    pub animation: AnimationState,
    pub toasts: ToastStack,
    pub click_areas: Vec<(Rect, ClickTarget)>,
}

// ❌ BAD — глубокая вложенность
pub struct App {
    pub state: AppState {
        pub ui: UiState {
            pub panels: PanelState { ... } // 4 уровня — читать невозможно
        }
    }
}
```

### Action enum — единая точка обработки событий

```rust
// ✅ GOOD — все действия через enum, exhaustive match
#[derive(Debug, Clone, PartialEq)]
pub enum Action {
    None,
    Quit,
    SwitchView(ViewState),
    ScanStart,
    ScanComplete(ScanResult),
    FixApply(String),
    FixUndo,
    ChatSend(String),
    WatchToggle,
    ClickAt(ClickTarget),
    Toast(ToastKind, String),
    ThemeNext,
    // ...
}

// Обработка — один match в app.rs
impl App {
    pub fn handle_action(&mut self, action: Action) {
        match action {
            Action::None => {},
            Action::Quit => self.running = false,
            Action::SwitchView(v) => self.view_state = v,
            Action::ScanStart => self.start_scan(),
            Action::Toast(kind, msg) => self.toasts.push(kind, msg),
            // ... exhaustive
        }
    }
}
```

### Event Loop — tokio::select!

```rust
// ✅ GOOD — мультиплексированный event loop
async fn run_event_loop(
    terminal: &mut Terminal<impl Backend>,
    app: &mut App,
    sse_rx: &mut mpsc::UnboundedReceiver<SseEvent>,
    watch_rx: &mut mpsc::UnboundedReceiver<PathBuf>,
) -> color_eyre::Result<()> {
    let mut event_stream = EventStream::new();
    let mut tick = tokio::time::interval(Duration::from_millis(250));
    let mut anim_tick = tokio::time::interval(Duration::from_millis(50));

    while app.running {
        // Рендер ПЕРЕД ожиданием событий (immediate mode)
        terminal.draw(|frame| render(frame, app))?;

        tokio::select! {
            // 1. Terminal input (клавиатура, мышь)
            maybe_event = event_stream.next() => {
                if let Some(Ok(event)) = maybe_event {
                    let action = handle_input(event, app);
                    app.handle_action(action);
                }
            }

            // 2. SSE от Engine (токены, scan results)
            Some(event) = sse_rx.recv() => {
                app.handle_sse_event(event);
            }

            // 3. File watcher (изменения файлов)
            Some(path) = watch_rx.recv(), if app.watch_active => {
                app.queue_rescan(path);
            }

            // 4. General tick (250ms) — polling, status check
            _ = tick.tick() => {
                app.tick();
            }

            // 5. Animation tick (50ms) — спиннеры, gauge анимация
            _ = anim_tick.tick(), if app.animation.active() => {
                app.animation.step();
            }
        }
    }
    Ok(())
}
```

### Каналы — когда что

| Канал | Когда | Пример |
|-------|-------|--------|
| `mpsc::unbounded_channel` | Один producer → один consumer, поток событий | SSE events, file watch events |
| `mpsc::channel(n)` | Backpressure нужен (ограниченный буфер) | Rate-limited API calls |
| `watch::channel` | Broadcast последнего значения (многие читатели) | Engine connection status |
| `broadcast::channel` | Многие producers, многие consumers | Не используем в TUI |
| `oneshot::channel` | Один запрос → один ответ | Async command result |

```rust
// ✅ GOOD — unbounded для event stream (SSE события приходят быстро)
let (sse_tx, mut sse_rx) = mpsc::unbounded_channel::<SseEvent>();

// ✅ GOOD — oneshot для однократного ответа
let (resp_tx, resp_rx) = oneshot::channel::<ScanResult>();
tokio::spawn(async move {
    let result = client.scan(path).await;
    let _ = resp_tx.send(result);
});
let result = resp_rx.await?;
```

---

## 18. Ratatui Patterns

### Render — чистые функции

```rust
// ✅ GOOD — render принимает &App (immutable), пишет только в Frame
pub fn render_dashboard(frame: &mut Frame, app: &App) {
    let area = frame.area();
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2),   // header
            Constraint::Min(10),     // body
            Constraint::Length(1),   // footer
        ])
        .split(area);

    render_header(frame, chunks[0], app);
    render_body(frame, chunks[1], app);
    render_footer(frame, chunks[2], app);
}

// ❌ BAD — render мутирует состояние
pub fn render_dashboard(frame: &mut Frame, app: &mut App) {
    app.last_render_time = Instant::now(); // побочный эффект!
}
```

### Layout Composition — вложенные split

```rust
// ✅ GOOD — иерархическая разметка через Layout
fn render_fix_view(frame: &mut Frame, area: Rect, app: &App) {
    // Горизонтальный split: список | diff preview
    let split_pct = u16::from(app.fix_split_pct.clamp(25, 75));
    let cols = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(split_pct),
            Constraint::Percentage(100 - split_pct),
        ])
        .split(area);

    render_checklist(frame, cols[0], app);
    render_diff_preview(frame, cols[1], app);
}
```

### Block + Inner — стандартный паттерн

```rust
// ✅ GOOD — Block определяет рамку, inner() даёт область для контента
let block = Block::default()
    .title(format!(" Findings ({count}) "))
    .title_style(theme::title_style())
    .borders(Borders::ALL)
    .border_style(Style::default().fg(t.border));

let inner = block.inner(area);  // область внутри рамки
frame.render_widget(block, area);

// Теперь рендерим контент в inner
let list = List::new(items).highlight_style(theme::highlight_style());
frame.render_stateful_widget(list, inner, &mut list_state);
```

### Стили — только через theme.rs

```rust
// ✅ GOOD — все цвета из theme
let t = theme::current();
let style = Style::default().fg(t.fg).bg(t.bg);
let accent = Style::default().fg(t.accent).add_modifier(Modifier::BOLD);
let zone_color = match zone {
    ScoreZone::Red => t.zone_red,
    ScoreZone::Yellow => t.zone_yellow,
    ScoreZone::Green => t.zone_green,
};

// ❌ BAD — хардкод цветов в view
let style = Style::default().fg(Color::Rgb(151, 202, 0)); // magic color
```

### Span + Line — стилизированный текст

```rust
// ✅ GOOD — Span для частей строки с разными стилями
let line = Line::from(vec![
    Span::styled(
        severity.marker(),
        Style::default().fg(severity_color).add_modifier(Modifier::BOLD),
    ),
    Span::raw(" "),
    Span::styled(&finding.check_id, Style::default().fg(t.accent)),
    Span::raw(" — "),
    Span::styled(&finding.message, Style::default().fg(t.fg)),
]);

// ❌ BAD — format! теряет стили
let text = format!("{} {} — {}", severity.marker(), finding.check_id, finding.message);
// Всё одним цветом — информация о severity потеряна
```

### Stateful Widget — List с выделением

```rust
// ✅ GOOD — StatefulWidget для скроллируемых списков
pub struct FixViewState {
    pub list_state: ListState,
    pub fixable_findings: Vec<FixableItem>,
}

// В render:
let items: Vec<ListItem> = app.fix_view.fixable_findings
    .iter()
    .map(|item| {
        let style = if item.selected { theme::selected_style() } else { Style::default() };
        ListItem::new(item.label()).style(style)
    })
    .collect();

let list = List::new(items)
    .highlight_style(theme::highlight_style())
    .highlight_symbol("▸ ");

// render_stateful_widget хранит scroll offset в list_state
frame.render_stateful_widget(list, inner, &mut app.fix_view.list_state.clone());
```

### Click Areas — mouse hit-testing

```rust
// ✅ GOOD — регистрация кликабельных зон после рендера
impl App {
    pub fn rebuild_click_areas(&mut self, width: u16, height: u16) {
        self.click_areas.clear();

        // Footer tabs
        let footer_y = height.saturating_sub(1);
        let tab_w: u16 = 10;
        for (i, view) in VIEWS.iter().enumerate() {
            let x = (i as u16) * tab_w;
            self.click_areas.push((
                Rect::new(x, footer_y, tab_w, 1),
                ClickTarget::ViewTab(*view),
            ));
        }
    }
}

// В input handler — проверка попадания
fn handle_click(col: u16, row: u16, app: &App) -> Action {
    for (rect, target) in &app.click_areas {
        if col >= rect.x && col < rect.x + rect.width
            && row >= rect.y && row < rect.y + rect.height
        {
            return Action::ClickAt(target.clone());
        }
    }
    Action::None
}
```

### Animation — state machine

```rust
// ✅ GOOD — конечный автомат для анимаций
pub struct AnimationState {
    pub active: Vec<Animation>,
    pub enabled: bool,
}

impl AnimationState {
    pub fn step(&mut self) {
        for anim in &mut self.active {
            if anim.is_done() {
                anim.completed = true;
            }
        }
        self.active.retain(|a| !a.completed); // GC завершённых
    }

    pub fn active(&self) -> bool {
        self.enabled && !self.active.is_empty()
    }
}
```

---

## 19. Тестирование

### Фреймворк

| Слой | Фреймворк | Scope |
|------|-----------|-------|
| Unit | `cargo test` | State management, input handling, data transforms |
| Snapshot | `insta` | TUI layout snapshots (rendered buffer) |
| Integration | `tests/` directory | Engine client, full render pipeline |
| E2E | Shell scripts (`tests/e2e/`) | CLI → Engine → Result |

### Целевое покрытие

| Слой | Цель |
|------|------|
| TUI views | Snapshot (insta) |
| Engine client | 80%+ |
| State management | 80%+ |
| Input handling | 90%+ |
| Config parsing | 90%+ |
| Components (spinner, toast, etc.) | 80%+ |

### Test Naming

- `fn test_[unit]_[expected]()` — Rust convention
- `fn test_[unit]_[condition]_[expected]()` — для условий
- Factory helpers: `create_test_app()`, `create_test_config()`, `create_mock_finding()`

### Unit-тесты — в том же файле

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // ✅ GOOD — фабрика для тестовых данных
    fn create_test_app() -> App {
        App::new(TuiConfig::default())
    }

    fn create_mock_finding(severity: Severity) -> Finding {
        Finding {
            check_id: "OBL-015".into(),
            r#type: "fail".into(),
            message: "Missing AI disclosure".into(),
            severity,
            obligation_id: Some("OBL-015".into()),
            article_reference: Some("Art. 50(1)".into()),
            fix: Some("Add disclosure header".into()),
        }
    }

    #[test]
    fn test_severity_color_mapping() {
        assert_eq!(severity_color(Severity::Critical), Color::Red);
        assert_eq!(severity_color(Severity::High), Color::LightRed);
        assert_eq!(severity_color(Severity::Info), Color::Gray);
    }

    #[test]
    fn test_toast_stack_max_visible() {
        let mut stack = ToastStack::default();
        for i in 0..7 {
            stack.push(ToastKind::Info, format!("msg {i}"));
        }
        assert_eq!(stack.toasts.len(), 5); // MAX_VISIBLE = 5
    }

    #[test]
    fn test_animation_gc() {
        let mut state = AnimationState::new(true);
        state.push(Animation::new(AnimKind::Flash, 1));
        assert!(!state.active.is_empty());

        std::thread::sleep(Duration::from_millis(5));
        state.step();
        assert!(state.active.is_empty(), "Completed should be GC'd");
    }
}
```

### Input handler — тестирование через Action

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

    fn key(code: KeyCode) -> KeyEvent {
        KeyEvent::new(code, KeyModifiers::NONE)
    }

    fn ctrl(code: KeyCode) -> KeyEvent {
        KeyEvent::new(code, KeyModifiers::CONTROL)
    }

    #[test]
    fn test_quit_on_ctrl_c() {
        let app = create_test_app();
        let action = handle_key_event(ctrl(KeyCode::Char('c')), &app);
        assert!(matches!(action, Action::Quit));
    }

    #[test]
    fn test_watch_toggle_on_w() {
        let mut app = create_test_app();
        app.input_mode = InputMode::Normal;
        let action = handle_key_event(key(KeyCode::Char('w')), &app);
        assert!(matches!(action, Action::WatchToggle));
    }
}
```

### Snapshot-тесты — insta + TestBackend

```rust
use ratatui::{backend::TestBackend, Terminal};
use insta::assert_snapshot;

#[test]
fn test_dashboard_layout_snapshot() {
    let backend = TestBackend::new(80, 24);
    let mut terminal = Terminal::new(backend).unwrap();
    let app = create_test_app();

    terminal.draw(|frame| render_dashboard(frame, &app)).unwrap();

    let buffer = terminal.backend().buffer().clone();
    assert_snapshot!(format!("{buffer:?}"));
}
```

### Мокирование — что мокать, что нет

| Мокаем (внешние границы) | НЕ мокаем (детерминистичный код) |
|---|---|
| Engine HTTP ответы (`mockito` / `wiremock`) | State management (тестируем напрямую) |
| SSE stream (mpsc канал с тестовыми событиями) | Input handling (pure function) |
| File system (`tempdir`) | Render functions (snapshot через TestBackend) |
| Network (reqwest mock) | Theme / style calculations |

```rust
// ✅ GOOD — mock engine через тестовый канал
#[tokio::test]
async fn test_sse_token_handling() {
    let (tx, mut rx) = mpsc::unbounded_channel::<SseEvent>();
    let mut app = create_test_app();

    // Симулируем SSE от Engine
    tx.send(SseEvent::Token("Hello".into())).unwrap();
    tx.send(SseEvent::Token(" world".into())).unwrap();
    tx.send(SseEvent::Done).unwrap();

    // Обрабатываем события
    while let Ok(event) = rx.try_recv() {
        app.handle_sse_event(event);
    }

    assert_eq!(app.streaming_response.as_deref(), Some("Hello world"));
}

// ✅ GOOD — mock HTTP через wiremock
#[tokio::test]
async fn test_engine_scan_request() {
    let mock_server = wiremock::MockServer::start().await;

    wiremock::Mock::given(wiremock::matchers::method("POST"))
        .and(wiremock::matchers::path("/scan"))
        .respond_with(wiremock::ResponseTemplate::new(200)
            .set_body_json(serde_json::json!({
                "score": { "totalScore": 72.0, "zone": "yellow" },
                "findings": []
            })))
        .mount(&mock_server)
        .await;

    let client = EngineClient::new(&mock_server.uri());
    let result = client.scan(".").await.unwrap();
    assert!(result.get("score").is_some());
}
```

### Async тесты — `#[tokio::test]` vs `#[test]`

```rust
// Используй #[test] для синхронного кода (state, rendering, parsing)
#[test]
fn test_score_zone_classification() { ... }

// Используй #[tokio::test] ТОЛЬКО для async кода (network, channels, timers)
#[tokio::test]
async fn test_engine_connection_timeout() { ... }
```

---

## 20. Запрещённые практики

| Категория | Запрещено | Почему | Замена |
|-----------|-----------|--------|--------|
| **Safety** | `unwrap()` в продакшн | Паника | `?`, `expect("invariant")` |
| **Safety** | `unsafe` без ADR | Memory safety | Safe abstractions |
| **Safety** | `panic!()` в библиотечном коде | Обрушивает процесс | `Result<T, E>` |
| **Safety** | `todo!()` / `unimplemented!()` в коммитах | Runtime panic | Заглушка `Ok(default)` |
| **Debug** | `println!()` в коммитах | Нет структуры | `tracing` crate |
| **Debug** | `dbg!()` в коммитах | Dev-only | Убрать перед коммитом |
| **Clone** | `.clone()` без причины | Performance | `&T`, `Cow<T>`, `Arc<T>` |
| **Clone** | `.clone()` на `Arc`/`Rc` без необходимости | Confusion | Передавай ссылку |
| **Match** | Wildcard `_` на наших enum | Скрывает новые варианты | Exhaustive match |
| **Async** | `std::fs` в async | Блокирует runtime | `tokio::fs` |
| **Async** | `MutexGuard` через `.await` | Deadlock | Минимизируй scope lock |
| **Async** | `std::sync::Mutex` в async | Блокирует | `tokio::sync::Mutex` |
| **Strings** | `.to_string()` где можно `&str` | Allocation | Borrow, `Cow` |
| **Strings** | `format!()` в горячем цикле | Allocation каждый раз | `write!` в буфер |
| **Alloc** | `Vec::new()` + push в цикле с известным размером | Re-allocations | `Vec::with_capacity(n)` |
| **Alloc** | Промежуточные `collect()` в цепочке | Лишний Vec | Продолжи цепочку итераторов |
| **Dispatch** | `Box<dyn Trait>` без обоснования | Heap + vtable | Generics / enum dispatch |
| **Serde** | `unwrap()` на `serde_json::from_str` | Panic на невалидном JSON | `?` + контекстная ошибка |
| **Serde** | Отсутствие `#[serde(default)]` на Optional полях | Panic если поле отсутствует | `#[serde(default)]` |
| **Render** | Мутация `&mut App` в render-функциях | Побочные эффекты | Только `&App` |
| **Render** | Хардкод цветов в views | Consistency | `theme.rs` |
| **Render** | `format!()` для стилизованного текста | Теряет стили | `Span` + `Line` |
| **Logic** | Бизнес-логика в TUI | Архитектура | Всё в Engine |
| **Errors** | `anyhow` в библиотечном коде | Стирает типы | `thiserror` |

---

## 21. Организация файлов

```
tui/src/
├── main.rs              # Точка входа, color_eyre::install(), event loop
├── app.rs               # AppState + handle_action() + tick()
├── cli.rs               # Clap CLI: 7 subcommands (scan, fix, report, doctor, version, init, update)
├── headless.rs          # Headless mode handlers (JSON/SARIF/human output)
├── engine_client.rs     # HTTP/SSE клиент к TS-движку
├── input.rs             # KeyEvent/MouseEvent → Action mapping
├── animation.rs         # AnimationState: counter, flash, fade, spinner
├── session.rs           # Session save/load (.complior/sessions/)
├── providers.rs         # LLM provider configuration
├── config.rs            # TUI-специфичный конфиг (TOML + serde)
├── theme.rs             # Цвета + стили (единый источник, переключаемые темы)
├── types.rs             # Shared types (Finding, ScanResult, Severity, etc.)
├── views/               # Чистые функции рендеринга (fn render(&App) → Frame)
│   ├── mod.rs
│   ├── dashboard.rs     # Главный dashboard + dispatch по ViewState
│   ├── chat.rs          # Чат-панель + streaming
│   ├── scan.rs          # Scan view с layer progress + owl animation
│   ├── fix.rs           # Fix view: checklist + diff preview
│   ├── sidebar.rs       # Навигация + file tree + score badge
│   ├── timeline.rs      # Timeline view (compliance deadlines)
│   └── report.rs        # Report preview
├── components/          # Переиспользуемые UI-компоненты
│   ├── mod.rs
│   ├── spinner.rs       # Animated braille spinner
│   ├── toast.rs         # Toast notification stack (max 5, auto-expire)
│   ├── confirm_dialog.rs # Modal confirmation dialog
│   ├── quick_actions.rs # Quick action palette
│   ├── zoom.rs          # Zoomable panel overlay
│   └── undo_history.rs  # Undo history list
└── widgets/             # Low-level Ratatui widgets
    └── ...              # Custom widget implementations
```

---

**Последнее обновление:** 2026-02-19 v3.0
**Автор:** Marcus (CTO)
