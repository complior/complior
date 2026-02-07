# CODING-STANDARDS.md — AI Act Compliance Platform

**Версия:** 1.0.0
**Дата:** 2026-02-07
**Автор:** Marcus (CTO) via Claude Code
**Статус:** ✅ Утверждён Product Owner (2026-02-07)
**Зависимости:** ARCHITECTURE.md ✅

---

## 1. Парадигма программирования

### Функциональное программирование (FP-first)

- **НЕ используем классы** (исключение: Error subclasses, MetaSQL schema definitions)
- **Pure functions** — функции без побочных эффектов для бизнес-логики
- **Immutable data** — `const`, `Object.freeze()`, spread operators для обновлений
- **Composition over inheritance** — compose функции, не наследуй
- **Higher-order functions** — curry, partial application для переиспользования

```javascript
// ✅ GOOD — чистая функция
const calculateComplianceScore = (requirements) =>
  requirements.reduce((total, req) => total + req.progress, 0) /
  (requirements.length * 100) * 100;

// ❌ BAD — класс с мутабельным состоянием
class ComplianceCalculator {
  constructor() { this.score = 0; }
  addRequirement(req) { this.score += req.progress; }
}
```

### Factory Functions (вместо классов)

```javascript
// ✅ GOOD — factory function с замыканием
const createClassificationEngine = ({ ruleEngine, llmClient, db }) => ({
  async classify(systemId, answers) {
    const ruleResult = ruleEngine.apply(answers);
    if (ruleResult.confidence >= 90) return ruleResult;
    const llmResult = await llmClient.classify(answers);
    return resolveClassification(ruleResult, llmResult);
  },
});
```

---

## 2. TypeScript

### Строгий режим

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Правила типизации

| Правило | Пример |
|---------|--------|
| Явные типы для public API | `const classify = (answers: WizardAnswers): ClassificationResult => ...` |
| Zod для runtime validation | `const CreateSystemSchema = z.object({ name: z.string().max(255) })` |
| Запрещён `any` | Используй `unknown` + type guard |
| Запрещён `as` (type assertion) | Используй type narrowing / type guards |
| Union types для enums | `type RiskLevel = 'prohibited' \| 'high' \| 'gpai' \| 'limited' \| 'minimal'` |
| Readonly для иммутабельности | `readonly requirements: Requirement[]` |

```javascript
// ✅ GOOD — type guard вместо assertion
const isHighRisk = (level: RiskLevel): level is 'high' => level === 'high';

// ❌ BAD — type assertion
const level = data.riskLevel as RiskLevel;
```

---

## 3. Именование (Naming Conventions)

### Файлы

| Тип | Паттерн | Пример |
|-----|---------|--------|
| Backend module | `kebab-case.js` | `classification-engine.js` |
| MetaSQL schema | `PascalCase.js` | `AISystem.js`, `RiskClassification.js` |
| Config | `kebab-case.js` | `config/database.js` |
| API endpoint | `kebab-case.js` | `api/systems/classify.js` |
| Frontend component | `PascalCase.tsx` | `RiskWizard.tsx` |
| Frontend hook | `camelCase.ts` | `useClassification.ts` |
| Test | `*.test.ts` | `classification-engine.test.ts` |
| Type file | `*.types.ts` | `classification.types.ts` |

### Код

| Тип | Паттерн | Пример |
|-----|---------|--------|
| Переменные / функции | `camelCase` | `calculateScore`, `riskLevel` |
| Типы / Interfaces | `PascalCase` | `ClassificationResult`, `AISystem` |
| Константы | `UPPER_SNAKE_CASE` | `MAX_RISK_SCORE`, `ANNEX_III_DOMAINS` |
| Enums (string unions) | `snake_case` values | `'not_started'`, `'in_progress'` |
| Private (convention) | `_prefix` | `_validateInput` (not exported) |
| Boolean | `is/has/can` prefix | `isHighRisk`, `hasDocumentation` |
| Event names | `PastTense` | `SystemClassified`, `DocumentGenerated` |

---

## 4. V8 Optimization & Code Quality Rules

### Избегание деоптимизаций (V8 Hidden Classes & Object Shapes)

V8 оптимизирует код на основе стабильных «форм» объектов (hidden classes). Нарушение стабильности формы ведёт к деоптимизации — переходу с оптимизированного машинного кода обратно на интерпретатор.

#### Мономорфные объекты — одинаковая форма всегда

```javascript
// ✅ GOOD — объекты всегда одной формы, все поля инициализированы
const createClassificationResult = (riskLevel, confidence) => ({
  riskLevel,
  confidence,
  reasoning: '',
  method: 'rule_only',
  articleReferences: [],
});

// ❌ BAD — полиморфные объекты (разные формы в одном потоке)
const result = { riskLevel };
if (hasLLM) result.llmResult = llmData;   // Меняет shape!
if (hasCross) result.crossValidation = cv; // Ещё раз меняет shape!
```

#### Запрещённые деоптимизирующие паттерны

| Паттерн | Проблема | Замена |
|---------|----------|--------|
| `for...in` | Деоптимизация, включает prototype chain | `Object.keys()` + `for...of` |
| `delete obj.prop` | Разрушает hidden class | `obj.prop = undefined` или создать новый объект |
| Mixins (`Object.assign` на прототип) | Полиморфизм hidden classes | Factory functions с composition |
| Holey arrays `[1, , 3]` | V8 переключается на медленный путь | Всегда заполняй массивы |
| Multi-type arrays `[1, 'a', {}]` | Нет специализации типов | Отдельные массивы или объект |

