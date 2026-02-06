# Ручная настройка GitHub — Задачи для Product Owner

**Репозиторий:** https://github.com/a3ka/ai-act-compliance-platform
**Дата:** 2026-02-05
**Статус:** ⚠️ Требуется ручная настройка

---

## ✅ Что уже сделано автоматически:

- ✅ GitHub репозиторий подключен
- ✅ Код загружен (main и develop ветки)
- ✅ `.github/CODEOWNERS` создан
- ✅ `.github/workflows/ci.yml` создан (CI pipeline)
- ✅ `.github/workflows/deploy.yml` создан (deployment)
- ✅ `.gitignore` обновлён (security-first)
- ✅ `.husky/pre-commit` создан (git hooks)
- ✅ `.husky/commit-msg` создан (conventional commits)
- ✅ `.lintstagedrc.js` создан

---

## ⚠️ Что нужно сделать ВРУЧНУЮ (требует веб-интерфейс или gh CLI auth):

### 1. 🔐 Аутентификация gh CLI (КРИТИЧНО для ботов)

**Команда:**
```bash
gh auth login
```

**Выберите:**
1. GitHub.com
2. SSH
3. Login with a web browser

**Откроется браузер → авторизуйтесь → вернитесь в терминал**

**Проверка:**
```bash
gh auth status
```

Должно показать:
```
✓ Logged in to github.com as a3ka
```

**Зачем:** Без этого боты не смогут создавать PR и делать review через `gh` CLI.

---

### 2. 🛡️ Branch Protection для `main` ветки (КРИТИЧНО!)

**Перейдите на:**
https://github.com/a3ka/ai-act-compliance-platform/settings/branches

**Нажмите:** "Add branch protection rule"

**Branch name pattern:** `main`

**Настройки (включите ВСЕ галочки):**

#### Protect matching branches
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **1**
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Добавьте checks (появятся после первого CI run):
    - `lint`
    - `typecheck`
    - `test`
    - `build`
    - `security`

- ✅ **Require conversation resolution before merging**

- ✅ **Require signed commits** (рекомендуется)

- ✅ **Require linear history**

- ✅ **Include administrators**
  - **ВАЖНО:** Даже вы не сможете push напрямую без PR
  - Это обеспечивает полный audit trail

- ✅ **Restrict who can push to matching branches**
  - Добавьте: **a3ka** (только вы)

- ✅ **Allow force pushes:** ❌ **НЕТ!**
- ✅ **Allow deletions:** ❌ **НЕТ!**

**Нажмите:** "Create" внизу страницы

---

### 3. 🛡️ Branch Protection для `develop` ветки

**Повторите те же шаги для `develop`:**

**Branch name pattern:** `develop`

**Настройки (те же что для main):**
- ✅ Require a pull request before merging (1 approval)
- ✅ Require status checks to pass before merging
- ✅ Require conversation resolution before merging
- ✅ Include administrators
- ✅ Restrict who can push: только **a3ka**
- ✅ Allow force pushes: **НЕТ**
- ✅ Allow deletions: **НЕТ**

**Нажмите:** "Create"

---

### 4. 📌 Установить default branch на `develop` (опционально)

**Перейдите на:**
https://github.com/a3ka/ai-act-compliance-platform/settings

**Секция "Default branch":**
- Измените с `main` на `develop`
- Подтвердите изменение

**Зачем:** PR по умолчанию будут создаваться в `develop`, а не в `main`.

---

### 5. 🚀 Включить GitHub Actions

**Перейдите на:**
https://github.com/a3ka/ai-act-compliance-platform/settings/actions

**General:**
- ✅ Allow all actions and reusable workflows

**Workflow permissions:**
- ✅ Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests

**Нажмите:** "Save"

---

### 6. 🔑 Добавить GitHub Secrets для CI/CD

**Перейдите на:**
https://github.com/a3ka/ai-act-compliance-platform/settings/secrets/actions

**Нажмите:** "New repository secret"

**Добавьте следующие секреты:**

#### Для CI (тесты):
| Name | Value | Description |
|------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | Test database URL |
| `SNYK_TOKEN` | `...` | Snyk security scan token (snyk.io) |

#### Для Deployment (потом, когда настроите Hetzner):
| Name | Value | Description |
|------|-------|-------------|
| `DOCKER_USERNAME` | `...` | Docker Hub username |
| `DOCKER_PASSWORD` | `...` | Docker Hub password/token |
| `HETZNER_HOST` | `...` | Hetzner server IP |
| `HETZNER_USER` | `...` | SSH user |
| `HETZNER_SSH_KEY` | `...` | SSH private key |
| `APP_URL` | `https://...` | Production URL |

