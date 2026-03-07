# Sprint GUARD — Guard API R&D (Параллельный трек)

**Версия:** 1.0.0
**Дата:** 2026-03-07
**Статус:** Planning
**Длительность:** ~11 недель (параллельно S05-S08)
**Команда:** ML-инженер + интеграция с основной командой

---

## Обзор

Guard API — отдельный R&D трек для создания fine-tuned ML-модели на базе Qwen 2.5 7B, которая решает 5 задач compliance-классификации в реальном времени. Модель заменяет дорогостоящие LLM-вызовы (GPT-4, Claude) для рутинных проверок, обеспечивая <200ms latency и суверенный хостинг в ЕС (Hetzner GPU, Германия).

**5 задач классификации:**
1. **Prohibited Detection** — Art. 5 EU AI Act, 8 категорий запрещённых практик
2. **PII/Sanitize Detection** — GDPR, европейские PII-паттерны (DE, FR, IT, ES)
3. **Bias Detection** — 15 защищённых характеристик (Art. 10)
4. **Prompt Injection Detection** — атаки на AI-систему
5. **Escalation Detection** — Art. 14, необходимость передачи человеку

**Цель:** Fine-tuned ML-модель для 5 задач compliance-классификации, развёрнутая на Hetzner GPU с <200ms p95 latency и >50 req/s throughput.

**Архитектурная интеграция:** Guard API подключается к Complior через SDK (`guard/client.ts`) и Engine (`guard-service.ts`). Существующие SDK pre/post-hooks (`prohibited`, `pii`, `bias`, `escalation`) делегируют классификацию Guard API вместо regex/heuristics. Для разработки и CI — mock-контейнер (CPU, детерминистические ответы).

---

## Phase 1: Сбор и подготовка данных (3 недели)

### US-GUARD-01: Инфраструктура пайплайна данных
**Приоритет:** CRITICAL
**Backlog:** G-01

Как ML-инженер, я хочу иметь воспроизводимый пайплайн подготовки данных с версионированием и конфигурацией, чтобы каждый этап (сбор, очистка, аугментация, split) был детерминированным и аудируемым.

**Acceptance Criteria:**
- [ ] Проект `guard/` в корне репо: `pyproject.toml` (Python 3.11+, зависимости: datasets, faker, transformers, peft, wandb)
- [ ] Структура: `guard/data/scripts/`, `guard/data/configs/`, `guard/data/raw/`, `guard/data/processed/`, `guard/data/splits/`
- [ ] YAML-конфигурация на каждую задачу: `prohibited.yaml`, `pii.yaml`, `bias.yaml`, `injection.yaml`, `escalation.yaml`
- [ ] CLI-команды: `python -m guard.data collect`, `python -m guard.data validate`, `python -m guard.data split`
- [ ] Единый формат: JSONL с полями `{text, task, label, category, source, license}`
- [ ] DVC или git-lfs для версионирования датасетов (>100MB не в git)
- [ ] `.gitignore` для `guard/data/raw/`, `guard/data/processed/` (только конфиги и скрипты в git)
- [ ] Makefile: `make data-all`, `make data-validate`, `make data-stats`

**Технические детали:**
- Python пакет с `[project.scripts]` entry points
- Каждый скрипт — идемпотентный (повторный запуск не дублирует данные)
- Seed фиксирован (`SEED=42`) для воспроизводимости
- Логирование: structured JSON logs в `guard/data/logs/`

---

### US-GUARD-02: Датасет Prohibited Detection (Art. 5)
**Приоритет:** CRITICAL
**Backlog:** G-01

Как ML-инженер, я хочу собрать ~5,000 размеченных примеров запрещённых AI-практик по 8 категориям Art. 5, чтобы модель точно классифицировала prohibited content.

**Acceptance Criteria:**
- [ ] 8 категорий Art. 5: subliminal manipulation, exploitation of vulnerabilities, social scoring, predictive policing, untargeted facial scraping, emotion recognition in workplace/education, biometric categorisation, real-time remote biometric identification
- [ ] ~625 примеров на категорию (сбалансированный датасет)
- [ ] Равное количество positive (prohibited) и negative (legitimate) примеров
- [ ] Синтетическая генерация через Qwen 72B (Alibaba, Apache 2.0) и Mistral Large (Apache 2.0)
- [ ] НЕ использовать Claude/GPT для генерации — Anthropic AUP и OpenAI ToS запрещают дистилляцию
- [ ] Каждый пример: `{text: string, label: "prohibited"|"allowed", category: string, article: string}`
- [ ] EU AI Act Art. 6(3) self-compliance документ: обоснование почему Guard API не является high-risk AI system

**Технические детали:**
- Генерация: промпт с описанием категории + 3-5 seed examples → batch generation
- Температура 0.9 для разнообразия, top_p 0.95
- Дедупликация: cosine similarity > 0.92 → удалить дубли (sentence-transformers)
- Негативные примеры: легитимные use cases, которые визуально похожи на prohibited (emotion recognition в медицине — исключение Art. 5(1)(f))

---

### US-GUARD-03: Датасет PII/Sanitize Detection (GDPR)
**Приоритет:** CRITICAL
**Backlog:** G-01

Как ML-инженер, я хочу собрать ~10,000 примеров с европейскими PII-паттернами, чтобы модель обнаруживала персональные данные граждан ЕС в контексте AI-систем.

**Acceptance Criteria:**
- [ ] Типы PII: имена, адреса, телефоны, email, IBAN, паспорт, налоговый ID, медицинские ID, IP-адреса, дата рождения
- [ ] 4 европейские локали: `de_DE`, `fr_FR`, `it_IT`, `es_ES` (Faker library)
- [ ] Датасет ai4privacy (HuggingFace, open-source) как базовый источник
- [ ] Синтетические примеры: реалистичные тексты с embedded PII (cover letters, support tickets, chatbot logs)
- [ ] Негативные примеры: тексты без PII, или с non-EU форматами (US SSN, UK NIN — другой контекст)
- [ ] Формат: `{text: string, label: "contains_pii"|"clean", pii_types: string[], locale: string}`