```javascript
// ✅ GOOD
const keys = Object.keys(system);
for (const key of keys) { /* ... */ }

// ❌ BAD — for...in
for (const key in system) { /* ... */ }

// ✅ GOOD — spread для удаления поля
const { sensitiveField, ...safeData } = userData;

// ❌ BAD — delete
delete userData.sensitiveField;
```

### Readability & Cognitive Complexity

#### Минимизируй `if` вложенность — early return

```javascript
// ✅ GOOD — early returns, flat structure
const classifySystem = async (answers) => {
  if (!answers.domain) throw new ValidationError('Domain required');
  if (isProhibited(answers)) return { riskLevel: 'prohibited', confidence: 99 };
  if (isClearHighRisk(answers)) return { riskLevel: 'high', confidence: 95 };
  return await classifyWithLLM(answers);
};

// ❌ BAD — nested ifs, hard to follow
const classifySystem = async (answers) => {
  if (answers.domain) {
    if (isProhibited(answers)) {
      return { riskLevel: 'prohibited', confidence: 99 };
    } else {
      if (isClearHighRisk(answers)) {
        return { riskLevel: 'high', confidence: 95 };
      } else {
        return await classifyWithLLM(answers);
      }
    }
  } else {
    throw new ValidationError('Domain required');
  }
};
```

#### Избегай union types для разных структур — используй discriminated unions

```javascript
// ✅ GOOD — discriminated union, предсказуемый контракт
const createRuleResult = (level, rules) => ({
  type: 'rule_based',
  riskLevel: level,
  confidence: 95,
  matchedRules: rules,
});

const createLLMResult = (level, article, reasoning) => ({
  type: 'llm_based',
  riskLevel: level,
  article,
  reasoning,
});

// ❌ BAD — непредсказуемый контракт, поля то есть то нет
const classify = (answers) => {
  const result = { riskLevel: 'high' };
  if (fromRules) result.matchedRules = rules;    // Может быть, может не быть
  if (fromLLM) result.reasoning = text;           // Может быть, может не быть
  return result;
};
```

#### Consistent return — функция всегда возвращает одну структуру

```javascript
// ✅ GOOD — всегда один и тот же тип
const getSystemStatus = (system) => ({
  isCompliant: system.complianceScore >= 100,
  score: system.complianceScore,
  message: system.complianceScore >= 100 ? 'Compliant' : 'In progress',
});

// ❌ BAD — inconsistent return
const getSystemStatus = (system) => {
  if (system.complianceScore >= 100) return true;  // boolean
  return { score: system.complianceScore };         // object
};
```

#### Возвращай объекты, не массивы (avoid array destructuring for returns)

```javascript
// ✅ GOOD — named fields, self-documenting
const parseClassification = (raw) => ({
  riskLevel: raw.level,
  confidence: raw.conf,
  reasoning: raw.text,
});
const { riskLevel, confidence } = parseClassification(data);

// ❌ BAD — позиционное деструктурирование (что 0, что 1?)
const parseClassification = (raw) => [raw.level, raw.conf, raw.text];
const [riskLevel, confidence] = parseClassification(data);
```

#### Нет code duplication — extract to function

```javascript
// ✅ GOOD — shared logic extracted
const formatRequirement = (req) => ({
  code: req.code,
  name: req.name,
  articleRef: req.articleReference,
  status: req.status || 'pending',
});

const mapRequirements = (requirements) => requirements.map(formatRequirement);
const mapHighRiskRequirements = (requirements) =>
  requirements.filter((r) => r.riskLevel === 'high').map(formatRequirement);

// ❌ BAD — copy-paste с минимальными отличиями
```

#### Single responsibility — одна функция = одна задача

```javascript
// ✅ GOOD — разделение ответственности
const validateWizardInput = (answers) => { /* только валидация */ };
const applyRules = (answers) => { /* только rules */ };
const saveClassification = (result) => { /* только persist */ };
const classifySystem = async (answers) => {
  validateWizardInput(answers);
  const result = applyRules(answers);
  await saveClassification(result);
  return result;
};

// ❌ BAD — mixed responsibility
const classifyAndSaveAndNotify = async (answers) => {
  // валидирует, классифицирует, сохраняет, шлёт email — всё в одной функции
};
```

### Переменные и операторы

#### `const` > `let` > ~~`var`~~

```javascript
// ✅ GOOD
const MAX_CONFIDENCE = 100;
const riskLevel = classify(answers);
let retries = 3;
while (retries > 0) { /* ... */ retries--; }

// ❌ BAD
var riskLevel = classify(answers);  // НИКОГДА var
```

#### Строгое равенство — только `===` и `!==`

```javascript
// ✅ GOOD
if (riskLevel === 'high') { /* ... */ }
if (confidence !== 0) { /* ... */ }

// ❌ BAD — implicit coercion
if (riskLevel == 'high') { /* ... */ }
if (confidence != 0) { /* ... */ }
```

#### Запрещено implicit type coercion

