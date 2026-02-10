# GitHub Token Security — ВАЖНО!

**Дата:** 2026-02-06
**Статус:** ✅ Fine-grained token настроен

---

## ✅ Что настроено:

```bash
✓ Fine-grained Personal Access Token создан
✓ Доступ ТОЛЬКО к ai-act-compliance-platform
✓ Права: Contents (RW), Pull Requests (RW), Issues (RW)
✓ Токен добавлен в ~/.bashrc для openclaw
✓ gh CLI работает с токеном
✓ Git protocol: SSH
```

---

## 🔒 Безопасность токена:

### ✅ Где хранится:
- **Переменная окружения:** `GH_TOKEN` в `/home/openclaw/.bashrc`
- **Права доступа:** Только пользователь `openclaw` может читать
- **НЕ хранится в git:** `.bashrc` не коммитится

### ⚠️ Важно:

**1. Удалите токен из истории:**
- **История терминала:** Если вы вводили токен в терминале:
  ```bash
  history -c  # Очистить историю текущей сессии
  ```
- **История чата:** Удалите сообщение с токеном из чата с Claude

**2. Никогда не коммитьте токен:**
- ❌ НЕ добавляйте в `.env` файлы в git
- ❌ НЕ добавляйте в код
- ❌ НЕ добавляйте в GitHub Secrets (там уже есть токен)
- ✅ Используйте только через переменную окружения

**3. Проверьте .gitignore:**
```bash
# Уже добавлено в .gitignore:
.env
.env.*
*.key
secrets.*
tokens.*
```

---

## 🔑 Где посмотреть/управлять токеном:

**GitHub Settings:**
https://github.com/settings/tokens?type=beta

**Что можно сделать:**
- ✅ Посмотреть последнее использование
- ✅ Изменить права доступа
- ✅ Продлить срок действия
- ✅ Отозвать токен (если скомпрометирован)

---

## 🚨 Если токен скомпрометирован:

**Немедленно:**

1. **Отозвать токен:**
   - Перейдите: https://github.com/settings/tokens?type=beta
   - Найдите: "OpenClaw Bots - AI Act Platform"
   - Нажмите: "Revoke"

2. **Создать новый токен:**
   - Те же настройки (Repository access: ai-act-compliance-platform)
   - Те же права (Contents RW, PR RW, Issues RW)

3. **Обновить в системе:**
   ```bash
   su openclaw
   nano ~/.bashrc
   # Замените старый токен на новый в строке export GH_TOKEN=...
   source ~/.bashrc
   gh auth status  # Проверка
   ```

---

## 📊 Проверка безопасности:

```bash
# От пользователя openclaw
su openclaw

# 1. Проверить что токен работает
gh auth status

# 2. Проверить права доступа
gh api /user/repos --jq '.[].full_name'
# Должен показать только ai-act-compliance-platform

# 3. Проверить что токен НЕ в git
cd /home/openclaw/PROJECT
git grep -i "github_pat_"  # Должно быть пусто

# 4. Проверить права на .bashrc
ls -la ~/.bashrc
# Должно быть: -rw-r--r-- openclaw openclaw
```

---

## 🔄 Ротация токена (каждые 90 дней):

**Токен истекает:** [Дата истечения из GitHub Settings]

**За неделю до истечения:**

1. Создайте новый Fine-grained token (те же настройки)
2. Обновите в `~/.bashrc`
3. Отзовите старый токен

---

## 📝 Best Practices:

**✅ Делайте:**
- Используйте Fine-grained tokens (не Classic tokens)
- Ограничивайте доступ только к нужным репозиториям
- Устанавливайте срок действия (90 дней макс)
- Ротируйте токены регулярно
- Храните в переменных окружения

**❌ НЕ делайте:**
- НЕ используйте Classic tokens (полный доступ)
- НЕ делайте tokens без expiration
- НЕ коммитьте tokens в git
- НЕ делитесь tokens в чатах/email
- НЕ храните в plaintext файлах в git

---

## 🤖 Как боты используют токен:

```bash
# Бот автоматически читает GH_TOKEN из окружения
export GH_TOKEN=github_pat_...

# Команды работают автоматически
gh pr create --base develop --title "Feature"
gh pr review 123 --approve
gh pr merge 123 --squash
```

**Все операции выполняются от имени:** `a3ka` (ваш аккаунт)
**Доступ ограничен:** Только `ai-act-compliance-platform`

---

## 🔍 Аудит использования:

**Где смотреть:**
- GitHub: Settings → Tokens → Last used
- GitHub: Repository → Settings → Audit log

**Что проверять:**
- Когда токен последний раз использовался
- Какие операции выполнялись
- Подозрительная активность

---

## 📚 Ссылки:

- **Fine-grained tokens docs:** https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token
- **Token security best practices:** https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation
- **GitHub CLI authentication:** https://cli.github.com/manual/gh_auth_login

---

**Последнее обновление:** 2026-02-06
**Токен настроен:** ✅ Безопасно (Fine-grained, ограниченный доступ)