**Технические детали:**
- Faker: 2,500 примеров на локаль, шаблоны с 1-3 PII-полями на текст
- ai4privacy: фильтр по EU-релевантным записям, маппинг в наш формат
- Аугментация: замена имён/адресов, перестановка предложений, синонимы
- Edge cases: частичные PII (только имя без фамилии), зашумлённые форматы (IBAN с пробелами/без)

---

### US-GUARD-04: Датасет Bias Detection
**Приоритет:** HIGH
**Backlog:** G-02

Как ML-инженер, я хочу собрать ~15,000 примеров с bias-паттернами по 15 защищённым характеристикам, чтобы модель обнаруживала дискриминационные ответы AI-систем.

**Acceptance Criteria:**
- [ ] 15 характеристик: пол, возраст, раса/этничность, религия, инвалидность, сексуальная ориентация, гендерная идентичность, национальность, язык, социально-экономический статус, семейное положение, политические убеждения, внешность, беременность, генетические данные
- [ ] Источники: BBQ (58K примеров, CC-BY 4.0), WinoBias (MIT), CrowS-Pairs (CC BY-SA 4.0)
- [ ] Маппинг категорий BBQ → наши 15 характеристик
- [ ] Стратифицированная выборка: ~1,000 примеров на характеристику
- [ ] Формат: `{text: string, label: "biased"|"neutral", characteristic: string, bias_type: string}`
- [ ] Контекстуализация: AI-специфичные сценарии (hiring, lending, content moderation, medical triage)

**Технические детали:**
- BBQ: парсинг из HuggingFace datasets, фильтр по релевантным категориям, конвертация формата
- WinoBias: gender bias в coreference resolution — адаптация для LLM-контекста
- CrowS-Pairs: стереотипные vs антистереотипные предложения — преобразование в classification task
- Лицензии: все три датасета permissive (CC-BY, MIT, CC BY-SA) — совместимы с commercial use
- Баланс: oversample редкие характеристики (генетические данные, беременность) через синтетику

---

### US-GUARD-05: Датасет Prompt Injection Detection
**Приоритет:** HIGH
**Backlog:** G-02

Как ML-инженер, я хочу собрать ~8,000 примеров prompt injection атак, чтобы модель обнаруживала попытки обхода AI-системы.

**Acceptance Criteria:**
- [ ] Источники: HackAPrompt (MIT), deepset/prompt-injections (Apache 2.0), Garak attack patterns (Apache 2.0)
- [ ] Категории атак: direct injection, indirect injection, jailbreak, DAN, role-play escape, context manipulation, encoding tricks
- [ ] Негативные примеры: легитимные prompts, которые визуально похожи на injection (system prompts, meta-instructions)
- [ ] Формат: `{text: string, label: "injection"|"safe", attack_type: string, source: string}`
- [ ] Мультиязычные атаки: EN, DE, FR (European context)

**Технические детали:**
- HackAPrompt: ~600 успешных атак из competition → расширить вариациями
- deepset/prompt-injections: ~500 примеров, высокое качество
- Garak: генерация атак через framework, фильтрация по успешности
- Синтетика: Mistral Large генерирует вариации на основе seed attacks (Apache 2.0)
- Аугментация: unicode tricks (zero-width chars, homoglyphs), encoding (base64, rot13), language mixing
- Edge cases: multi-turn injection, delayed injection, injection в structured data (JSON, XML)

---

### US-GUARD-06: Датасет Escalation Detection (Art. 14)
**Приоритет:** HIGH
**Backlog:** G-02

Как ML-инженер, я хочу собрать ~2,000 примеров ситуаций, требующих human escalation по Art. 14, чтобы модель определяла когда AI-система должна передать контроль человеку.

**Acceptance Criteria:**
- [ ] Категории: safety-critical, legal decision, medical advice, financial recommendation, emotional distress, ambiguous intent, out-of-scope, confidence below threshold
- [ ] Синтетическая генерация через Mistral Large (Apache 2.0)
- [ ] Контексты: customer support, medical chatbot, legal assistant, HR screening, content moderation
- [ ] Негативные примеры: рутинные запросы, не требующие escalation
- [ ] Формат: `{text: string, label: "escalate"|"continue", reason: string, context: string}`
- [ ] ~250 примеров на категорию

**Технические детали:**
- Seed примеры из Art. 14(4) EU AI Act: конкретные сценарии из recitals
- Генерация: scenario template + Mistral Large → realistic dialog turn
- Маркировка: 2-annotator consensus (LLM-judge + manual spot-check)
- Edge cases: пограничные ситуации (пользователь шутит про harm, метафоры, сарказм)

---

### US-GUARD-07: Валидация и качество данных
**Приоритет:** CRITICAL
**Backlog:** G-01, G-02

Как ML-инженер, я хочу 4-уровневую валидацию качества данных, чтобы обучение модели основывалось на чистых и надёжных данных.

**Acceptance Criteria:**
- [ ] Уровень 1 — Лексическая валидация: длина текста (10-2000 chars), отсутствие дубликатов (exact + fuzzy), кодировка UTF-8, баланс классов (40-60% split)
- [ ] Уровень 2 — LLM-judge: Qwen 72B проверяет согласованность label с текстом, порог agreement ≥ 0.85
- [ ] Уровень 3 — Human spot-check: 5% случайная выборка на задачу, manual review, IAA (Inter-Annotator Agreement) ≥ 0.80
- [ ] Уровень 4 — Distributional: label distribution per category, outlier detection, data drift от reference distributions
- [ ] Data Cards (ML Data Card standard) для каждого датасета: описание, источник, лицензия, известные limitations
- [ ] Аугментация: back-translation (DE↔EN, FR↔EN), paraphrasing, template mixing, noise injection (typos, formatting)
- [ ] Split: 80/10/10 (train/val/test), стратифицированный по task + category
- [ ] Статистика: `python -m guard.data stats` → распределения, overlap, качество

