# Existing Code — База для Фазы 0

Эта папка содержит существующий backend код, который Marcus будет анализировать перед созданием артефактов Фазы 0.

---

## 📁 Что положить сюда:

### 1. Backend код
Если у вас есть существующий backend — положите его сюда:
- `backend/` — весь backend код
- `src/` — исходники
- `prisma/schema.prisma` — существующая БД схема (если есть)
- `package.json` — зависимости
- `.eslintrc`, `tsconfig.json` — конфигурация

### 2. Фрагменты кода
Если полного проекта нет, но есть отдельные модули — положите их:
- `auth/` — модуль аутентификации
- `risk-classifier/` — модуль классификации рисков
- `database/` — схема БД
- и т.д.

### 3. Документация существующего кода
Если есть документация к существующему коду:
- `ARCHITECTURE.old.md` — старая архитектура
- `API-SPEC.md` — API спецификация
- `DATABASE.old.md` — схема БД

---

## 🎯 Что Marcus будет анализировать:

Перед созданием артефактов Фазы 0, Marcus:

1. **Изучит архитектуру** существующего кода:
   - Какие паттерны используются? (MVC? Service layer? Repository?)
   - Как организованы модули?
   - Какие зависимости между модулями?

2. **Проанализирует code style**:
   - Functional programming vs OOP?
   - TypeScript strict mode?
   - Naming conventions?

3. **Изучит БД схему** (если есть):
   - Существующие таблицы
   - Связи между таблицами
   - Indexes, constraints

4. **Определит что переиспользовать**:
   - Какой код можно оставить как есть?
   - Что нужно рефакторить под DDD/Onion?
   - Что нужно переписать с нуля?

5. **Построит Migration Plan**:
   - Как перейти от существующей архитектуры к новой?
   - Какие шаги миграции?
   - Какие риски?

---

## 📝 Инструкция: Как положить код сюда

### Вариант A: Копирование через терминал

```bash
# Если у вас есть backend в другой папке:
cp -r /path/to/your/backend/* /home/openclaw/PROJECT/existing-code/

# Или если это zip/tar:
unzip your-backend.zip -d /home/openclaw/PROJECT/existing-code/
```

### Вариант B: Копирование через Claude Code

Скажите мне:
```
Скопируй код из /path/to/backend в existing-code
```

### Вариант C: Вставка фрагментов кода

Если у вас нет полного проекта, но есть отдельные файлы:
```
Создай файл existing-code/auth-service.ts с таким кодом:
[ваш код]
```

---

## ⚠️ Важно:

- **Не кладите сюда секреты** (.env файлы с API keys, пароли, токены)
- **Не кладите node_modules** (только package.json)
- **Не кладите .git** (только код)

---

## ✅ После добавления кода:

Сообщите Marcus что код готов к анализу:

```
@markusCTO_bot

Существующий backend код добавлен в /home/openclaw/PROJECT/existing-code/

Содержимое:
- [перечислите что положили]

Пожалуйста, проанализируй код перед созданием артефактов Фазы 0.
```

---

## 🚫 Если существующего кода НЕТ:

Если у вас нет существующего кода и вы начинаете с нуля:

1. Создайте файл `/home/openclaw/PROJECT/existing-code/NO-EXISTING-CODE.md`:
   ```markdown
   # No Existing Code

   Проект начинается с нуля. Marcus создаст архитектуру без анализа существующего кода.
   ```

2. Сообщите Marcus:
   ```
   @markusCTO_bot Существующего кода нет, создаём архитектуру с нуля.
   ```

---

## 📦 Загруженный Backend Код

### ✅ Статус: Backend код добавлен (2026-02-05)

Загружены два репозитория с GitHub:

#### 1. **NodeJS-Fastify** — Сервер-контейнер
- **Путь:** `/home/openclaw/PROJECT/existing-code/NodeJS-Fastify/`
- **GitHub:** https://github.com/metatech-university/NodeJS-Fastify.git
- **Назначение:** Fastify HTTP/WS сервер с VM-based loader для загрузки приложения

**Ключевые компоненты:**
- `main.js` — точка входа, создаёт Fastify сервер и загружает Application
- `src/loader.js` — загружает Application в изолированный VM sandbox
- `src/http.js` — HTTP routing
- `src/ws.js` — WebSocket handling
- `src/logger.js` — логирование

