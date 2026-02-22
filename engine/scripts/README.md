# Registry Build Scripts — Справка

> Скрипты для завершения AI Registry до 100%

---

## 📁 Структура

```
scripts/
├── update-screenshots.ts       — Обновить screenshot paths в results.json
├── update-watermarks.ts        — Обновить visible_watermark поля
├── restore-verified-status.ts  — Восстановить VERIFIED статус из verified/
├── update-stats.ts             — Пересчитать stats.json
├── verify-completion.ts        — Проверить 100% completion
└── finalize-registry.ts        — ONE-CLICK: финальная сборка (всё вместе)
```

---

## 🚀 Quick Start (для пользователя)

### После завершения ручных тестов:

**Вариант 1: One-click (рекомендуется)**

```bash
cd /home/openclaw/complior/engine

# Если у DALL-E и Stability НЕТ visible watermark:
npx tsx scripts/finalize-registry.ts --dalle=false --stability=false

# Если у DALL-E ЕСТЬ watermark, у Stability НЕТ:
npx tsx scripts/finalize-registry.ts --dalle=true --stability=false
```

**Вариант 2: Пошагово**

```bash
# 1. Обновить screenshot paths
npx tsx scripts/update-screenshots.ts

# 2. Обновить watermark результаты
npx tsx scripts/update-watermarks.ts --dalle=false --stability=false

# 3. Восстановить VERIFIED статус (safety check)
npx tsx scripts/restore-verified-status.ts

# 4. Обновить stats.json
npx tsx scripts/update-stats.ts

# 5. Проверить 100% completion
npx tsx scripts/verify-completion.ts
```

---

## 📖 Подробное описание скриптов

### 1. `update-screenshots.ts`

**Назначение:** Автоматически обновляет `screenshot_path` в `results.json` для всех PNG файлов в `screenshots/`.

**Маппинг:**
- `chatgpt.png` → `slug: chatgpt`
- `claude.png` → `slug: claude`
- `dall-e-interface.png` → `slug: dall-e-3`
- `stability-interface.png` → `slug: stable-diffusion`
- И т.д. (см. SCREENSHOT_TO_SLUG в коде)

**Использование:**
```bash
npx tsx scripts/update-screenshots.ts
```

**Вывод:**
```
Found 15 screenshot files

✓ chatgpt: screenshots/chatgpt.png
✓ claude: screenshots/claude.png
...

✅ Updated 15 screenshot paths in results.json
✅ All 15 required screenshots present!
```

---

### 2. `update-watermarks.ts`

**Назначение:** Обновляет `visible_watermark` поле для DALL-E 3 и Stable Diffusion.

**Использование:**
```bash
# Оба НЕТ watermark
npx tsx scripts/update-watermarks.ts --dalle=false --stability=false

# Только у DALL-E есть
npx tsx scripts/update-watermarks.ts --dalle=true --stability=false

# Только у Stability есть
npx tsx scripts/update-watermarks.ts --dalle=false --stability=true

# Оба ЕСТЬ watermark
npx tsx scripts/update-watermarks.ts --dalle=true --stability=true
```

**Вывод:**
```
✓ dall-e-3: visible_watermark = false
✓ stable-diffusion: visible_watermark = false

✅ Updated 2 watermark fields in results.json
```

---

### 3. `restore-verified-status.ts`

**Назначение:** Синхронизирует `all_tools.json` с файлами в `verified/` directory.

Если в `verified/` есть файл `chatgpt.json`, но в `all_tools.json` у chatgpt `level: 'scanned'`, скрипт обновит его до `level: 'verified'`.

**Использование:**
```bash
npx tsx scripts/restore-verified-status.ts
```

**Вывод:**
```
Found 87 tools in verified/ directory
Current VERIFIED count: 8

✓ chatgpt: scanned → verified
✓ claude: scanned → verified
...

Updated 79 tools to VERIFIED status
New VERIFIED count: 87 (was: 8)
```

---

### 4. `update-stats.ts`

**Назначение:** Пересчитывает `stats.json` на основе текущего `all_tools.json`.

Считает:
- Total tools
- VERIFIED / SCANNED / CLASSIFIED counts
- GPAI Systemic count
- Score distribution (compliant, progressing, needs_improvement, non_compliant, unscored)
- Web search evidence count
- GitHub stats count

