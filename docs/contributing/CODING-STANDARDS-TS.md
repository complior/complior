# Complior — Стандарты кодирования: TypeScript Engine

**Версия:** 3.0.0
**Дата:** 2026-03-02
**Автор:** Marcus (CTO) via Claude Code
**Зависимости:** [CODING-STANDARDS.md](CODING-STANDARDS.md) (общие правила)

---

## 1. Парадигма: FP-first

### Функциональное программирование

- **НЕ используем классы** (исключение: Error subclasses)
- **Pure functions** — функции без побочных эффектов для бизнес-логики
- **Immutable data** — `const`, `Object.freeze()`, spread operators для обновлений
- **Composition over inheritance** — compose функции, не наследуй
- **Higher-order functions** — curry, partial application для переиспользования

```typescript
// ✅ GOOD — чистая функция
const calculateComplianceScore = (findings: Finding[]): number =>
  findings.reduce((passed, f) => passed + (f.status === 'pass' ? 1 : 0), 0) /
  findings.length * 100;

// ❌ BAD — класс с мутабельным состоянием
class ComplianceCalculator {
  constructor() { this.score = 0; }
  addFinding(f) { this.score += f.status === 'pass' ? 1 : 0; }
}
```

### Factory Functions (вместо классов)

```typescript
// ✅ GOOD — factory function с замыканием
const createScanner = (config: ScannerConfig) => ({
  async scan(projectPath: string) {
    const packs = loadRulePacks(config.extends);
    const findings = await runChecks(packs, projectPath);
    return calculateScore(findings);
  },
  getActiveChecks() {
    return loadRulePacks(config.extends).flatMap(p => p.checks);
  },
});

// ❌ BAD — класс с наследованием
class Scanner extends BaseService {
  constructor(config) { super(config); }
  async scan(path) { ... }
}
```

---

## 2. Язык и инструменты

### Строгий режим

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext"
  }
}
```

### Runtime и модули

| Настройка | Значение |
|-----------|----------|
| Рантайм | Bun (основной) / Node 22 (фолбэк) |
| Модули | ESM only (`"type": "module"`) |
| HTTP сервер | Hono (typed routes, SSE support) |
| LLM SDK | Vercel AI SDK v6 (`ai` package) |
| Валидация | Zod на всех внешних границах |
| Конфиг | cosmiconfig + Zod (`.compliorrc.json`) |
| Наблюдатель | chokidar (файловые изменения) |
| Очередь | p-queue (concurrency control для LLM) |

### Правила типизации

| Правило | Пример |
|---------|--------|
| Явные типы для public API | `const scan = (path: string): Promise<ScanResult> => ...` |
| Zod для runtime validation | `const ScanRequestSchema = z.object({ projectPath: z.string().min(1) })` |
| Запрещён `any` | Используй `unknown` + type guard |
| Запрещён `as` (type assertion) | Используй type narrowing / type guards |
| Union types для enums | `type Severity = 'CRITICAL' \| 'HIGH' \| 'MEDIUM' \| 'LOW' \| 'INFO'` |
| Readonly для иммутабельности | `readonly checks: CheckDefinition[]` |
| `satisfies` для type-safe literals | `const manifest = { ... } satisfies RulePackManifest` |

```typescript
// ✅ GOOD — type guard вместо assertion
const isCritical = (s: Severity): s is 'CRITICAL' => s === 'CRITICAL';

// ✅ GOOD — exhaustive check через satisfies
const SEVERITY_WEIGHT = {
  CRITICAL: 10,
  HIGH: 5,
  MEDIUM: 3,
  LOW: 1,
  INFO: 0,
} satisfies Record<Severity, number>;

// ❌ BAD — type assertion
const severity = data.severity as Severity;