```javascript
// ❌ BAD — неявное приведение типов
const num = +'5';        // Используй Number('5') или parseInt('5', 10)
const num = str * 1;     // Используй Number(str)
const str = `${num}`;    // Используй String(num)
const num = -0;           // Неочевидное поведение
const num = value / 1;   // Используй Number(value)

// ✅ GOOD — явное приведение
const num = Number('5');
const num = parseInt(input, 10);
const str = String(num);
```

#### Запрещено chained assignments

```javascript
// ❌ BAD — chained assignment (трудно отследить side effects)
let a = b = c = 0;

// ✅ GOOD — каждая переменная объявлена отдельно
const a = 0;
const b = 0;
const c = 0;
```

#### Избегай `bind`, `call`, `apply`

```javascript
// ❌ BAD
const handler = processMessage.bind(this, systemId);
callback.call(context, data);
fn.apply(null, args);

// ✅ GOOD — arrow functions и spread
const handler = (msg) => processMessage(systemId, msg);
callback(data);  // передай context через замыкание
fn(...args);
```

#### Избегай `forEach` с доступом к внешнему scope

```javascript
// ❌ BAD — forEach мутирует outer scope
const results = [];
systems.forEach((system) => {
  results.push(classifySystem(system));  // мутация outer scope
});

// ✅ GOOD — map/filter/reduce (чистые, возвращают новый массив)
const results = systems.map((system) => classifySystem(system));
const highRisk = systems.filter((s) => s.riskLevel === 'high');
const totalScore = systems.reduce((sum, s) => sum + s.complianceScore, 0);
```

---

## 5. Асинхронное программирование

### Уровни владения async-паттернами

| 💯 Applied (обязательно) | 🧑‍🎓 Advanced (backend) | ⚙️ System (платформа) | 🧑‍🚀 Elective (опционально) | 🕰️ Legacy (НЕ ИСПОЛЬЗУЕМ) |
|---|---|---|---|---|
| callbacks | AsyncQueue | Thenable | compose callbacks | Deferred |
| promises | AsyncPool | Semaphore | async compose | `function*/yield` |
| async/await | AsyncCollector | Mutex | Observer | Async.js |
| events (EventEmitter) | Chain of Responsibility | Spin Lock | Future | Metasync |
| streams | Async Generator | MessageChannel | Coroutines | **middleware pattern** |
| signals (AbortSignal) | GoF Iterator pattern | BroadcastChannel | Actor Model | **RxJS** |
| locks | Actor pattern | threads | do-notation | |
| iterators | Disposable | processes | | |

### Что используем (Applied 💯 — обязательно для всех)

```javascript
// ✅ async/await — основной паттерн
const classifySystem = async (systemId) => {
  const system = await db.AISystem.read(systemId);
  const result = await classificationEngine.classify(system);
  await db.RiskClassification.create(result);
  return result;
};

// ✅ Promise.all для параллельных операций
const [system, requirements, documents] = await Promise.all([
  db.AISystem.read(systemId),
  db.SystemRequirement.query('...', [systemId]),
  db.ComplianceDocument.query('...', [systemId]),
]);

// ✅ EventEmitter для cross-context events
const events = new EventEmitter();
events.on('SystemClassified', async ({ systemId, riskLevel }) => {
  await createChecklist(systemId, riskLevel);
  await recalculateScore(systemId);
});

// ✅ Streams для document export и file upload
const readStream = createReadStream(filePath);
readStream.pipe(transformStream).pipe(s3UploadStream);

// ✅ AbortSignal для cancellation
const controller = new AbortController();
const response = await fetch(url, { signal: controller.signal });
setTimeout(() => controller.abort(), 15000); // 15s timeout

// ✅ AsyncIterator для pagination
async function* paginateSystems(orgId, pageSize = 50) {
  let offset = 0;
  while (true) {
    const page = await db.query(
      'SELECT * FROM "AISystem" WHERE "organizationId" = $1 LIMIT $2 OFFSET $3',
      [orgId, pageSize, offset]
    );
    if (page.length === 0) break;
    yield page;
    offset += pageSize;
  }
}
```

### Что используем на backend (Advanced 🧑‍🎓 — для Max)

```javascript
// ✅ AsyncQueue для rate-limited LLM calls
const createAsyncQueue = (concurrency) => {
  const queue = [];
  let running = 0;
  const next = async () => {
    if (running >= concurrency || queue.length === 0) return;
    running++;
    const { fn, resolve, reject } = queue.shift();
    try { resolve(await fn()); }
    catch (e) { reject(e); }
    finally { running--; next(); }
  };
  return {
    add: (fn) => new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    }),
  };
};

// Используем для Mistral API rate limiting
const llmQueue = createAsyncQueue(5); // max 5 concurrent LLM calls
const result = await llmQueue.add(() => mistralClient.classify(data));

// ✅ AsyncPool для batch operations
const classifyBatch = async (systems, concurrency = 3) => {
  const results = [];
  const executing = new Set();
  for (const system of systems) {
    const promise = classifySystem(system.id).then((r) => {
      executing.delete(promise);
      results.push(r);
    });
    executing.add(promise);
    if (executing.size >= concurrency) await Promise.race(executing);
  }
  await Promise.all(executing);
  return results;
};

// ✅ Disposable pattern для cleanup
const createDBTransaction = async () => {
  const client = await db.pool.connect();
  await client.query('BEGIN');
  return {
    query: (sql, params) => client.query(sql, params),
    commit: async () => { await client.query('COMMIT'); client.release(); },
    rollback: async () => { await client.query('ROLLBACK'); client.release(); },
    [Symbol.asyncDispose]: async () => {
      try { await client.query('ROLLBACK'); } catch {}
      client.release();
    },
  };
};

// Использование с await using (Node 22+)
await using tx = await createDBTransaction();
await tx.query('INSERT INTO ...', [...]);
await tx.query('INSERT INTO ...', [...]);
await tx.commit();
// Автоматический rollback если commit не вызван
```