**Использование:**
```bash
npx tsx scripts/update-stats.ts
```

**Вывод:**
```
Total tools: 2477
  VERIFIED: 87
  SCANNED: 424
  CLASSIFIED: 1966
  GPAI Systemic: 17
  With web search: 50
  GitHub stats: 37
  Scored: 372

✅ Updated stats.json
```

---

### 5. `verify-completion.ts`

**Назначение:** Проверяет все компоненты TZ v3.0 для верификации 100% completion.

**Проверки:**
1. Registry Statistics (total, verified, scanned, classified, scored)
2. OpenRouter LLM Tests (≥47 models)
3. Media API Tests (≥7 successful)
4. Detection Data (≥50 packages)
5. Human Test Screenshots (15 required)
6. Human Test Results (results.json с screenshot paths)
7. Core Registry Files (all_tools.json, directory.json, stats.json, assessments/eu-ai-act/directory.json)

**Использование:**
```bash
npx tsx scripts/verify-completion.ts
```

**Вывод (успех):**
```
✅ 100% COMPLETION VERIFIED!

All automated and manual tests complete.
Registry is ready for production use.
```

**Вывод (не завершено):**
```
⚠️  INCOMPLETE - Manual work required

Remaining tasks:
  - Collect 15 screenshots
  - Update results.json with screenshot paths
```

**Exit code:**
- `0` = 100% complete
- `1` = incomplete

---

### 6. `finalize-registry.ts` (ONE-CLICK)

**Назначение:** Запускает все скрипты в правильном порядке для финальной сборки.

**Шаги:**
1. `update-screenshots.ts` — обновить screenshot paths
2. `update-watermarks.ts` — обновить watermark (если флаги заданы)
3. `restore-verified-status.ts` — safety check для VERIFIED
4. `update-stats.ts` — пересчитать stats.json
5. `verify-completion.ts` — проверить 100%

**Использование:**
```bash
# С watermark результатами:
npx tsx scripts/finalize-registry.ts --dalle=false --stability=false

# Без watermark update:
npx tsx scripts/finalize-registry.ts
```

**Вывод (успех):**
```
╔═══════════════════════════════════════════════════╗
║      ✅  100% COMPLETION ACHIEVED!                ║
╚═══════════════════════════════════════════════════╝

📋 Final Summary:

   Total tools: 2477
   VERIFIED: 87
   SCANNED: 424
   CLASSIFIED: 1966
   GPAI Systemic: 17
   Scored: 372

   Registry ready at: data/registry/directory.json
   Built: 2026-02-21T12:30:00.000Z
```

---

## ⚠️ Troubleshooting

### Проблема: "VERIFIED count dropped from 87 to 8"

**Решение:**
```bash
npx tsx scripts/restore-verified-status.ts
npx tsx scripts/update-stats.ts
```

### Проблема: "Missing screenshots"

**Решение:**
Убедись, что все 15 PNG файлов находятся в `data/registry/human-tests/screenshots/`.

Проверь:
```bash
ls -1 data/registry/human-tests/screenshots/*.png | wc -l
```
Должно быть: **15**

### Проблема: "screenshot_path is null"

**Решение:**
```bash
npx tsx scripts/update-screenshots.ts
```

Проверь вывод скрипта - он покажет какие файлы найдены и обновлены.

---

## 📝 Примечания

- Все скрипты идемпотентны (можно запускать многократно без вреда)
- `finalize-registry.ts` — единственный скрипт который нужен пользователю в большинстве случаев
- Остальные скрипты полезны для отладки и ручного контроля
- Все скрипты логируют свои действия с ✓/✗ для наглядности

---

## 🔗 Связанные файлы

**Ручные тесты (для пользователя):**
- `/home/openclaw/complior/engine/data/registry/human-tests/README-RU.md` — полная инструкция
- `/home/openclaw/complior/engine/data/registry/human-tests/CHECKLIST.md` — краткий checklist
- `/home/openclaw/complior/engine/data/registry/human-tests/MANUAL-TEST-PLAN.md` — детальный план (318 строк)

**Build scripts (для Claude Code):**
- `src/domain/registry/build-wave2.ts` — OpenRouter + Detection + Passive Scan
- `src/domain/registry/build-wave3.ts` — Final assembly (MAU, GitHub, Web Search)