// ❌ BAD — @ts-ignore
// @ts-ignore — скрывает ошибку вместо исправления
```

---

## 2.1 Validation & Type Safety

### V1 — Граничная валидация (Boundary Validation)

Валидируй данные на I/O границах: чтение с диска, HTTP request bodies, внешние API.
Используй Zod `.safeParse()` через parse-функции. Запрещено `JSON.parse() as T` для
данных из внешнего мира.

### V2 — Паттерн parse-функции

```typescript
export const parseXxx = (json: string): T | null => {
  try {
    const result = XxxSchema.safeParse(JSON.parse(json));
    return result.success ? (result.data as T) : null;
  } catch { return null; }
};
```

Никогда не бросает. Вызывающий обрабатывает `null`. `as T` после `safeParse()` —
допустимо (данные уже validated).

### V3 — Type-First с Companion Schema

Для широко-импортируемых типов (`common.types.ts`, 66+ файлов): handwritten interfaces +
companion Zod-схемы в отдельном `*.schemas.ts`. Для domain-specific типов с узким
использованием: schema-first с `z.infer<>` (как `schemas-core.ts`).

### V4 — Нет interior validation

Domain-функции доверяют своим TypeScript-сигнатурам. Нет runtime checks между
внутренними вызовами. Валидация — только на входе в систему.

### V5 — Исключение для Scanner

Scanner checks используют `Record<string, unknown>` — они проверяют partial/incomplete
данные by design. Это единственное место, где `JSON.parse() as Record<string, unknown>`
допустим.

### V6 — SDK Decoupling

SDK использует `Record<string, unknown>` + internal helpers для passport-полей.
SDK не импортирует engine types напрямую.

### V7 — Запрет `as` для I/O данных

`as T` type assertions запрещены для результатов `JSON.parse()` из disk/network.
Используй parse-функции или Zod-схемы. Исключения: V5 (scanner) и `as T` после
`safeParse()` success (V2).

---

## 3. Именование

### Файлы

| Тип | Паттерн | Пример |
|-----|---------|--------|
| Модуль | `kebab-case.ts` | `scanner-engine.ts` |
| Тип | `kebab-case.types.ts` | `scanner.types.ts` |
| Тест | `*.test.ts` | `scanner-engine.test.ts` |
| Конфиг | `kebab-case.ts` | `config/model-routing.ts` |
| Rule pack check | `kebab-case.ts` | `packs/eu-ai-act/ai-disclosure.ts` |
| LLM tool | `kebab-case.ts` | `tools/scan-project.ts` |
| Hono route | `kebab-case.ts` | `routes/scan.ts` |

### Код

| Тип | Паттерн | Пример |
|-----|---------|--------|
| Переменные / функции | `camelCase` | `calculateScore`, `riskLevel` |
| Типы / Interfaces | `PascalCase` | `ScanResult`, `Finding` |
| Константы | `UPPER_SNAKE_CASE` | `MAX_SCORE`, `DEFAULT_PORT` |
| Enums (string unions) | `UPPER_SNAKE_CASE` values | `'CRITICAL'`, `'HIGH'` |
| Private (convention) | `_prefix` | `_validateInput` (not exported) |
| Boolean | `is/has/can` prefix | `isCritical`, `hasDisclosure` |
| Event names | `PastTense` | `ScanCompleted`, `ScoreUpdated` |
| Factory functions | `create` prefix | `createScanner`, `createRouter` |
| Zod schemas | `PascalCase + Schema` | `ScanRequestSchema`, `FindingSchema` |

---

## 4. V8 Optimization & Code Quality

### Избегание деоптимизаций (V8 Hidden Classes & Object Shapes)

V8 оптимизирует код на основе стабильных «форм» объектов (hidden classes). Нарушение стабильности формы ведёт к деоптимизации.

#### Мономорфные объекты — одинаковая форма всегда

```typescript
// ✅ GOOD — объекты всегда одной формы, все поля инициализированы
const createFinding = (rule: string, severity: Severity, file: string): Finding => ({
  rule,
  severity,
  file,
  line: 0,
  message: '',
  fixAvailable: false,
});

// ❌ BAD — полиморфные объекты (разные формы в одном потоке)
const finding: any = { rule };
if (hasFix) finding.fix = fixData;        // Меняет shape!
if (hasArticle) finding.article = article; // Ещё раз меняет shape!
```

#### Запрещённые деоптимизирующие паттерны

| Паттерн | Проблема | Замена |
|---------|----------|--------|
| `for...in` | Деоптимизация, включает prototype chain | `Object.keys()` + `for...of` |
| `delete obj.prop` | Разрушает hidden class | `obj.prop = undefined` или spread |
| Mixins (`Object.assign` на прототип) | Полиморфизм hidden classes | Factory functions с composition |
| Holey arrays `[1, , 3]` | V8 переключается на медленный путь | Всегда заполняй массивы |
| Multi-type arrays `[1, 'a', {}]` | Нет специализации типов | Отдельные массивы или объект |

```typescript
// ✅ GOOD
const keys = Object.keys(config);
for (const key of keys) { /* ... */ }