### Что НЕ используем (Legacy 🕰️ — запрещено)

```javascript
// ❌ ЗАПРЕЩЕНО — middleware pattern (Express-style)
// Причина: неявный flow, сложная отладка, hidden dependencies
app.use(authMiddleware);
app.use(loggingMiddleware);
app.use(errorMiddleware);
// Вместо этого: явные вызовы в handler

// ❌ ЗАПРЕЩЕНО — RxJS
// Причина: избыточная абстракция для нашего use case, высокий порог входа
import { Observable } from 'rxjs';
const stream$ = new Observable(subscriber => { ... });
// Вместо этого: EventEmitter + async/await

// ❌ ЗАПРЕЩЕНО — function*/yield (generators как async)
// Причина: устаревший паттерн, заменён async/await
function* fetchData() { yield fetch(url); }
// Вместо этого: async/await

// ❌ ЗАПРЕЩЕНО — Deferred pattern
// Причина: антипаттерн, нарушает инкапсуляцию Promise
const deferred = {};
deferred.promise = new Promise((resolve, reject) => {
  deferred.resolve = resolve;  // Выносим resolve наружу — антипаттерн
  deferred.reject = reject;
});
// Вместо этого: нормальная структура Promise

// ❌ ЗАПРЕЩЕНО — Async.js, Metasync
// Причина: legacy библиотеки, всё реализуется нативно через async/await

// ❌ ЗАПРЕЩЕНО — callback hell
fetchUser(id, (err, user) => {
  fetchSystems(user.orgId, (err, systems) => {
    classifySystem(systems[0], (err, result) => {
      // ...
    });
  });
});
// Вместо этого: async/await с последовательными await
```

### Error handling в async

```javascript
// ✅ GOOD — try/catch на уровне use case
const classifySystem = async (systemId) => {
  try {
    const system = await db.AISystem.read(systemId);
    if (!system) throw new NotFoundError('AISystem', systemId);
    const result = await classificationEngine.classify(system);
    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new ClassificationError(`Unexpected: ${error.message}`);
  }
};

// ✅ GOOD — Promise.allSettled для graceful batch errors
const results = await Promise.allSettled(
  systems.map((s) => classifySystem(s.id))
);
const succeeded = results.filter((r) => r.status === 'fulfilled');
const failed = results.filter((r) => r.status === 'rejected');

// ❌ BAD — swallowed errors
try { await riskyOperation(); } catch {} // Никогда так!
```

---

## 6. Backend Architecture Rules (Max)

### CQS (Command Query Separation)

Функция либо **изменяет состояние**, либо **возвращает данные**, но никогда оба одновременно:

```javascript
// ✅ GOOD — CQS: command отдельно, query отдельно
const classifySystem = async (systemId, answers) => {
  const result = computeClassification(answers);
  await db.RiskClassification.create(result);    // command — только запись
};

const getClassification = async (systemId) =>     // query — только чтение
  db.RiskClassification.query('...', [systemId]);

// ❌ BAD — и пишет, и возвращает (нарушение CQS)
const classifyAndReturn = async (answers) => {
  const result = computeClassification(answers);
  await db.RiskClassification.create(result);
  return result;  // Смешение command + query
};
```

**Исключение:** `create → return id` допустимо для API endpoints (клиенту нужен ID созданного ресурса).

### Command Pattern для Domain Events

Domain events — анемичные сериализуемые объекты (Commands). Это позволяет: логировать, передавать по сети, воспроизводить для отладки:

```javascript
// ✅ GOOD — event как анемичный объект, сериализуемый
const createClassificationEvent = (systemId, result, userId) => ({
  type: 'SystemClassified',
  systemId,
  riskLevel: result.riskLevel,
  confidence: result.confidence,
  method: result.method,
  userId,
  timestamp: new Date().toISOString(),
});

// Записываем в audit trail + emit для подписчиков
events.emit('SystemClassified', createClassificationEvent(systemId, result, userId));
```

### Системные vs бизнес-ошибки (pg-boss)

| Тип | Пример | Действие |
|-----|--------|----------|
| **Системная ошибка** | PostgreSQL недоступен, Mistral API timeout | **Retry** — pg-boss повторит job |
| **Бизнес-ошибка** | Невалидные wizard answers, система уже классифицирована | **Завершить** — job обработан, результат — ошибка |

```javascript
// ✅ GOOD — различаем типы ошибок в worker
const processClassifyJob = async (job) => {
  try {
    const result = await classifySystem(job.data.systemId);
    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;  // бизнес-ошибка — не retry
    throw error;                                    // системная — retry
  }
};
```

### Idempotency (GUID)