**Как добавить:**
1. Введите "Name"
2. Вставьте "Secret" (будет зашифрован)
3. Нажмите "Add secret"

---

### 7. 📝 Обновить CODEOWNERS (когда боты получат GitHub аккаунты)

**Файл:** `.github/CODEOWNERS`

**Сейчас:** Все review идут на `@a3ka`

**Когда у ботов будут аккаунты:**
- Создайте GitHub bot accounts (опционально)
- Обновите CODEOWNERS:
  ```
  * @markusCTO_bot
  /src/backend/ @max_backend_bot
  /src/frontend/ @nina_frontend_bot
  ```

---

### 8. 🔧 Настроить Git Hooks локально (для ботов)

**После того как боты начнут работать с кодом:**

```bash
cd /home/openclaw/PROJECT

# Установить husky
npm install --save-dev husky lint-staged

# Инициализировать husky
npx husky install

# Активировать git hooks
git config core.hooksPath .husky
```

**Проверка:**
```bash
# Попробуйте сделать commit без Conventional Commits формата
git commit -m "test"
# Должна быть ошибка валидации
```

---

## 🧪 Проверка настройки:

### Тест 1: Branch Protection

```bash
# Попробуйте push напрямую в main (должно быть запрещено)
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test: direct push"
git push origin main
# Ожидается: ❌ Error: protected branch
```

### Тест 2: gh CLI

```bash
# Проверьте gh CLI доступ
gh repo view a3ka/ai-act-compliance-platform

# Должно показать информацию о репозитории
```

### Тест 3: CI/CD Workflow

```bash
# Создайте тестовый PR
git checkout develop
git checkout -b test/ci-check
echo "test" >> test.txt
git add test.txt
git commit -m "test: check CI workflow"
git push origin test/ci-check
gh pr create --base develop --title "Test CI"

# Перейдите на GitHub → Actions
# Должен запуститься CI workflow
```

---

## 📊 Checklist выполнения:

- [ ] `gh auth login` выполнен успешно
- [ ] Branch protection настроен для `main`
- [ ] Branch protection настроен для `develop`
- [ ] Default branch установлен в `develop`
- [ ] GitHub Actions включены
- [ ] GitHub Secrets добавлены (хотя бы DATABASE_URL для тестов)
- [ ] Git hooks активированы локально
- [ ] Тест 1 (Branch Protection) пройден
- [ ] Тест 2 (gh CLI) пройден
- [ ] Тест 3 (CI workflow) пройден

---

## 🚨 Что может пойти не так:

### Проблема 1: gh CLI не работает
**Симптом:** `gh: command not found`
**Решение:**
```bash
# Ubuntu/Debian
sudo apt install gh

# macOS
brew install gh
```

### Проблема 2: Branch protection не работает
**Симптом:** Можете push напрямую в main
**Решение:**
- Проверьте что "Include administrators" включено
- Проверьте что вы добавлены в "Restrict who can push"

### Проблема 3: CI workflow не запускается
**Симптом:** Actions tab пустой
**Решение:**
- Включите GitHub Actions в Settings → Actions
- Сделайте хотя бы один commit в ветку с workflow файлом

### Проблема 4: Git hooks не работают
**Симптом:** Commit проходит без валидации
**Решение:**
```bash
# Проверьте что hooks исполняемые
chmod +x .husky/pre-commit .husky/commit-msg

# Проверьте core.hooksPath
git config core.hooksPath
# Должно быть: .husky
```

---

## 📚 Дополнительные ресурсы:

- **GitHub Branch Protection:** https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- **GitHub Actions:** https://docs.github.com/en/actions
- **gh CLI:** https://cli.github.com/manual/
- **Conventional Commits:** https://www.conventionalcommits.org/
- **Husky (Git Hooks):** https://typicode.github.io/husky/

---

## ✅ После выполнения всех задач:

**Сообщите мне:**
```
Выполнил все задачи из MANUAL-SETUP-REQUIRED.md:
- gh auth login ✅
- Branch protection (main) ✅
- Branch protection (develop) ✅
- Default branch → develop ✅
- GitHub Actions включены ✅
- Секреты добавлены ✅
- Все тесты прошли ✅

Готов к началу Phase 0.
```

**Затем:**
1. Заполните `PRODUCT-VISION.md`
2. Запустите Marcus на Phase 0

---

**Последнее обновление:** 2026-02-05
**Автор:** Claude Code (OpenClaw Dev Team)