// ❌ BAD — for...in
for (const key in config) { /* ... */ }

// ✅ GOOD — spread для удаления поля
const { sensitiveField, ...safeData } = userData;

// ❌ BAD — delete
delete userData.sensitiveField;
```

### Readability & Cognitive Complexity

#### Early return — минимизируй `if` вложенность

```typescript
// ✅ GOOD — early returns, flat structure
const classifyFile = (file: ParsedFile): Classification => {
  if (!file.ast) throw new ValidationError('AST required');
  if (isTestFile(file.path)) return { skip: true, reason: 'test file' };
  if (hasNoAiImports(file)) return { skip: true, reason: 'no AI usage' };
  return analyzeAstForCompliance(file.ast);
};

// ❌ BAD — nested ifs, hard to follow
const classifyFile = (file: ParsedFile): Classification => {
  if (file.ast) {
    if (!isTestFile(file.path)) {
      if (!hasNoAiImports(file)) {
        return analyzeAstForCompliance(file.ast);
      } else { return { skip: true, reason: 'no AI usage' }; }
    } else { return { skip: true, reason: 'test file' }; }
  } else { throw new ValidationError('AST required'); }
};
```

#### Discriminated unions — не размытые объекты

```typescript
// ✅ GOOD — discriminated union, предсказуемый контракт
type CheckResult =
  | { type: 'pass'; rule: string; message: string }
  | { type: 'fail'; rule: string; message: string; fix?: FixTemplate }
  | { type: 'skip'; rule: string; reason: string };

// ❌ BAD — непредсказуемый контракт
type CheckResult = {
  rule: string;
  passed?: boolean;
  message?: string;
  fix?: FixTemplate;
  reason?: string;
};
```

#### Возвращай объекты, не массивы

```typescript
// ✅ GOOD — named fields, self-documenting
const parseFinding = (raw: RawFinding) => ({
  rule: raw.id,
  severity: raw.level,
  message: raw.text,
});
const { rule, severity } = parseFinding(data);

// ❌ BAD — позиционное деструктурирование
const parseFinding = (raw: RawFinding) => [raw.id, raw.level, raw.text];
const [rule, severity] = parseFinding(data);
```

### Переменные и операторы

```typescript
// ✅ const > let > НИКОГДА var
const MAX_SCORE = 100;
let retries = 3;

// ✅ Строгое равенство — только === и !==
if (severity === 'CRITICAL') { /* ... */ }

// ✅ Явное приведение типов
const num = Number('5');
const str = String(num);

// ❌ Неявное приведение
const num = +'5';

// ❌ Chained assignments
let a = b = c = 0;

// ❌ bind/call/apply — используй arrow functions
const handler = processFinding.bind(this, ruleId);

// ❌ forEach с мутацией outer scope — используй map/filter/reduce
const results: Finding[] = [];
findings.forEach((f) => { results.push(transform(f)); });
```

---

## 5. Асинхронное программирование

### Уровни владения

| 💯 Applied (обязательно) | 🧑‍🎓 Advanced (backend) | 🕰️ Legacy (НЕ ИСПОЛЬЗУЕМ) |
|---|---|---|
| promises | p-queue (LLM concurrency) | Deferred pattern |
| async/await | AsyncGenerator (pagination) | `function*/yield` as async |
| events (EventEmitter) | Chain of Responsibility | Async.js, Metasync |
| streams (SSE) | Disposable pattern | **middleware pattern** |
| signals (AbortSignal) | Actor pattern | **RxJS** |
| iterators | | callback hell |

### Что используем (Applied 💯)

```typescript
// ✅ async/await — основной паттерн
const scanProject = async (projectPath: string): Promise<ScanResult> => {
  const files = await detectFiles(projectPath);
  const packs = await loadRulePacks(config.extends);
  const findings = await runChecks(packs, files);
  return { score: calculateScore(findings), findings };
};

// ✅ Promise.all для параллельных операций
const [files, packs, memory] = await Promise.all([
  detectFiles(projectPath),
  loadRulePacks(config.extends),
  loadProjectMemory(projectPath),
]);

// ✅ EventEmitter для cross-module events
const events = new EventEmitter();
events.on('ScanComplete', async ({ score, findings }) => {
  await updateProjectMemory(score, findings);
  await notifyTui({ type: 'score_update', score });
});