Каждое MQ-сообщение содержит уникальный GUID для предотвращения дублирования (работает одинаково для pg-boss и BullMQ через JobQueue adapter):

```javascript
// ✅ GOOD — GUID генерируется отправителем
const jobId = crypto.randomUUID();
await jobQueue.enqueue('classify-system', { systemId, jobId });

// Worker проверяет: если job с таким GUID уже обработан — пропускаем
const existing = await db.ClassificationLog.query(
  'SELECT 1 FROM "ClassificationLog" WHERE "jobId" = $1', [jobId]
);
if (existing.length > 0) return; // Idempotent — skip duplicate
```

### Закон Деметры: «Не разговаривай с незнакомцами»

Модуль использует только прямые зависимости, не лезет вглубь чужих структур:

```javascript
// ✅ GOOD — работаем с прямой зависимостью
const orgName = organization.name;

// ❌ BAD — лезем через цепочку объектов (нарушение Law of Demeter)
const orgName = user.organization.billing.plan.name;
```

### DDD / Onion Layer Rules

```
domain/         → PURE logic, NO external deps, NO imports from outer layers
application/    → Orchestration, CAN import domain, schema
schemas/        → MetaSQL definitions, CAN reference domain types
api/            → HTTP routing, validation, ONLY calls application layer
infrastructure/ → DB, LLM, S3, ONLY called from application layer
config/         → Environment-based, NO business logic
lib/            → Shared utilities (db.js, common.js, errors.js)
```

### Layer Import Rules

```javascript
// ✅ GOOD — application imports from domain
// application/classification/classifySystem.js
const { classify } = domain.classification.services.ClassificationEngine;

// ❌ BAD — domain imports from infrastructure
// domain/classification/entities/AISystem.js
const { db } = require('../../infrastructure/db'); // VIOLATION!
```

### API Endpoint Structure

Каждый endpoint в `api/` — модуль, экспортирующий handler. **Без middleware** — вся логика явная:

```javascript
// api/systems/classify.js
({
  method: 'POST',
  path: '/api/systems/:id/classify',
  handler: async ({ params, body, user }) => {
    // 1. Validate input (Zod)
    const { id } = ClassifyParamsSchema.parse(params);

    // 2. Authorization check (явный, не middleware!)
    const system = await db.AISystem.read(id);
    if (system.organizationId !== user.organizationId) throw new ForbiddenError();

    // 3. Call application layer
    const result = await application.classification.classifySystem(id);

    // 4. Audit log (явный, не middleware!)
    await db.AuditLog.create({
      userId: user.id, action: 'classify',
      resource: 'AISystem', resourceId: id,
    });

    // 5. Return typed response
    return { status: 200, body: result };
  },
});
```

### Error Handling

```javascript
// lib/errors.js — custom error hierarchy (единственное место где class допустим)
class AppError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

class NotFoundError extends AppError {
  constructor(entity, id) {
    super(`${entity} ${id} not found`, 'NOT_FOUND', 404);
  }
}

class ForbiddenError extends AppError {
  constructor() {
    super('Access denied', 'FORBIDDEN', 403);
  }
}

class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed', 'VALIDATION_ERROR', 400);
    this.errors = errors;
  }
}

class ClassificationError extends AppError {
  constructor(reason) {
    super(`Classification failed: ${reason}`, 'CLASSIFICATION_ERROR', 500);
  }
}
```

### Database Access

```javascript
// ✅ GOOD — через CRUD builder (lib/db.js), parameterized
const system = await db.AISystem.read(id);
const systems = await db.AISystem.query(
  'SELECT * FROM "AISystem" WHERE "organizationId" = $1 AND "riskLevel" = $2',
  [orgId, 'high']
);

// ✅ GOOD — с транзакцией через Disposable
await using tx = await createDBTransaction();
await tx.query('INSERT INTO "AISystem" ...', [...]);
await tx.query('INSERT INTO "AuditLog" ...', [...]);
await tx.commit();

// ❌ BAD — SQL injection
const systems = await db.query(`SELECT * FROM "AISystem" WHERE name = '${name}'`);
```

---

## 7. Frontend Architecture Rules (Nina)

### 3-Layer Frontend Architecture

Фронтенд строится на трёх разделённых слоях (из доклада Ильи Климова):

```
Transport Layer (React Query / TanStack Query)
    ↓ данные (дедупликация, кэш, ревалидация)
Store / Business Logic (Zustand, XState)
    ↓ состояние
Components (React) — ТОЛЬКО отображение
```

**Правила:**
- **Транспортный слой** (React Query) решает: дедупликацию запросов, кэш, ревалидацию. Он ничего не знает о бизнес-логике
- **Store** содержит бизнес-правила и гарантирует согласованность. Он ничего не знает о кнопках
- **Компоненты** отображают данные из store и отправляют события. Они ничего не знают, откуда данные пришли

```tsx
// ❌ BAD — бизнес-логика прямо в компоненте поверх React Query хуков
const SystemCard = ({ id }) => {
  const { data } = useQuery(['system', id], fetchSystem);
  const isHighRisk = data?.riskLevel === 'high' || data?.riskLevel === 'prohibited';
  const score = data?.requirements?.reduce((s, r) => s + r.progress, 0) / (data?.requirements?.length * 100) * 100;
  // ...куча вычислений в компоненте
};

// ✅ GOOD — компонент работает со store, не с транспортом
const SystemCard = ({ id }) => {
  const { system, isHighRisk, complianceScore } = useSystemStore(id);
  if (!system) return <Skeleton />;
  return <Card className={isHighRisk ? 'border-red-500' : ''}>{/* ... */}</Card>;
};
```