**Технические детали:**
- Дедупликация: MinHash (datasketch) для fuzzy, exact hash для точных
- LLM-judge: batch API для Qwen 72B, ~$10-15 на весь корпус
- Back-translation: Helsinki-NLP/opus-mt models (MIT), локальный inference
- Итоговый объём: ~40,000 примеров (5K + 10K + 15K + 8K + 2K)
- Артефакт: `guard/data/processed/guard-v1.0.jsonl` + per-task splits в `guard/data/splits/`

---

### US-GUARD-08: Self-Compliance документация (Art. 6, Art. 53)
**Приоритет:** HIGH
**Backlog:** G-01

Как product owner, я хочу документировать self-compliance Guard API по EU AI Act, чтобы демонстрировать ответственную разработку и соответствие Art. 53 (GPAI obligations).

**Acceptance Criteria:**
- [ ] Art. 6(3) reasoning: обоснование почему Guard API не является high-risk AI system (compliance tool, not decision-maker)
- [ ] Art. 53(1)(b): техническая документация — архитектура, training data summary, evaluation results
- [ ] Data Cards: 5 карт (по одной на задачу), формат Google Data Cards
- [ ] Лицензии всех данных задокументированы: BBQ (CC-BY 4.0), WinoBias (MIT), CrowS-Pairs (CC BY-SA 4.0), HackAPrompt (MIT), deepset (Apache 2.0), ai4privacy (open-source), Faker (MIT), Qwen 72B (Apache 2.0), Mistral Large (Apache 2.0)
- [ ] Артефакт: `guard/docs/self-compliance.md`, `guard/docs/data-cards/`

**Технические детали:**
- Data Cards по шаблону: Motivation, Composition, Collection Process, Preprocessing, Uses, Distribution, Maintenance
- Art. 53(1)(c) voluntary: copyright policy — все данные permissive license, synthetic data generated by Apache 2.0 models
- Обновлять при каждом значительном изменении датасета

---

## Phase 2: Тренировка и оценка модели (3 недели)

### US-GUARD-09: Настройка тренировочного окружения
**Приоритет:** CRITICAL
**Backlog:** G-03

Как ML-инженер, я хочу настроить воспроизводимое окружение для QLoRA fine-tuning на Vast.ai, чтобы обучение было повторяемым и cost-efficient.

**Acceptance Criteria:**
- [ ] Docker-образ: `guard/docker/Dockerfile.train` — CUDA 12.1, Python 3.11, PyTorch 2.1, transformers, peft, bitsandbytes, trl
- [ ] Vast.ai provisioning script: `guard/scripts/vast-setup.sh` — аренда RTX 4090, копирование данных, запуск обучения
- [ ] Конфигурация QLoRA: `guard/configs/training.yaml` — r=64, alpha=128, dropout=0.05, target_modules=[q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj]
- [ ] Оптимизатор: AdamW, lr=2e-4, cosine scheduler, warmup 10% steps, weight_decay=0.01
- [ ] Batch: per_device_train_batch_size=4, gradient_accumulation_steps=8 (effective batch=32)
- [ ] 3 эпохи, checkpoints каждые 500 steps
- [ ] WandB интеграция: loss curves, eval metrics, GPU utilization
- [ ] Бюджет: ~40-50 GPU-часов × $0.35-0.55/hr = $14-28 за один training run

**Технические детали:**
- Базовая модель: `Qwen/Qwen2.5-7B-Instruct` (Apache 2.0, 7.6B params)
- QLoRA: 4-bit quantization (NF4), double quantization, bf16 compute
- Trainable params: ~160M (2.1% от 7.6B) — вся модель не в GPU RAM
- VRAM: ~20GB peak (RTX 4090 = 24GB → запас)
- Seed: 42, deterministic=True для воспроизводимости

---

### US-GUARD-10: Обучение single-head multi-task модели
**Приоритет:** CRITICAL
**Backlog:** G-03

Как ML-инженер, я хочу обучить single-head multi-task классификатор на формате `[task] text → yes/no`, чтобы одна модель решала все 5 задач без дополнительных classification heads.

**Acceptance Criteria:**
- [ ] Формат промпта: `[prohibited] Is this text describing a prohibited AI practice under EU AI Act Art. 5? Text: {text} → yes/no`
- [ ] 5 task prefixes: `[prohibited]`, `[pii]`, `[bias]`, `[injection]`, `[escalation]`
- [ ] Training на объединённом датасете (~40K примеров), shuffle across tasks
- [ ] Eval на validation set каждые 200 steps
- [ ] WandB: per-task F1, precision, recall, confusion matrices
- [ ] Если single-head F1 < 0.90 на любой задаче → переход к multi-head (US-GUARD-11)
- [ ] Checkpoint selection: best val F1 (macro-average across tasks)

**Технические детали:**
- SFT (Supervised Fine-Tuning) через trl `SFTTrainer`
- Chat template: `<|im_start|>system\nYou are a compliance classifier...<|im_end|>\n<|im_start|>user\n[task] text<|im_end|>\n<|im_start|>assistant\nyes<|im_end|>`
- Max seq length: 2048 tokens (достаточно для длинных текстов + prompt)
- Label tokens: только `yes`/`no` → loss mask на prompt tokens
- Early stopping: patience=3 eval steps без улучшения

---

### US-GUARD-11: Multi-head fallback и hyperparameter tuning
**Приоритет:** HIGH
**Backlog:** G-03

Как ML-инженер, я хочу иметь fallback на multi-head архитектуру и систематический поиск гиперпараметров, чтобы гарантировать целевые F1 метрики.