// ✅ SSE Streams для LLM token streaming (Hono)
app.get('/chat/stream', async (c) => {
  return streamSSE(c, async (stream) => {
    for await (const chunk of llmStream) {
      await stream.writeSSE({ data: JSON.stringify(chunk), event: 'token' });
    }
  });
});

// ✅ AbortSignal для cancellation
const controller = new AbortController();
const response = await fetch(url, { signal: controller.signal });
setTimeout(() => controller.abort(), 15_000);

// ✅ AsyncIterator для потоковых данных
async function* streamFindings(projectPath: string) {
  const files = await detectFiles(projectPath);
  for (const file of files) {
    const findings = await checkFile(file);
    yield findings;
  }
}
```

### Что используем на backend (Advanced 🧑‍🎓)

```typescript
// ✅ p-queue для rate-limited LLM calls
import PQueue from 'p-queue';

const llmQueue = new PQueue({ concurrency: 5 });
const result = await llmQueue.add(() => llmClient.classify(data));

// ✅ Promise.allSettled для graceful batch errors
const results = await Promise.allSettled(
  checks.map((check) => check.scan(ast, context)),
);
const succeeded = results.filter((r) => r.status === 'fulfilled');
const failed = results.filter((r) => r.status === 'rejected');

// ✅ Disposable pattern для cleanup (Bun / Node 22+)
const createTempDir = async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'complior-'));
  return {
    path: dir,
    [Symbol.asyncDispose]: async () => {
      await rm(dir, { recursive: true, force: true });
    },
  };
};

await using tempDir = await createTempDir();
await writeFile(path.join(tempDir.path, 'test.ts'), code);
const result = await scanProject(tempDir.path);
// Автоматическая очистка при выходе из scope
```

### Что НЕ используем (Legacy 🕰️ — запрещено)

```typescript
// ❌ ЗАПРЕЩЕНО — middleware pattern (Express-style)
app.use(authMiddleware);
// Вместо этого: явные вызовы в handler

// ❌ ЗАПРЕЩЕНО — RxJS
// Вместо этого: EventEmitter + async/await

// ❌ ЗАПРЕЩЕНО — Deferred pattern
const deferred = {};
deferred.promise = new Promise((resolve, reject) => {
  deferred.resolve = resolve; // АНТИПАТТЕРН
});

// ❌ ЗАПРЕЩЕНО — callback hell
fetchFile(path, (err, file) => {
  parseAST(file, (err, ast) => {
    runCheck(ast, (err, result) => { ... });
  });
});
```

### Error handling в async

```typescript
// ✅ GOOD — try/catch на уровне use case
const scanProject = async (projectPath: string): Promise<ScanResult> => {
  try {
    const files = await detectFiles(projectPath);
    if (files.length === 0) throw new ValidationError('No files to scan');
    return await runChecks(files);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new ScanError(`Unexpected: ${(error as Error).message}`);
  }
};

// ❌ BAD — swallowed errors
try { await riskyOperation(); } catch {} // Никогда так!
```

---

## 6. Архитектура Engine

### CQS (Command Query Separation)

```typescript
// ✅ GOOD — CQS: command отдельно, query отдельно
const applyFix = async (fixId: string, projectPath: string): Promise<void> => {
  const diff = generateDiff(fixId);
  await writeFile(diff.targetFile, diff.newContent);  // command
};

const getFindings = (projectPath: string): Finding[] =>  // query
  loadScanResults(projectPath);

// ❌ BAD — и пишет, и возвращает (нарушение CQS)
const applyFixAndReturn = async (fixId: string) => {
  const diff = generateDiff(fixId);
  await writeFile(diff.targetFile, diff.newContent);
  return diff; // Смешение command + query
};
```

**Исключение:** `create → return id` допустимо.

### Domain Events

```typescript
// ✅ GOOD — event как анемичный объект, сериализуемый
const createScanEvent = (projectPath: string, result: ScanResult) => ({
  type: 'ScanCompleted' as const,
  projectPath,
  score: result.score,
  findingsCount: result.findings.length,
  criticalCount: result.findings.filter(f => f.severity === 'CRITICAL').length,
  timestamp: new Date().toISOString(),
});