### State Charts (XState) для 5-step Wizard

Для сложных многошаговых процессов (наш Wizard регистрации AI-систем — 5 шагов с переходами туда-обратно) используем XState:

```tsx
// domain/classification/wizardMachine.ts — state chart для wizard
// Декларативное описание переходов: наглядно, тестируемо, визуализируемо
// XState генерирует диаграмму, понятную аналитику (Elena может проверить flow)

// Правила:
// - НЕ моделируйте всё приложение как один state chart
// - Используйте ТОЛЬКО для сложных процессов (wizard, multi-step forms)
// - State machine НИЧЕГО не знает про UI — компоненты отображают состояние
```

### Facade для shadcn/ui компонентов

Все внешние UI-компоненты оборачиваются в Facade — менее настраиваемый, но более контролируемый:

```tsx
// ✅ GOOD — Facade: OurDropdown ограничивает API до нашей дизайн-системы
// components/ui/RiskLevelSelect.tsx
const RiskLevelSelect = ({ value, onChange }: RiskLevelSelectProps) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder="Risk level" />
    </SelectTrigger>
    <SelectContent>
      {RISK_LEVELS.map((level) => (
        <SelectItem key={level.value} value={level.value}>
          <RiskBadge level={level.value} /> {level.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

// ❌ BAD — прямое использование shadcn Select с 15 пропсами в каждом месте
```

### Design System: Tokens vs Components

| Слой | Стабильность | Что включает | Где хранить |
|------|-------------|-------------|-------------|
| **Design Tokens** (атомы) | Высокая, меняются редко | Цвета, spacing, typography, shadows, border-radius | `tailwind.config.ts` |
| **Components** | Меняются часто | Button, Badge, Card, Select | `components/ui/` (Facade обёртки) |

Токены обеспечивают визуальную консистентность. Компоненты — реализация на основе токенов.

### State Management — иерархия scope

Состояние живёт максимально локально. Поднимаем выше ТОЛЬКО когда нужно:

| Scope | Инструмент | Когда использовать |
|-------|-----------|-------------------|
| **Компонент** | `useState` | Accordion expanded, modal open, input value |
| **Форма** | React Hook Form + Zod | Wizard steps, registration form |
| **Группа компонентов** | React Context | Theme, sidebar state |
| **Server state** | React Query | Списки систем, dashboard данные, классификации |
| **Global app state** | Zustand | Auth, notifications, feature flags |

**Правило:** много маленьких store лучше одного гигантского Redux. Не тащите локальное состояние компонента в глобальный store.

### Components

```tsx
// ✅ GOOD — functional component + hooks
const RiskWizard = ({ systemId }: { systemId: string }) => {
  const [step, setStep] = useState(1);
  const { data, isLoading } = useQuery(['system', systemId], fetchSystem);

  if (isLoading) return <Skeleton />;

  return (
    <WizardLayout step={step} totalSteps={5}>
      {step === 1 && <BasicInfoStep onNext={() => setStep(2)} />}
      {step === 2 && <PurposeStep onNext={() => setStep(3)} />}
      {/* ... */}
    </WizardLayout>
  );
};
```

### State Management

| Scope | Tool | Example |
|-------|------|---------|
| Local UI state | `useState` | Wizard step, modal open |
| Form state | React Hook Form + Zod | Registration form, wizard forms |
| Server state | React Query | AI systems list, dashboard data |
| Global UI state | Zustand | Theme, sidebar, notifications |
| Auth state | Zustand + React Query | Current user, organization |

### Styling

```tsx
// ✅ GOOD — TailwindCSS + shadcn/ui
<Card className="p-6 border-l-4 border-l-red-500">
  <Badge variant="destructive">High Risk</Badge>
  <p className="text-sm text-muted-foreground mt-2">{system.description}</p>
</Card>

// ❌ BAD — inline styles
<div style={{ padding: 24, borderLeft: '4px solid red' }}>

// ❌ BAD — CSS modules (не используем)
import styles from './card.module.css';
```

### Accessibility (WCAG AA)

- Все интерактивные элементы — keyboard accessible
- `aria-label` для иконок без текста
- Цветовой контраст минимум 4.5:1
- Focus visible indicator
- Screen reader friendly: semantic HTML, landmarks

### Responsive Design

- Mobile-first: стартуем с `sm:`, расширяем для `md:`, `lg:`
- Dashboard: responsive grid (1 col mobile → 2 col tablet → 3 col desktop)
- Wizard: full-width mobile, centered card desktop

---

## 8. VM Sandbox Integration

### Context Injection

Модули загружаются в VM sandbox. Зависимости инжектируются через frozen context:

```javascript
// Каждый модуль получает доступ ТОЛЬКО к разрешённым зависимостям
const moduleContext = Object.freeze({
  console: logger,                    // Логгер (не console.log!)
  config: Object.freeze(config),      // Конфигурация (read-only)
  db: Object.freeze(db),              // Database CRUD builder (read-only reference)
  common: Object.freeze(common),      // Utilities (password hashing, etc.)
  domain: Object.freeze(domain),      // Domain layer
  llm: Object.freeze(llmAdapter),     // LLM client (Mistral API)
  storage: Object.freeze(s3Client),   // S3 storage
});
```