**Acceptance Criteria:**
- [ ] Multi-head (если нужен): 5 отдельных LoRA adapters, task routing по prefix → adapter selection
- [ ] Grid search: lr ∈ {1e-4, 2e-4, 5e-4}, r ∈ {32, 64, 128}, epochs ∈ {2, 3, 5}
- [ ] Бюджет grid search: 9-12 конфигураций × ~15 GPU-часов = ~$50-80
- [ ] Результаты: WandB sweep, top-3 конфигурации, ablation study
- [ ] Error analysis: top-20 ошибок на каждую задачу, failure modes, cross-task interference
- [ ] Документирование: какой подход (single vs multi) выбран и почему

**Технические детали:**
- Multi-head: `peft` поддерживает multiple adapters (`model.load_adapter(name)`)
- Task routing: parse prefix → select adapter → inference → parse output
- Grid search: WandB Sweeps (Bayesian optimization, maximize macro F1)
- Ожидаемый overhead multi-head: +20% VRAM (5 adapters × ~32MB), +10ms latency (adapter switch)
- Decision threshold: single-head acceptable if all tasks F1 ≥ 0.88 (relax by 0.02 if single is simpler)

---

### US-GUARD-12: Оценка, бенчмаркинг и Model Card
**Приоритет:** CRITICAL
**Backlog:** G-04

Как ML-инженер, я хочу провести comprehensive evaluation и задокументировать результаты в Model Card, чтобы модель была готова к production deployment.

**Acceptance Criteria:**
- [ ] Целевые F1 (test set): Prohibited ≥ 0.95, PII ≥ 0.92, Bias ≥ 0.88, Injection ≥ 0.93, Escalation ≥ 0.85
- [ ] Precision/Recall per task, confusion matrix, ROC-AUC
- [ ] Latency benchmark: p50, p95, p99 на RTX 4090 (single GPU) — target <200ms p95
- [ ] Throughput benchmark: concurrent requests, target >50 req/s
- [ ] Cross-task interference test: обучение на 5 задачах не деградирует single-task performance
- [ ] Model Card (Annex IV Art. 11 voluntary): intended use, limitations, ethical considerations, evaluation results
- [ ] Merge LoRA weights → full model: `model.merge_and_unload()`
- [ ] Quantize: INT4/AWQ, итоговый размер ~4.2GB

**Технические детали:**
- Evaluation script: `python -m guard.eval run --checkpoint best --split test`
- Latency: warm-up 10 requests, measure 1000, report percentiles
- Throughput: asyncio concurrent batch, ramp 1→100 concurrent
- AWQ quantization: `autoawq` library, calibration на 128 examples из validation
- Export: `guard/models/guard-v1.0-awq/` — готовая модель для vLLM
- Model Card: `guard/docs/model-card.md`, формат HuggingFace Model Card

---

### US-GUARD-13: Adversarial robustness тестирование
**Приоритет:** HIGH
**Backlog:** G-04

Как ML-инженер, я хочу протестировать модель на adversarial примерах, чтобы убедиться в устойчивости к manipulation и evasion attacks.

**Acceptance Criteria:**
- [ ] Adversarial set: 500 примеров (100 на задачу) — специально crafted для обхода классификатора
- [ ] Техники: synonym substitution, character-level perturbation, paraphrasing, negation insertion, context stuffing
- [ ] Prohibited evasion: euphemisms, indirect descriptions, technical jargon
- [ ] Injection evasion: novel attack patterns не из training data, multi-language mixing
- [ ] Target: adversarial F1 не ниже 0.80 на каждую задачу (допустимый drop от test F1)
- [ ] Failure analysis: категоризация adversarial failures, mitigation plan
- [ ] Артефакт: `guard/eval/adversarial-report.md`

**Технические детали:**
- TextAttack library (MIT) для автоматической генерации adversarial примеров
- Manual crafting для domain-specific attacks (EU AI Act terminology, legal phrasing)
- Red-teaming: 2 часа manual adversarial testing (ML-инженер + domain expert)
- Результаты → WandB, сравнение с baseline F1

---

## Phase 3: API и деплой (3 недели)

### US-GUARD-14: FastAPI сервис с vLLM engine
**Приоритет:** CRITICAL
**Backlog:** G-05

Как ML-инженер, я хочу развернуть FastAPI сервис с vLLM для inference, чтобы Guard API принимал HTTP-запросы и возвращал классификацию с <200ms latency.

**Acceptance Criteria:**
- [ ] `POST /v1/classify` — single request: `{text: string, task: string}` → `{label: string, confidence: float, task: string, latency_ms: int}`
- [ ] `POST /v1/batch` — batch request: `{items: [{text, task}]}` → `{results: [{label, confidence, task}], total_latency_ms: int}`
- [ ] `GET /v1/health` — `{status: "healthy"|"degraded"|"down", model: string, uptime_s: int, gpu_memory_used_mb: int}`
- [ ] vLLM AsyncLLMEngine: INT4/AWQ модель, temperature=0 (детерминированный вывод), max_tokens=10
- [ ] Multi-task classifier: формирует prompt по task prefix, парсит `yes/no` + confidence (logprobs)
- [ ] Confidence из log-probabilities: `exp(logprob_yes) / (exp(logprob_yes) + exp(logprob_no))`
- [ ] Graceful degradation: если GPU OOM → return 503, если model corrupted → health=degraded

**Технические детали:**
- vLLM 0.4+: `AsyncLLMEngine`, `SamplingParams(temperature=0, max_tokens=5, logprobs=5)`
- FastAPI: async endpoints, `uvicorn` с `--workers 1` (vLLM manages GPU internally)
- Batch: vLLM continuous batching handles concurrent requests automatically
- Response format: `{"label": "prohibited", "confidence": 0.97, "task": "prohibited", "latency_ms": 42}`
- Startup: load model → warm-up 5 requests → ready

---

### US-GUARD-15: Аутентификация, rate limiting и Prometheus
**Приоритет:** HIGH
**Backlog:** G-05

Как product owner, я хочу API key authentication, per-tenant rate limiting и мониторинг, чтобы Guard API был production-ready и монетизируемый.