events.emit('ScanCompleted', createScanEvent(projectPath, result));
```

### Архитектура слоёв

```
ports/              → Contracts (zero implementation): scanner, llm, events, logger, browser
domain/             → PURE business logic: scanner (5-layer), fixer, reporter, whatif
services/           → Application orchestration: scan, fix, undo, badge, share, report, status
infra/              → Infrastructure adapters: event-bus, llm, logger, file-watcher, headless-browser, git, shell
http/               → Hono route handlers via factory functions
data/               → Regulation data loader, Zod schemas
llm/                → LLM integration: agents, routing, tools. Vercel AI SDK
mcp/                → MCP Server (stdio, 8 tools)
```

#### Layer Import Rules

```typescript
// ✅ GOOD — services import from ports
import type { ScannerPort } from '../ports/scanner.port.js';

// ✅ GOOD — http imports from services
import { createScanService } from '../services/scan-service.js';

// ✅ GOOD — infra imports from ports
import type { EventBusPort } from '../ports/events.port.js';

// ❌ BAD — domain imports from infra
import { eventBus } from '../infra/event-bus.js'; // VIOLATION!

// ❌ BAD — domain imports from services
import { scanService } from '../services/scan-service.js'; // VIOLATION!
```

### Hono Route Structure

Каждый route — модуль. **Без middleware** — вся логика явная:

```typescript
// routes/scan.ts
import { Hono } from 'hono';
import { z } from 'zod';

const ScanRequestSchema = z.object({
  projectPath: z.string().min(1),
  extends: z.array(z.string()).optional(),
});

const app = new Hono();

app.post('/scan', async (c) => {
  // 1. Validate input (Zod)
  const body = ScanRequestSchema.parse(await c.req.json());

  // 2. Call core logic (не middleware!)
  const result = await scanProject(body.projectPath, body.extends);

  // 3. Return typed response
  return c.json(result);
});

export default app;
```

### Error Handling

```typescript
// Иерархия AppError — единственное место где class допустим
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
  }
}

class ScanError extends AppError {
  constructor(message: string) { super(message, 'SCAN_ERROR', 500); }
}

class ValidationError extends AppError {
  constructor(message: string) { super(message, 'VALIDATION_ERROR', 400); }
}

class EngineNotReadyError extends AppError {
  constructor() { super('Engine is not ready', 'ENGINE_NOT_READY', 503); }
}

// Глобальный обработчик ошибок в Hono
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.code, message: err.message }, err.statusCode);
  }
  logger.error('Unexpected error:', err);
  return c.json({ error: 'INTERNAL', message: 'Internal server error' }, 500);
});
```

---

## 7. Rule Pack Standard

Каждый rule pack (домен комплаенса) следует единому формату:

```typescript
// engine/core/src/core/scanner/packs/{pack-name}/index.ts
export const packManifest = {
  name: 'complior:eu-ai-act',
  version: '1.0.0',
  domain: 'ai-compliance',
  legalBasis: ['EU AI Act', 'GPAI Regulation'],
  checks: [disclosure, contentMarking, logging /* ... */],
} satisfies RulePackManifest;

// Каждая проверка = отдельный файл
// engine/core/src/core/scanner/packs/{pack-name}/{check-name}.ts
export const disclosure: CheckDefinition = {
  id: 'ai-disclosure',
  title: 'AI Disclosure (Art. 50.1)',
  severity: 'CRITICAL',
  reference: 'EU AI Act Art. 50(1)',
  scan: (ast, context) => { /* детерминистичная проверка AST */ },
  fix: (ast, context) => { /* шаблон авто-фикса: возвращает diff */ },
};
```

### Правила

| Правило | Почему |
|---------|--------|
| Один файл = одна проверка | Атомарность, независимое тестирование |
| `scan()` — чистая функция: AST + context → findings | Детерминизм, тестируемость |
| `fix()` — возвращает diff, не применяет | Применение через Compliance Gate |
| Каждая проверка — тест с fixture (pass + fail) | Без тестов нет гарантий |
| `severity`: `CRITICAL \| HIGH \| MEDIUM \| LOW \| INFO` | Единая шкала |
| `reference` обязательна для юридических проверок | Трейсабельность к закону |
| Нет зависимостей от LLM | Детерминистичное ядро |

### Домены

| Домен | Pack | Checks | Фаза |
|-------|------|--------|------|
| AI Compliance | `complior:eu-ai-act` | 7 | Launch |
| Accessibility | `complior:wcag-aa` | 10 | P1 |
| Licenses | `complior:licenses` | 6 | P1 |
| Privacy/GDPR | `complior:privacy-gdpr` | 8 | P2 |

---

## 8. Тестирование

### Фреймворк

| Слой | Фреймворк | Scope |
|------|-----------|-------|
| Unit | Vitest | Scanner checks, fixers, pure functions |
| Integration | Vitest + supertest | Hono routes, IPC |

### Целевое покрытие

| Слой | Цель |
|------|------|
| Проверки сканера | 95%+ |
| Шаблоны фиксов | 90%+ |
| Инструменты кода | 80%+ |
| Hono routes | 80%+ |

### Примеры

```typescript
import { describe, it, expect } from 'vitest';
import { scanProject } from './scanner.ts';