### Rules

- **НЕ используй** `require()` или `import` в модулях — всё через context
- **НЕ мутируй** context объекты — они frozen
- **НЕ используй** `eval()`, `Function()`, или другие динамические конструкции
- **Timeout:** каждый script имеет timeout (default: 5000ms)

---

## 9. Security Standards

### OWASP Top 10 Compliance

| Threat | Mitigation |
|--------|------------|
| **Injection (SQL/NoSQL)** | Parameterized queries ONLY. No string concatenation in SQL. |
| **Broken Auth** | scrypt password hashing, secure session tokens, httpOnly cookies |
| **Sensitive Data Exposure** | TLS 1.3, AES-256 at rest, no PII in logs |
| **XXE** | JSON only (no XML parsing) |
| **Broken Access Control** | RBAC on every endpoint, organizationId filter |
| **Security Misconfiguration** | Helmet headers, CORS whitelist, no debug in production |
| **XSS** | React auto-escaping, CSP headers, no `dangerouslySetInnerHTML` |
| **Insecure Deserialization** | Zod validation on all input |
| **Using Components with Known Vulns** | `npm audit` in CI, Snyk scanning |
| **Insufficient Logging** | Audit trail for all data access, Sentry for errors |

### Credentials

```javascript
// ✅ GOOD — environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
};

// ❌ BAD — hardcoded credentials
const dbConfig = { host: '127.0.0.1', password: 'marcus' };
```

### Multi-Tenancy Enforcement

КАЖДЫЙ запрос к данным клиентов ОБЯЗАН фильтроваться по `organizationId`:

```javascript
// ✅ GOOD — explicit org filter
const systems = await db.query(
  'SELECT * FROM "AISystem" WHERE "organizationId" = $1',
  [user.organizationId]
);

// ❌ BAD — no tenant filter (data leak!)
const systems = await db.query('SELECT * FROM "AISystem"');
```

---

## 10. Testing Standards

### Framework

| Layer | Framework | Scope |
|-------|-----------|-------|
| Backend unit | Vitest | Domain services, pure functions |
| Backend integration | Vitest + pg | API endpoints, DB operations |
| Frontend unit | Vitest + Testing Library | Components, hooks |
| E2E | Playwright | Critical user flows |

### Coverage Targets

| Layer | Target | Enforcement |
|-------|--------|-------------|
| Domain services | 90%+ | CI блокирует PR |
| Application layer | 80%+ | CI блокирует PR |
| API endpoints | 80%+ | CI блокирует PR |
| Frontend components | 70%+ | CI warning |
| E2E critical paths | 100% of P0 flows | Manual verification |

### Test Structure

```javascript
// classification-engine.test.js
import { describe, it, expect } from 'vitest';

describe('ClassificationEngine', () => {
  describe('classify', () => {
    it('should return prohibited for social scoring systems', async () => {
      const answers = createWizardAnswers({ domain: 'social_scoring' });
      const result = await classify(answers);

      expect(result.riskLevel).toBe('prohibited');
      expect(result.confidence).toBeGreaterThanOrEqual(95);
      expect(result.method).toBe('rule_only');
    });

    it('should escalate to LLM when confidence < 90%', async () => {
      const answers = createWizardAnswers({ domain: 'other', purpose: 'ambiguous' });
      const result = await classify(answers);

      expect(result.method).toMatch(/rule_plus_llm|cross_validated/);
    });
  });
});
```

### Test Naming

- `describe('ComponentOrFunction')` — target being tested
- `it('should [expected behavior] when [condition]')` — BDD style
- Use factory helpers: `createWizardAnswers()`, `createMockSystem()`

### Mocking

- Mock ONLY external boundaries: DB, LLM API, S3, Stripe
- Never mock domain logic
- Use in-memory DB for integration tests where practical

---

## 11. Git Workflow

### Conventional Commits (ОБЯЗАТЕЛЬНО)

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `test` | Adding/fixing tests |
| `docs` | Documentation |
| `refactor` | Code change without feature/bug |
| `chore` | Build, CI, tooling |
| `style` | Formatting (no logic change) |
| `perf` | Performance improvement |

**Scopes:** `auth`, `classification`, `compliance`, `consultation`, `dashboard`, `billing`, `infra`, `ci`

### Branch Naming

```
feat/US-001-user-registration
fix/classification-confidence-rounding
test/compliance-document-generation
```

### PR Flow

```
Developer (Max/Nina) creates PR → develop
  ↓ (parallel)
Marcus: architecture + code quality review
Leo: security audit (OWASP, tenant isolation, input validation)
  ↓ (both approve)
Marcus: merge to develop
  ↓ (release gate)
PO approves: develop → main
```

---

## 12. Code Review Checklist

### Marcus (Architecture + Quality)

