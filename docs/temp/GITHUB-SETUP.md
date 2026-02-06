# GitHub Setup — AI Act Compliance Platform

**Репозиторий:** https://github.com/a3ka/ai-act-compliance-platform
**Дата настройки:** 2026-02-05
**Статус:** ✅ Подключен, код запушен | ⏳ Branch protection нужно настроить

---

## ✅ Что уже настроено:

1. **GitHub репозиторий создан:** `a3ka/ai-act-compliance-platform`
2. **Git remote настроен:** `git@github.com:a3ka/ai-act-compliance-platform.git`
3. **Ветки запушены:**
   - ✅ `main` — initial commit (144b471)
   - ✅ `develop` — с backend кодом (c023b0e)
4. **SSH доступ работает** — код успешно загружен

---

## ⏳ Что ОБЯЗАТЕЛЬНО нужно настроить:

### 1. Branch Protection Rules (КРИТИЧНО!)

Без защиты веток боты смогут мержить код напрямую, минуя review!

#### Защита `main` ветки:

**Перейдите на:** https://github.com/a3ka/ai-act-compliance-platform/settings/branches

**Нажмите:** "Add branch protection rule"

**Branch name pattern:** `main`

**Настройки:**
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **1** (Marcus)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (опционально, если создадите CODEOWNERS файл)

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - (После настройки CI/CD добавите конкретные checks: tests, lint, build)

- ✅ **Require conversation resolution before merging**

- ✅ **Require signed commits** (рекомендуется для production)

- ✅ **Include administrators**
  - **ВАЖНО:** Даже вы (владелец) не сможете push напрямую без PR
  - Это обеспечивает audit trail для всех изменений

- ✅ **Restrict who can push to matching branches**
  - Добавьте только: **Product Owner** (вы)
  - Боты НЕ должны иметь прямой push доступ к main

- ✅ **Allow force pushes: NO**
- ✅ **Allow deletions: NO**

**Нажмите:** "Create" или "Save changes"

---

#### Защита `develop` ветки:

**Branch name pattern:** `develop`

**Настройки:**
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **1** (Marcus)
  - ✅ Dismiss stale pull request approvals when new commits are pushed

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging

- ✅ **Require conversation resolution before merging**

- ✅ **Include administrators** (рекомендуется)

- ✅ **Restrict who can push to matching branches**
  - Только: **Product Owner** (вы)

- ✅ **Allow force pushes: NO**
- ✅ **Allow deletions: NO**

**Нажмите:** "Create"

---

### 2. Настроить gh CLI аутентификацию (для ботов)

Боты будут использовать `gh` CLI для создания PR и review.

**Команда:**
```bash
gh auth login
```

**Выберите:**
1. **GitHub.com**
2. **SSH**
3. **Login with a web browser** (или **Paste an authentication token**)

**После успешной аутентификации:**
```bash
gh auth status
```

Должно показать:
```
✓ Logged in to github.com as a3ka
✓ Git operations for github.com configured to use ssh protocol.
✓ Token: *******************
```

---

### 3. Создать Personal Access Token для ботов (опционально)

Если нужен программный доступ для ботов (не через ваш аккаунт):

**Перейдите на:** https://github.com/settings/tokens

**Нажмите:** "Generate new token" → "Generate new token (classic)"

**Настройки:**
- **Note:** "OpenClaw Bots - AI Act Platform"
- **Expiration:** Custom → 90 days (или No expiration для dev)
- **Scopes:**
  - ✅ `repo` (Full control of private repositories)
  - ✅ `workflow` (Update GitHub Action workflows)
  - ✅ `write:packages` (если будете использовать GitHub Packages)
  - ✅ `read:org` (если репозиторий в организации)

**Скопируйте токен** и сохраните в безопасное место!

**Настройте для gh CLI:**
```bash
export GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxx
echo 'export GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxx' >> ~/.bashrc
```

---

### 4. Настроить default branch (опционально)

**По умолчанию:** `main` — для production releases
**Рекомендация:** Сделать `develop` default branch для PR

**Перейдите на:** https://github.com/a3ka/ai-act-compliance-platform/settings

**Секция "Default branch":**
- Измените с `main` на `develop`
- Это упростит создание PR (по умолчанию будут идти в develop)

---

### 5. Включить GitHub Actions (для CI/CD)

**Перейдите на:** https://github.com/a3ka/ai-act-compliance-platform/settings/actions

**Настройки:**
- ✅ **Allow all actions and reusable workflows**
- ✅ **Allow GitHub Actions to create and approve pull requests** (опционально)

Derek (DevOps) настроит CI/CD pipelines в `.github/workflows/`.

---

## 🔄 Git Workflow для ботов:

### Для Backend/Frontend разработчиков (Max, Nina):