describe('Scanner', () => {
  it('обнаруживает отсутствие AI-раскрытия', async () => {
    const result = await scanProject('./fixtures/no-disclosure');
    expect(result.findings).toContainEqual(
      expect.objectContaining({ rule: 'ai-disclosure' }),
    );
  });

  it('score детерминистичен', async () => {
    const r1 = await scanProject('./fixtures/sample');
    const r2 = await scanProject('./fixtures/sample');
    expect(r1.score).toBe(r2.score);
  });

  it('должен вернуть 100 когда все проверки пройдены', async () => {
    const result = await scanProject('./fixtures/fully-compliant');
    expect(result.score).toBe(100);
    expect(result.findings.every(f => f.type === 'pass')).toBe(true);
  });
});
```

### Test Naming

- `describe('ComponentOrFunction')` — target being tested
- `it('should [expected behavior] when [condition]')` — BDD style
- Factory helpers: `createMockFinding()`, `createTestConfig()`

### Mocking

- Mock ONLY external boundaries: LLM API, file system, network
- Никогда не мокай scanner checks (они детерминистичны — тестируй на fixtures)
- Fixtures: `engine/core/src/core/scanner/packs/{pack}/fixtures/` — pass/ и fail/ директории

---

## 9. Запрещённые практики

| Категория | Запрещено | Почему | Замена |
|-----------|-----------|--------|--------|
| **OOP** | `class` (кроме Error) | FP-first | Factory functions |
| **Types** | `any` | Type safety | `unknown` + type guard |
| **Types** | `as` (assertion) | Обходит checker | Type narrowing |
| **Types** | `// @ts-ignore` | Скрывает ошибки | Fix the type |
| **V8 Deopt** | `for...in` | Деоптимизация | `Object.keys()` + `for...of` |
| **V8 Deopt** | `delete obj.prop` | Ломает hidden class | Spread / `= undefined` |
| **V8 Deopt** | Mixins на прототипах | Полиморфизм shape | Composition |
| **V8 Deopt** | Holey arrays `[1,,3]` | Slow path | Заполненные массивы |
| **V8 Deopt** | Multi-type arrays | Нет type specialization | Typed / отдельные |
| **Coercion** | `+'5'`, `*1`, `` `${n}` `` | Неявное преобразование | `Number()`, `String()` |
| **Equality** | `==`, `!=` | Implicit coercion | `===`, `!==` |
| **Variables** | `var` | Hoisting, scope leak | `const`, `let` |
| **Variables** | Chained `a=b=c=0` | Side effects | Отдельные объявления |
| **Functions** | `bind`, `call`, `apply` | Сложность | Arrow functions |
| **Iteration** | `forEach` + мутация | Side effects | `map`, `filter`, `reduce` |
| **Returns** | Array destructuring | Позиционная зависимость | Return object |
| **Returns** | Inconsistent types | Непредсказуемость | Единая структура |
| **Structure** | Code duplication | DRY | Extract function |
| **Structure** | Mixed responsibility | SRP | Split functions |
| **Structure** | Nested `if` > 2 | Complexity | Early returns |
| **Structure** | Files > 300 lines | Complexity | Split modules |
| **Async** | Middleware pattern | Hidden deps | Явные вызовы |
| **Async** | RxJS | Overkill | EventEmitter |
| **Async** | Deferred pattern | Антипаттерн | Normal Promise |
| **Async** | Swallowed `catch {}` | Скрытые ошибки | Log + rethrow |
| **Async** | Callback hell | Readability | async/await |
| **Logging** | `console.log` prod | No structure | pino |
| **Strings** | Magic strings/numbers | Maintainability | Constants в `data/` |
| **Strings** | Inline regulatory text | Дублирование, drift | Константа из `data/` модуля |
| **Strings** | Hardcoded prices/rates | Невозможно обновить | Параметр + default из `data/` |
| **Data** | Mock/stub data в src/ | Утечка в прод | `test-helpers/` + `.test.ts` |
| **Data** | Hardcoded thresholds | Разные домены | Config param + default |
| **Data** | Duplicated constants | Рассинхрон | Single export, import everywhere |
| **Logic** | Business logic в routes | Layer violation | core/ layer |
| **Logic** | LLM в scanner checks | Детерминизм | AST + rules |
| **Security** | `eval()`, `Function()` | Code injection | Не делай |
| **Security** | String concat SQL | SQL injection | Parameterized |
| **Security** | Hardcoded credentials | Leak | Env variables |
| **Security** | `0.0.0.0` listen | External access | `127.0.0.1` |