- [ ] Follows Onion Architecture (no layer violations)
- [ ] Domain logic is pure (no DB/HTTP imports)
- [ ] Input validated with Zod
- [ ] Error handling uses AppError hierarchy
- [ ] Multi-tenancy: organizationId filter present
- [ ] No `any`, no type assertions
- [ ] No deoptimizing patterns (for-in, delete, holey arrays)
- [ ] No implicit coercion, only `===`/`!==`
- [ ] Functions small (< 50 lines), single responsibility
- [ ] Consistent return types (no mixed return shapes)
- [ ] No mutable outer scope in forEach (use map/filter/reduce)
- [ ] Async: proper error handling, no swallowed errors
- [ ] No legacy patterns (middleware, RxJS, generators-as-async)
- [ ] Tests cover happy path + error cases
- [ ] Conventional Commit format

### Leo (Security)

- [ ] No SQL injection (parameterized queries only)
- [ ] No XSS vectors (no raw HTML rendering, no `dangerouslySetInnerHTML`)
- [ ] RBAC check on endpoint
- [ ] Sensitive data not in logs
- [ ] No hardcoded secrets
- [ ] Rate limiting on public endpoints
- [ ] CSRF protection on state-changing endpoints
- [ ] Input length limits prevent DoS

---

## 13. Полный список запрещённых практик

| Категория | Запрещено | Почему | Замена |
|-----------|-----------|--------|--------|
| **OOP** | `class` (кроме Error) | FP-first | Factory functions |
| **Types** | `any` | Type safety | `unknown` + type guard |
| **Types** | `as` (assertion) | Обходит checker | Type narrowing |
| **Types** | `// @ts-ignore` | Скрывает ошибки | Fix the type |
| **V8 Deopt** | `for...in` | Деоптимизация | `Object.keys()` + `for...of` |
| **V8 Deopt** | `delete obj.prop` | Ломает hidden class | Spread без поля / `= undefined` |
| **V8 Deopt** | Mixins на прототипах | Полиморфизм shape | Composition |
| **V8 Deopt** | Holey arrays `[1,,3]` | Slow path | Заполненные массивы |
| **V8 Deopt** | Multi-type arrays | Нет type specialization | Typed arrays / отдельные |
| **Coercion** | `+'5'`, `*1`, `-0`, `/1`, `` `${n}` `` | Неявное преобразование | `Number()`, `String()`, `parseInt()` |
| **Equality** | `==`, `!=` | Implicit coercion | `===`, `!==` |
| **Variables** | `var` | Hoisting, scope leak | `const`, `let` |
| **Variables** | Chained assignments `a=b=c=0` | Side effects | Отдельные объявления |
| **Functions** | `bind`, `call`, `apply` | Сложность, контекст | Arrow functions, spread |
| **Iteration** | `forEach` с мутацией outer scope | Side effects | `map`, `filter`, `reduce` |
| **Returns** | Array destructuring returns | Позиционная зависимость | Return object |
| **Returns** | Inconsistent return types | Непредсказуемый контракт | Единая структура |
| **Structure** | Code duplication | DRY нарушение | Extract function |
| **Structure** | Mixed responsibility | SRP нарушение | Split into functions |
| **Structure** | Nested `if` > 2 levels | Cognitive complexity | Early returns |
| **Structure** | Files > 300 lines | Complexity | Split modules |
| **Async** | Middleware pattern | Hidden deps, implicit flow | Явные вызовы в handler |
| **Async** | RxJS | Overkill for our use case | EventEmitter + async/await |
| **Async** | `function*/yield` as async | Устаревший паттерн | async/await |
| **Async** | Deferred pattern | Антипаттерн | Нормальная Promise structure |
| **Async** | Async.js, Metasync libs | Legacy | Нативные async/await |
| **Async** | Swallowed errors `catch {}` | Скрытые ошибки | Log + rethrow |
| **Async** | Callback hell | Readability | async/await |
| **Logging** | `console.log` в production | No structure | Structured logger |
| **Strings** | Hardcoded magic strings/numbers | Maintainability | Constants/enums |
| **Logic** | Business logic в controllers | Onion violation | Application layer |
| **Sandbox** | `require()`/`import` в VM | Sandbox bypass | Injected context |
| **Security** | `eval()`, `Function()` | Code injection | Нет замены — не делай |
| **Security** | `dangerouslySetInnerHTML` | XSS vector | Sanitized content |
| **Security** | String concat в SQL | SQL injection | Parameterized queries |
| **Security** | Hardcoded credentials | Security leak | Environment variables |

---

## 14. Linting & Formatting

### ESLint Config

```json
{
  "extends": ["eslint:recommended"],
  "rules": {
    "no-var": "error",
    "prefer-const": "error",
    "no-unused-vars": "error",
    "no-console": "warn",
    "eqeqeq": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-delete-var": "error",
    "no-implicit-coercion": "error",
    "no-multi-assign": "error",
    "no-restricted-syntax": ["error",
      { "selector": "ForInStatement", "message": "Use Object.keys() + for...of" }
    ]
  }
}
```

### Prettier Config

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

### CI Enforcement

```yaml
# .github/workflows/ci.yml — уже настроен
- npm run lint          # ESLint (включая deopt rules)
- npm run type-check    # TypeScript strict
- npm run test          # Vitest
- npm audit             # Known vulnerabilities
```

---

✅ **APPROVED:** Product Owner утвердил документ 2026-02-07. Marcus проверяет соблюдение при code review.

**Последнее обновление:** 2026-02-07
**Следующий документ:** PRODUCT-BACKLOG.md (ЭТАП 6) ⛔ Требует PO approval