**Acceptance Criteria:**
- [ ] API key auth: header `X-Guard-API-Key`, формат `grd_{32_hex_chars}`
- [ ] Key management: `guard/scripts/keygen.py` — генерация, отзыв, listing
- [ ] Key storage: SQLite (`guard/data/keys.db`) или YAML config (`guard/config/api-keys.yaml`)
- [ ] Rate limiting per-tenant: Starter — 0 (Guard API = Growth+), Growth — 10K req/month, Enterprise — 100K req/month
- [ ] Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- [ ] Prometheus metrics: `guard_requests_total{task,status}`, `guard_latency_seconds{task,quantile}`, `guard_gpu_utilization`, `guard_model_confidence{task}`
- [ ] `GET /metrics` — Prometheus scrape endpoint
- [ ] Unauthorized → 401, Rate limited → 429, Validation error → 422

**Технические детали:**
- FastAPI middleware: `APIKeyMiddleware` проверяет header, inject tenant context
- Rate limiter: Redis-free (in-memory sliding window per API key, persisted в SQLite)
- Prometheus: `prometheus-fastapi-instrumentator` или manual `prometheus_client`
- Metrics histogram buckets: [0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1.0] seconds
- Key rotation: old key valid 24h after rotation (grace period)

---

### US-GUARD-16: SDK интеграция (guard/client.ts + hooks)
**Приоритет:** CRITICAL
**Backlog:** G-06

Как разработчик Complior, я хочу интегрировать Guard API в SDK через HTTP-клиент и заменить regex-based hooks на ML-классификацию, чтобы compliance checks были точнее.

**Acceptance Criteria:**
- [ ] `engine/sdk/src/guard/client.ts` — HTTP-клиент: classify(), batch(), health(), circuit breaker (3 failures → open, 30s reset), timeout 500ms
- [ ] `engine/sdk/src/guard/pre-guard.ts` — pre-hooks: `guardProhibited()`, `guardPii()`, `guardInjection()` → вызывают Guard API перед LLM-запросом
- [ ] `engine/sdk/src/guard/post-guard.ts` — post-hooks: `guardBias()`, `guardEscalation()` → вызывают Guard API после LLM-ответа
- [ ] Fallback: если Guard API недоступен → graceful degradation к существующим regex/heuristic hooks
- [ ] Config: `guardApiUrl`, `guardApiKey`, `guardEnabled: boolean`, `guardTimeout: number`
- [ ] Типы: `GuardResult { label, confidence, task, latency_ms }`, `GuardConfig`, `GuardClient`
- [ ] Integration в `complior()` и `compliorAgent()`: auto-enable если `guardApiUrl` в config

**Технические детали:**
- HTTP client: `fetch` (zero dependencies), retry 1 attempt, circuit breaker state in closure
- Circuit breaker states: CLOSED (normal) → OPEN (3 failures, block all) → HALF_OPEN (probe after 30s)
- Timeout: 500ms hard limit (AbortController)
- Fallback chain: Guard API → regex hook → allow (fail-open for availability)
- SDK bundle: guard/ tree-shakeable, не увеличивает размер если не используется

**Точка интеграции с основным проектом:** SDK (`engine/sdk/src/`), затрагивает существующие pre/post-hooks.

---

### US-GUARD-17: Engine интеграция (guard-service, routes, MCP)
**Приоритет:** HIGH
**Backlog:** G-06

Как разработчик Complior, я хочу интегрировать Guard API в Engine через сервис и HTTP-роуты, чтобы TUI и CLI могли использовать Guard-классификацию.

**Acceptance Criteria:**
- [ ] `engine/core/src/services/guard-service.ts` — `GuardService { classify, batch, health, getStats }`
- [ ] `engine/core/src/http/routes/guard.route.ts` — `POST /guard/classify`, `POST /guard/batch`, `GET /guard/health`, `GET /guard/stats`
- [ ] Wiring в `composition-root.ts`: `createGuardService(deps)`, inject в routes
- [ ] MCP tools: `guard_classify` (single), `guard_batch` (batch) — агенты могут вызывать через MCP
- [ ] Config: `GUARD_API_URL`, `GUARD_API_KEY` env vars, fallback disabled если не указаны
- [ ] Stats: кэш последних 100 результатов, accuracy по задачам, average latency

**Технические детали:**
- GuardService deps: `{ guardApiUrl: string, guardApiKey: string, logger: Logger }`
- Route factory: `createGuardRoute(deps: { guardService: GuardService })`
- MCP tool definitions: добавить в `llm/tool-definitions.ts`, executor в `llm/tool-executors.ts`
- Conditional wiring: `if (env.GUARD_API_URL) createGuardService(...)` — не падать без Guard API

**Точка интеграции с основным проектом:** Engine (`engine/core/src/`), composition-root, MCP tools.

---

### US-GUARD-18: Docker и Hetzner деплой
**Приоритет:** HIGH
**Backlog:** G-05

Как DevOps-инженер, я хочу containerized Guard API с автоматизированным деплоем на Hetzner GPU, чтобы сервис работал в production в EU-юрисдикции.