---

## 10. Linting & Formatting

### ESLint

```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "rules": {
    "no-var": "error",
    "prefer-const": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": "warn",
    "eqeqeq": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-delete-var": "error",
    "no-implicit-coercion": "error",
    "no-multi-assign": "error",
    "no-restricted-syntax": [
      "error",
      { "selector": "ForInStatement", "message": "Use Object.keys() + for...of" },
      { "selector": "TSTypeAssertion", "message": "Use type narrowing, not 'as'" }
    ]
  }
}
```

### Prettier

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always"
}
```

---

## 11. Организация файлов

```
engine/core/src/
├── composition-root.ts  # Single DI wiring point
├── server.ts            # Hono HTTP + MCP server bootstrap
├── index.ts             # Re-export entry
├── version.ts
├── ports/               # Contracts only
│   ├── scanner.port.ts
│   ├── llm.port.ts
│   ├── events.port.ts
│   ├── logger.port.ts
│   └── browser.port.ts
├── domain/              # Pure business logic
│   ├── scanner/         # 5-layer compliance scanner
│   │   ├── create-scanner.ts
│   │   ├── layers/      # layer1-files, layer2-docs, layer3-config, layer4-patterns, layer5-llm
│   │   ├── rules/       # banned-packages, pattern-rules
│   │   ├── checks/      # 7 check modules
│   │   └── external/    # External URL scanner
│   ├── fixer/           # Fix strategies + templates
│   ├── reporter/        # PDF, audit report, badge, share
│   └── whatif/          # Scenario engine
├── services/            # Application orchestration (10 services)
├── http/
│   ├── create-router.ts
│   └── routes/          # 16 Hono route handlers
├── infra/               # Infrastructure adapters
├── llm/                 # Agents, routing, tools, SSE
├── mcp/                 # MCP Server (stdio, 8 tools)
├── data/                # Regulation loader + Zod schemas + static reference data
│   ├── templates/       # Markdown templates (FRIA, worker-notification)
│   ├── schemas/         # JSON schemas (http-contract)
│   └── *.ts             # Constants: patterns, penalties, defaults
├── onboarding/          # Wizard, profile, auto-detect
├── types/               # common.types.ts, errors.ts
├── test-helpers/        # Shared test factories (createMockManifest, etc.)
├── output/              # JSON output, GitHub issue format
└── hooks/               # Git hooks installer
```

### Расположение данных и конфигурации

| Тип данных | Расположение | Пример |
|-----------|-------------|--------|
| Regulatory constants | `engine/core/src/data/` | `prohibited-patterns.ts`, `ART5_MAX_PENALTY` |
| PII patterns, SDK defaults | `engine/sdk/src/data/` | `pii-patterns.ts`, `DEFAULT_COST_PER_1K` |
| Document templates | `engine/core/data/templates/` | `fria.md`, `worker-notification.md` |
| Test factories & mocks | `*/test-helpers/` или `.test.ts` | `createMockManifest()`, `createMockFinding()` |
| Runtime config | Function parameters | `costRates?`, `biasThreshold?` |
| Project state | `.complior/` (gitignored) | passports, evidence, reports |
| User config | `~/.config/complior/` | keys, credentials |

**Правило:** Если значение имеет бизнес-смысл (цена, порог, regulatory text) — оно ДОЛЖНО быть в `data/` как именованная константа и конфигурируемо через параметр функции.

---

**Последнее обновление:** 2026-03-07
**Автор:** Marcus (CTO) via Claude Code