**Архитектурный подход:**
- Сервер НЕ зависит от приложения (framework-agnostic)
- Использует `vm.Script` для изоляции модулей Application
- Создаёт sandbox с `config`, `db`, `api` для Application
- Загружает Application из соседней папки `../NodeJS-Application`

#### 2. **NodeJS-Application** — Framework-agnostic приложение
- **Путь:** `/home/openclaw/PROJECT/existing-code/NodeJS-Application/`
- **GitHub:** https://github.com/metatech-university/NodeJS-Application.git
- **Назначение:** Изолированное приложение (ничего не знает о Fastify)

**Структура (слоеная архитектура):**
```
api/                 # API endpoints (auth, messenger)
domain/              # Domain logic (chat, start)
schemas/             # Data schemas (Account, Chat, Message, etc.)
db/                  # Database structure (install.sql, structure.sql, data.sql)
config/              # Configuration (database, server, sessions, log, scale)
lib/                 # Shared libraries
static/              # Frontend static files
tasks/               # Background tasks
bus/                 # Message bus
resources/           # Static resources
```

**Ключевые файлы:**
- `schemas/*.js` — типизированные схемы данных (Account, Chat, Message, Session, etc.)
- `db/structure.sql` — структура БД (PostgreSQL)
- `config/*.js` — конфигурация различных слоёв
- `api/*/*.js` — API endpoints загружаемые в sandbox
- `domain/*/*.js` — domain логика

**Архитектурный подход:**
- **Framework-agnostic** — приложение не зависит от сервера (Fastify)
- **VM Isolation** — модули загружаются в изолированный sandbox через `vm.Script`
- **Layered Architecture** — чёткое разделение на слои (api → domain → schemas → db)
- **Dependency Injection** — sandbox предоставляет `config`, `db`, `common` всем модулям
- **Pure Functions** — модули не имеют сайд-эффектов, работают через sandbox

---

## 🔍 Что Marcus ОБЯЗАТЕЛЬНО должен проанализировать:

### 1. **VM-based Isolation Pattern**
- Как `loader.js` использует `vm.Script` для изоляции
- Sandbox pattern: как `config`, `db`, `api` инжектируются в модули
- Как обеспечивается безопасность и изоляция между модулями

### 2. **Framework-Agnostic Architecture**
- Разделение Server (Fastify) и Application (business logic)
- Как Application не зависит от HTTP framework
- Как можно заменить Fastify на другой фреймворк без изменения Application

### 3. **Layered Architecture (существующие слои):**
```
┌─────────────────────────────┐
│  Server (NodeJS-Fastify)    │  ← HTTP/WS транспорт
├─────────────────────────────┤
│  API (api/)                 │  ← API endpoints
├─────────────────────────────┤
│  Domain (domain/)           │  ← Business logic
├─────────────────────────────┤
│  Schemas (schemas/)         │  ← Data models
├─────────────────────────────┤
│  Database (db/)             │  ← Persistence
└─────────────────────────────┘
```

### 4. **Database Schema Analysis**
- Прочитать `db/structure.sql` — какие таблицы, связи, индексы
- Изучить `schemas/*.js` — типизированные модели (Account, Chat, Message, Session, etc.)
- Понять naming conventions, constraints

### 5. **Code Style & Conventions**
- **'use strict'** — strict mode везде
- **Functional style** — pure functions, no classes
- **Module exports** — CommonJS (не ESM)
- **Error handling** — как обрабатываются ошибки
- **Naming conventions** — camelCase, PascalCase для схем

### 6. **Configuration Management**
- Как работает `config/` слой
- Как конфигурация инжектируется через sandbox
- Разделение на `database.js`, `server.js`, `sessions.js`, `log.js`, `scale.js`

### 7. **API Design Patterns**
- Как организованы endpoints в `api/auth/` и `api/messenger/`
- Routing strategy
- Request/response handling

### 8. **Что переиспользовать в новом проекте (AI Act Compliance Platform)?**
- **VM-based isolation** — можно ли применить?
- **Framework-agnostic approach** — нужен ли для AI Act Platform?
- **Layered structure** — как адаптировать под DDD/Onion?
- **Schemas pattern** — использовать ли такой же подход к data models?
- **Database design** — какие best practices взять?

### 9. **Migration Plan**
- Что оставить как есть?
- Что рефакторить под DDD/Onion?
- Что переписать с нуля для AI Act Compliance?
- Как интегрировать с Next.js (если используем Next.js API routes)?
- Как совместить с Prisma ORM?

---

**Статус:** ✅ Backend код добавлен и готов к анализу Marcus