**Acceptance Criteria:**
- [ ] `guard/docker/Dockerfile.prod` — production: `nvidia/cuda:12.1-runtime`, vLLM, модель baked in, ~6GB image
- [ ] `guard/docker/Dockerfile.mock` — mock: CPU-only, детерминированные ответы для dev/CI, ~200MB image
- [ ] `docker-compose.yml`: prod (GPU) + mock (CPU) profiles
- [ ] Hetzner GPU server: Germany (GDPR jurisdiction), RTX 3090 или A4000 (~€150-200/month)
- [ ] Ansible playbook: `guard/deploy/playbook.yml` — provision, deploy, TLS, monitoring
- [ ] Nginx reverse proxy: TLS termination (Let's Encrypt), `guard.complior.ai` subdomain
- [ ] Healthcheck: Docker HEALTHCHECK + external uptime monitoring
- [ ] Restart policy: `unless-stopped`, auto-recover from OOM/crash

**Технические детали:**
- Multi-stage Docker build: builder (compile vLLM) → runtime (minimal CUDA + model)
- Mock container: FastAPI + hardcoded responses (`prohibited: yes/0.95`, `pii: no/0.12`, etc.), <10ms latency
- Ansible: `guard/deploy/inventory.yml`, `guard/deploy/roles/` (nvidia-docker, guard-api, nginx, certbot)
- Monitoring: node_exporter + prometheus + grafana (docker-compose)
- Backup: модель в S3-compatible storage (Hetzner Object Storage), восстановление <30 min
- Log rotation: 7 days, structured JSON, no PII in logs

---

### US-GUARD-19: Мониторинг и alerting (Prometheus + Grafana)
**Приоритет:** MEDIUM
**Backlog:** G-05

Как DevOps-инженер, я хочу dashboard мониторинга с алертами, чтобы отслеживать здоровье Guard API и реагировать на инциденты.

**Acceptance Criteria:**
- [ ] Grafana dashboard: latency (p50/p95/p99), throughput (req/s), error rate (%), GPU utilization (%), model confidence distribution
- [ ] Per-task breakdown: отдельные панели для каждой из 5 задач
- [ ] Alerting rules: p95 latency > 500ms, error rate > 5%, GPU memory > 90%, health endpoint down
- [ ] Alert channels: email + webhook (Slack/Discord/Telegram)
- [ ] Dashboard JSON export: `guard/deploy/grafana/guard-dashboard.json`
- [ ] Prometheus scrape config: `guard/deploy/prometheus/prometheus.yml`

**Технические детали:**
- Prometheus: scrape `/metrics` каждые 15s
- Grafana provisioning: auto-import dashboard + datasource при docker-compose up
- Alert manager: `guard/deploy/prometheus/alertmanager.yml`
- Retention: Prometheus 30 days, Grafana snapshots для incident post-mortems

---

## Phase 4: Тестирование и хардинг (2 недели)

### US-GUARD-20: Unit и integration тесты Guard API (pytest)
**Приоритет:** CRITICAL
**Backlog:** G-07

Как ML-инженер, я хочу полное покрытие тестами Python-сервиса, чтобы каждый компонент был проверен до production deployment.

**Acceptance Criteria:**
- [ ] Unit: classifier logic (prompt formatting, response parsing, confidence extraction) — 20+ тестов
- [ ] Unit: API endpoints (classify, batch, health) — 15+ тестов (httpx AsyncClient)
- [ ] Unit: auth middleware (valid key, invalid key, missing key, expired key) — 8+ тестов
- [ ] Unit: rate limiter (under limit, at limit, over limit, reset, multiple tenants) — 10+ тестов
- [ ] Unit: batch processing (empty, single, max batch, mixed tasks) — 8+ тестов
- [ ] Integration: vLLM mock → classifier → API → response chain — 5+ тестов
- [ ] Coverage: ≥ 85% line coverage
- [ ] CI: `pytest guard/tests/ --cov=guard --cov-report=term-missing`

**Технические детали:**
- pytest + pytest-asyncio для async endpoints
- httpx AsyncClient для API тестов (in-process, no server needed)
- vLLM mock: patch `AsyncLLMEngine.generate` → return fixed logprobs
- Fixtures: `conftest.py` с test API keys, mock models, sample data
- Coverage: pytest-cov, fail < 85%

---

### US-GUARD-21: SDK integration тесты (vitest)
**Приоритет:** CRITICAL
**Backlog:** G-07

Как разработчик Complior, я хочу полное покрытие тестами SDK Guard-интеграции, чтобы client, hooks и fallback работали корректно.

**Acceptance Criteria:**
- [ ] `guard/client.test.ts`: HTTP calls, timeout, retry, circuit breaker states (closed→open→half-open) — 15+ тестов
- [ ] `guard/pre-guard.test.ts`: prohibited hook, pii hook, injection hook, blocked vs allowed, confidence threshold — 12+ тестов
- [ ] `guard/post-guard.test.ts`: bias hook, escalation hook, action on detection — 10+ тестов
- [ ] Fallback: Guard API down → regex hooks activated → test both paths — 8+ тестов
- [ ] Circuit breaker: 3 failures → open → 30s → half-open → success → closed — 5+ тестов
- [ ] Integration с `complior()` и `compliorAgent()`: guard hooks в pipeline — 5+ тестов
- [ ] Mock Guard API: MSW (Mock Service Worker) или custom fetch mock

**Технические детали:**
- vitest: `npx vitest run engine/sdk/src/guard/`
- Mock: `vi.fn()` для fetch, или MSW для realistic HTTP mocking
- Timer mocking: `vi.useFakeTimers()` для circuit breaker timeout tests
- Existing SDK tests (116) не должны сломаться

**Точка интеграции с основным проектом:** SDK тесты (`engine/sdk/src/guard/*.test.ts`), запускаются в основном CI.

---

### US-GUARD-22: Engine integration тесты
**Приоритет:** HIGH
**Backlog:** G-07

Как разработчик Complior, я хочу протестировать Engine-интеграцию с Guard API, чтобы сервис, роуты и MCP tools работали корректно.

**Acceptance Criteria:**
- [ ] `guard-service.test.ts`: classify, batch, health, getStats, error handling — 10+ тестов
- [ ] `guard.route.test.ts`: HTTP endpoints, validation, auth forwarding — 8+ тестов
- [ ] MCP tools: guard_classify, guard_batch — tool execution + response format — 5+ тестов
- [ ] Conditional wiring: engine starts without Guard API config → no errors — 3+ тестов
- [ ] Mock guard-service для route/MCP тестов

**Технические детали:**
- vitest: `npx vitest run engine/core/src/services/guard-service.test.ts`
- Route тесты: Hono test client (`app.request()`)
- MCP tool тесты: mock deps → execute → verify output format
- Existing engine tests (483) не должны сломаться

**Точка интеграции с основным проектом:** Engine тесты (`engine/core/src/`), запускаются в основном CI.

---

### US-GUARD-23: E2E тесты (SDK → Guard API → классификация)
**Приоритет:** HIGH
**Backlog:** G-07

Как QA-инженер, я хочу end-to-end тесты полного flow, чтобы убедиться что SDK корректно общается с Guard API и compliance enforcement работает.

**Acceptance Criteria:**
- [ ] E2E flow: `complior(client, {guardApiUrl})` → LLM call → pre-guard → Guard API classify → block/allow → post-guard
- [ ] Сценарий 1: prohibited text → Guard API returns prohibited → SDK blocks LLM call
- [ ] Сценарий 2: clean text → Guard API returns allowed → LLM call proceeds
- [ ] Сценарий 3: PII detected → Guard API returns contains_pii → SDK sanitizes before LLM call
- [ ] Сценарий 4: Guard API down → fallback to regex → LLM call proceeds with degraded checking
- [ ] Сценарий 5: bias in response → Guard API returns biased → SDK triggers escalation
- [ ] Docker-based: `docker-compose -f guard/docker/docker-compose.test.yml up` → mock Guard API + SDK tests
- [ ] CI: отдельный job `guard-e2e` в GitHub Actions

**Технические детали:**
- Mock Guard API container (Dockerfile.mock) для CI — не требует GPU
- E2E framework: vitest + docker-compose (testcontainers или pre-started)
- Timeout: 30s per test (network latency в Docker)
- Artifacts: test results JSON → CI summary

---

### US-GUARD-24: Безопасность и хардинг
**Приоритет:** CRITICAL
**Backlog:** G-07

Как security-инженер, я хочу hardened Guard API с валидацией, TLS и защитой от abuse, чтобы сервис был безопасен в production.

**Acceptance Criteria:**
- [ ] Input validation: max text length 10,000 chars, allowed tasks whitelist, UTF-8 only, no null bytes
- [ ] TLS only: HTTP → 301 redirect to HTTPS, HSTS header
- [ ] API key rotation: `POST /v1/admin/rotate-key` (admin endpoint, separate auth)
- [ ] No PII in logs: request text truncated to 100 chars в logs, full text never logged
- [ ] Request size limit: 1MB max body
- [ ] CORS: disabled (API-only, no browser access)
- [ ] Dependency audit: `pip-audit` + `safety check` в CI
- [ ] Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

**Технические детали:**
- FastAPI: `RequestValidationError` handler → 422 без stack trace
- Pydantic models: `Field(max_length=10000)`, `Literal["prohibited", "pii", "bias", "injection", "escalation"]`
- Log sanitization: middleware заменяет text на `text[:100]...` в structured logs
- Admin auth: separate `X-Guard-Admin-Key` header, not in regular key DB
- pip-audit: `guard/scripts/audit.sh`, run weekly в CI

---

### US-GUARD-25: Оптимизация производительности
**Приоритет:** HIGH
**Backlog:** G-07

Как ML-инженер, я хочу оптимизировать latency и throughput Guard API, чтобы сервис выдерживал production нагрузку с <100ms p50 и <200ms p95.

**Acceptance Criteria:**
- [ ] Continuous batching: vLLM auto-batching включён, проверить что batch inference быстрее sequential
- [ ] KV cache: vLLM manages KV cache автоматически, проверить что gpu_memory_utilization оптимален (0.85-0.90)
- [ ] Prompt caching: prefix caching для повторяющихся task prompts (system prompt + task prefix = cached)
- [ ] Target latency: p50 < 100ms, p95 < 200ms, p99 < 500ms
- [ ] Target throughput: > 50 req/s sustained, > 100 req/s burst (1 min)
- [ ] Load test: `locust` или `vegeta` — 10 min sustained load, report latency distribution
- [ ] Memory leak test: 1h continuous load, GPU memory stable (no OOM)
- [ ] Артефакт: `guard/eval/performance-report.md`

**Технические детали:**
- vLLM: `--enable-prefix-caching`, `--gpu-memory-utilization 0.88`
- Locust: `guard/tests/load/locustfile.py`, scenarios: steady-state, ramp-up, spike
- Profiling: `py-spy` для Python hotspots, `nvidia-smi` для GPU utilization
- Optimization order: prefix caching → batch size tuning → gpu memory → quantization verification

---

### US-GUARD-26: QMS документация (Art. 17 voluntary)
**Приоритет:** MEDIUM
**Backlog:** G-07

Как product owner, я хочу QMS-документацию для Guard API, чтобы демонстрировать зрелость процессов при добровольном соответствии EU AI Act.

**Acceptance Criteria:**
- [ ] Art. 17 Quality Management System (voluntary для non-high-risk): описание процессов разработки, тестирования, деплоя Guard API
- [ ] Art. 49(2) EU AI Database self-assessment: регистрация Guard API как general-purpose AI compliance tool
- [ ] Incident response plan: процедуры при деградации модели, false positives всплеске, security breach
- [ ] Change management: процесс обновления модели (re-training, evaluation, rollout, rollback)
- [ ] Версионирование: модель (guard-v1.0), API (v1), данные (guard-data-v1.0) — semver
- [ ] Артефакт: `guard/docs/qms.md`, `guard/docs/incident-response.md`

**Технические детали:**
- QMS scope: только Guard API (не весь Complior — у основного проекта свой QMS)
- Art. 49(2): online self-registration на EU AI Database (когда доступна)
- Rollback: Docker image tagging, blue-green deployment, <5 min rollback time
- Model registry: `guard/models/` с версионированными checkpoints, hash verification

---

## Бюджет

### Единовременные расходы

| Статья | Оценка | Примечание |
|--------|--------|------------|
| Vast.ai GPU (обучение) | $14-28 | RTX 4090, ~40-50 часов × $0.35-0.55/hr |
| Grid search (hyperparameters) | $50-80 | 9-12 конфигураций × ~15 GPU-часов |
| LLM-judge (валидация данных) | $10-15 | Qwen 72B batch API, ~40K примеров |
| Синтетическая генерация | $20-30 | Qwen 72B / Mistral Large API calls |
| Домен guard.complior.ai | $12/год | DNS + subdomain |
| **Итого единовременные** | **~$106-165** | |

### Ежемесячные расходы (production)

| Статья | Оценка | Примечание |
|--------|--------|------------|
| Hetzner GPU server | €150-200/мес | RTX 3090 / A4000, Германия |
| Hetzner Object Storage | €5-10/мес | Backup модели + данных |
| Мониторинг (Grafana Cloud) | €0 (free tier) | До 10K metrics серий |
| DNS / TLS | €0 | Let's Encrypt + included |
| **Итого ежемесячные** | **~€155-210/мес** | |

### Монетизация

| Тариф | Guard API включён | Лимит |
|-------|-------------------|-------|
| Starter (free) | Нет | 0 req/month |
| Growth (€49/мес) | Да | 10,000 req/month |
| Enterprise (€399/мес) | Да | 100,000 req/month |

**Breakeven:** ~4 Growth клиента покрывают Hetzner расходы. Enterprise клиент = прибыль с первого дня.

---

## Метрики

### Целевые метрики модели

| Задача | F1 Target | Precision Target | Recall Target | Adversarial F1 |
|--------|-----------|------------------|---------------|----------------|
| Prohibited Detection | ≥ 0.95 | ≥ 0.97 | ≥ 0.93 | ≥ 0.85 |
| PII Detection | ≥ 0.92 | ≥ 0.95 | ≥ 0.90 | ≥ 0.82 |
| Bias Detection | ≥ 0.88 | ≥ 0.90 | ≥ 0.86 | ≥ 0.80 |
| Prompt Injection | ≥ 0.93 | ≥ 0.95 | ≥ 0.91 | ≥ 0.83 |
| Escalation Detection | ≥ 0.85 | ≥ 0.88 | ≥ 0.83 | ≥ 0.75 |

### Целевые метрики производительности

| Метрика | Target | Допустимый |
|---------|--------|------------|
| Latency p50 | < 100ms | < 150ms |
| Latency p95 | < 200ms | < 300ms |
| Latency p99 | < 500ms | < 750ms |
| Throughput (sustained) | > 50 req/s | > 30 req/s |
| Throughput (burst 1 min) | > 100 req/s | > 70 req/s |
| Uptime | 99.5% | 99.0% |
| Cold start | < 60s | < 120s |

### Целевые метрики качества данных

| Метрика | Target |
|---------|--------|
| Общий объём датасета | ~40,000 примеров |
| Баланс классов (per task) | 40-60% positive/negative |
| Дедупликация (fuzzy) | < 2% duplicates |
| LLM-judge agreement | ≥ 0.85 |
| Human IAA (spot-check) | ≥ 0.80 |
| Все лицензии permissive | Apache 2.0, MIT, CC-BY, CC BY-SA |

### Целевые метрики тестирования

| Компонент | Тестов | Coverage |
|-----------|--------|----------|
| Guard API (pytest) | ≥ 60 | ≥ 85% |
| SDK guard/ (vitest) | ≥ 55 | ≥ 90% |
| Engine integration (vitest) | ≥ 25 | ≥ 80% |
| E2E (vitest + docker) | ≥ 7 | — |
| **Итого** | **≥ 147** | |

---

## Зависимости и риски

### Зависимости от основного проекта

| US | Зависит от | Описание |
|----|-----------|----------|
| US-GUARD-16 | SDK hooks (S03) | Существующие pre/post-hooks в `engine/sdk/src/` |
| US-GUARD-17 | composition-root (S03) | Wiring pattern в `engine/core/src/composition-root.ts` |
| US-GUARD-17 | MCP tools (S03) | Tool definitions / executors в `engine/core/src/llm/` |
| US-GUARD-21 | SDK tests (S03) | Existing 116 тестов не должны сломаться |
| US-GUARD-22 | Engine tests (S03) | Existing 483 теста не должны сломаться |

### Риски

| Риск | Вероятность | Impact | Mitigation |
|------|-------------|--------|------------|
| Single-head F1 < 0.90 | Средняя | Средний | Fallback на multi-head (US-GUARD-11), +1 неделя |
| Vast.ai GPU недоступен | Низкая | Высокий | Альтернативы: RunPod, Lambda Labs, Hetzner cloud GPU |
| vLLM latency > 200ms | Низкая | Средний | Prefix caching, batch tuning, upgrade GPU |
| Hetzner GPU stock-out | Низкая | Высокий | Pre-order, dedicated server, альтернатива OVH |
| Adversarial attacks bypass | Средняя | Высокий | Fallback к regex hooks, continuous re-training pipeline |
| Data quality issues | Средняя | Высокий | 4-уровневая валидация, human spot-check |

---

## Таймлайн

```
Week 1-3:  Phase 1 — Данные    [US-GUARD-01..08]
Week 4-6:  Phase 2 — Обучение  [US-GUARD-09..13]
Week 7-9:  Phase 3 — API       [US-GUARD-14..19]
Week 10-11: Phase 4 — Хардинг  [US-GUARD-20..26]
```

| Неделя | Фаза | Ключевые deliverables |
|--------|------|-----------------------|
| 1 | Data | Инфраструктура пайплайна, начало сбора |
| 2 | Data | Prohibited + PII датасеты готовы |
| 3 | Data | Bias + Injection + Escalation готовы, валидация, split |
| 4 | Train | Окружение, первый training run |
| 5 | Train | Grid search, error analysis |
| 6 | Train | Финальная модель, Model Card, AWQ export |
| 7 | API | FastAPI + vLLM, auth, rate limit |
| 8 | API | SDK + Engine интеграция |
| 9 | API | Docker, Hetzner деплой, мониторинг |
| 10 | Harden | Тесты (Python + TS), E2E, security |
| 11 | Harden | Performance, QMS, финальный аудит |