```bash
# 1. Получить задачу (например, US-001: Implement Auth API)
# 2. Создать feature branch
git checkout develop
git pull origin develop
git checkout -b feature/max-US-001-auth

# 3. Работать над задачей
git add .
git commit -m "feat(auth): implement JWT authentication"

# 4. Push и создать PR
git push origin feature/max-US-001-auth
gh pr create --base develop --head feature/max-US-001-auth \
  --title "US-001: JWT Authentication" \
  --body "Implements JWT auth with refresh tokens. Closes US-001."

# 5. Упомянуть Marcus для review
# В PR или в Telegram: @markusCTO_bot PR #1 ready for review
```

### Для Marcus (CTO):

```bash
# 1. Получить уведомление о PR (через GitHub или Telegram)
# 2. Просмотреть PR
gh pr view 1
gh pr diff 1

# 3. Code review
## APPROVE:
gh pr review 1 --approve --body "LGTM! Clean code, tests pass ✅"

## REQUEST CHANGES:
gh pr review 1 --request-changes --body "
- Add error handling for invalid tokens
- Missing unit tests for refresh token flow
- TypeScript: use strict null checks
"

# 4. После approve → тегнуть Leo для security audit
# @leo_developer_bot PR #1 security audit

# 5. После Leo approval → уведомить PO
# @founder PR #1 ready to merge ✅ (code + security passed)
```

### Для Product Owner (вы):

```bash
# После Marcus + Leo approval:
gh pr merge 1 --squash --delete-branch

# Или через GitHub UI: кнопка "Squash and merge"
```

---

## 📊 Структура веток в проекте:

```
main (protected, only PO merges)
  │
  └─ develop (protected, only PO merges after Marcus + Leo)
      │
      ├─ feature/max-US-001-auth         ← Max
      ├─ feature/nina-US-002-dashboard   ← Nina
      ├─ feature/kai-US-003-wireframes   ← Kai
      ├─ feature/derek-US-004-ci-cd      ← Derek
      ├─ feature/ava-US-005-research     ← Ava (опционально, через KB)
      └─ feature/diana-US-006-docs       ← Diana (опционально, через KB)
```

**Правила именования:**
- `feature/[agent]-[task-id]-[short-description]`
- Примеры:
  - `feature/max-US-001-auth`
  - `feature/nina-US-002-dashboard`
  - `feature/derek-CI-001-github-actions`

---

## 🤖 Какие боты работают с Git напрямую:

| Бот | Работает с Git? | Branch pattern | Создаёт PR? |
|-----|-----------------|----------------|-------------|
| **Alex** (Orchestrator) | ❌ Нет | — | Нет (координирует через Telegram) |
| **Marcus** (CTO) | ✅ **Да** (Phase 0) | `feature/marcus-phase0-*` | Нет (коммитит в develop) |
| **Max** (Backend) | ✅ **Да** | `feature/max-*` | ✅ Да |
| **Nina** (Frontend) | ✅ **Да** | `feature/nina-*` | ✅ Да |
| **Kai** (UX) | ⚠️ Опционально | `feature/kai-*` | ⚠️ Если коммитит дизайн-токены |
| **Ava** (Research) | ❌ Нет | — | Нет (через KB) |
| **Leo** (SecOps) | ❌ Нет | — | Нет (review через `gh pr review`) |
| **Quinn** (QA) | ⚠️ Опционально | `feature/quinn-*` | ⚠️ Если коммитит E2E тесты |
| **Elena** (Legal) | ❌ Нет | — | Нет (через KB) |
| **Diana** (Docs) | ⚠️ Опционально | `feature/diana-*` | ⚠️ Если пишет в `/docs` |
| **Derek** (DevOps) | ✅ **Да** | `feature/derek-*` | ✅ Да (CI/CD, infrastructure) |

---

## 🔐 Security Best Practices:

1. **Никогда не коммитьте:**
   - `.env` файлы с секретами
   - API keys, tokens, passwords
   - SSH private keys
   - `node_modules/` (используйте .gitignore)

2. **Используйте GitHub Secrets** для CI/CD:
   - Settings → Secrets and variables → Actions → New repository secret

3. **Signed commits** (рекомендуется):
   ```bash
   git config --global commit.gpgsign true
   git config --global user.signingkey YOUR_GPG_KEY
   ```

4. **Pre-commit hooks** (Leo настроит):
   - Проверка на секреты (git-secrets, truffleHog)
   - Lint, format, tests

---

## ✅ Checklist перед началом работы:

- [ ] Branch protection настроен для `main`
- [ ] Branch protection настроен для `develop`
- [ ] gh CLI аутентифицирован
- [ ] Default branch установлен в `develop`
- [ ] GitHub Actions включены
- [ ] Все боты знают naming convention для веток
- [ ] Marcus знает свою роль review gate
- [ ] Product Owner знает что только он мержит в develop/main

---

## 📝 Документация:

После настройки Marcus создаст детальный Git Workflow в:
- `/home/openclaw/PROJECT/docs/CODING-STANDARDS.md` (секция Git Workflow)
- `/home/openclaw/PROJECT/adr/ADR-003-git-workflow.md` (архитектурное решение)

---

**Последнее обновление:** 2026-02-05
**Статус:** ✅ Remote настроен | ⏳ Branch protection требуется
