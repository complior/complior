# Git SSH vs gh CLI Authentication

## Вопрос: Зачем `gh auth login` если SSH ключ уже работает?

**Короткий ответ:** Git SSH и gh CLI — это **разные протоколы**, для разных целей.

---

## 🔑 Git SSH (уже работает у вас)

**Для чего:** Git операции
```bash
git clone git@github.com:user/repo.git
git push origin main
git pull origin develop
git fetch
```

**Протокол:** SSH (порт 22)
**Аутентификация:** SSH ключ (~/.ssh/id_rsa, ~/.ssh/id_ed25519)
**API:** Git protocol (не GitHub REST API)

✅ **У вас работает!** Мы успешно делали `git push origin develop`

---

## 🚀 gh CLI Authentication (нужна отдельная аутентификация)

**Для чего:** Работа с GitHub API
```bash
gh pr create           # Создать Pull Request
gh pr view 123         # Посмотреть PR
gh pr review 123 --approve    # Approve PR
gh pr merge 123        # Мержить PR
gh issue create        # Создать issue
gh repo view           # Инфо о репозитории
gh release create      # Создать release
```

**Протокол:** HTTPS + GitHub REST/GraphQL API
**Аутентификация:** OAuth token (НЕ SSH ключ напрямую)
**API:** GitHub REST API / GraphQL

❌ **Пока не настроено** (нужен `gh auth login`)

---

## 🤔 Почему gh CLI не использует SSH ключ автоматически?

**Техническая причина:**
- Git SSH работает через Git protocol (низкоуровневый протокол для работы с репозиториями)
- gh CLI работает через GitHub REST API (высокоуровневый HTTP API для управления PR, issues, etc.)
- Это разные протоколы, требующие разной аутентификации

**Аналогия:**
- SSH ключ = ключ от квартиры (можешь зайти в квартиру и взять вещи)
- gh CLI токен = доверенность (можешь от имени владельца создавать документы, подписывать контракты)

---

## ✅ Решение: gh auth login с SSH протоколом

**Хорошая новость:** gh CLI **МОЖЕТ** использовать ваш SSH ключ!

При `gh auth login` можно выбрать **SSH protocol**, и тогда:
1. gh CLI создаст OAuth токен
2. НО будет использовать SSH для коммуникации с GitHub API
3. Ваш существующий SSH ключ будет использован

**Команда:**
```bash
gh auth login
```

**Выбрать:**
1. **GitHub.com**
2. **SSH** ← Важно! Выберите SSH
3. **Login with a web browser**

После этого gh CLI будет использовать ваш SSH ключ для API запросов.

---

## 🤖 Зачем это нужно ботам?

### Marcus (CTO) будет использовать:
```bash
# Просмотр PR
gh pr view 123 --json title,body,additions,deletions
gh pr diff 123

# Code review
gh pr review 123 --approve --body "LGTM! ✅"
gh pr review 123 --request-changes --body "Needs refactoring"
```

### Max/Nina (Developers) будут использовать:
```bash
# Создание PR после работы над feature веткой
git push origin feature/max-US-001-auth
gh pr create --base develop --title "US-001: JWT Auth" --body "..."
```

### Product Owner (вы) будете использовать:
```bash
# Мердж PR после approve от Marcus + Leo
gh pr merge 123 --squash --delete-branch
```

**Все эти команды требуют gh CLI аутентификацию!**

---

## 📊 Сравнительная таблица

| Операция | Требует Git SSH | Требует gh CLI |
|----------|----------------|----------------|
| `git push` | ✅ | ❌ |
| `git pull` | ✅ | ❌ |
| `git clone` | ✅ | ❌ |
| `gh pr create` | ❌ | ✅ |
| `gh pr review` | ❌ | ✅ |
| `gh pr merge` | ❌ | ✅ |
| `gh issue create` | ❌ | ✅ |
| `gh repo view` | ❌ | ✅ |

---

## 🔧 Как проверить статус:

### Git SSH (уже работает):
```bash
ssh -T git@github.com
# Ожидается: Hi a3ka! You've successfully authenticated
```
✅ **У вас работает!**

### gh CLI (нужно настроить):
```bash
gh auth status
# Сейчас: You are not logged into any GitHub hosts
# После gh auth login: ✓ Logged in to github.com as a3ka
```

---

## 🎯 Итого:

**Вопрос:** Зачем `gh auth login`?
**Ответ:** Git SSH работает для `git push/pull`, но боты будут использовать `gh pr create/review/merge` для работы с Pull Requests, а это требует отдельной аутентификации через GitHub API.

**Решение:**
```bash
gh auth login
# Выберите: GitHub.com → SSH → Login with browser
```

После этого gh CLI будет использовать ваш существующий SSH ключ для API запросов.

---

**Последнее обновление:** 2026-02-05
