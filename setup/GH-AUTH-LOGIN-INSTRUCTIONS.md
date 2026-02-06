# Инструкция: gh auth login от пользователя openclaw

## ✅ Подготовка завершена!

Я настроил всё что мог:
- ✅ SSH ключи скопированы в `/home/openclaw/.ssh/`
- ✅ Git config настроен (`EU AI Act Dev Team <openclaw@aiact.local>`)
- ✅ `/home/openclaw/PROJECT` принадлежит openclaw
- ✅ Git работает от openclaw (тестовый коммит успешен)

**Осталось только:** `gh auth login` от пользователя openclaw

---

## 🚀 Что вам нужно сделать (2 минуты):

### 1. Переключитесь на пользователя openclaw

**Из терминала root:**
```bash
su openclaw
# БЕЗ дефиса! (su openclaw, НЕ su - openclaw)
```

Должно переключиться **БЕЗ запроса пароля** (потому что вы root).

**Проверка:**
```bash
whoami
# Должно показать: openclaw
```

---

### 2. Выполните gh auth login

```bash
gh auth login
```

**Ответьте на вопросы:**

1. **What account do you want to log into?**
   → Выберите: **GitHub.com**

2. **What is your preferred protocol for Git operations?**
   → Выберите: **SSH** ← ВАЖНО!

3. **Upload your SSH public key to your GitHub account?**
   → Выберите: **/home/openclaw/.ssh/id_rsa.pub**

4. **How would you like to authenticate GitHub CLI?**
   → Выберите: **Login with a web browser**

5. **Откроется браузер:**
   - Скопируйте код (например: `XXXX-XXXX`)
   - Перейдите на https://github.com/login/device
   - Вставьте код
   - Нажмите "Authorize"
   - Вернитесь в терминал

**Должно показать:**
```
✓ Authentication complete.
✓ Logged in as a3ka
```

---

### 3. Проверьте что всё работает

```bash
gh auth status
```

**Ожидается:**
```
✓ Logged in to github.com as a3ka (oauth_token)
✓ Git operations for github.com configured to use ssh protocol.
✓ Token: *******************
```

**Проверьте gh CLI команды:**
```bash
gh repo view a3ka/ai-act-compliance-platform
```

Должно показать информацию о репозитории.

---

### 4. Вернитесь к root

```bash
exit
# Или Ctrl+D
```

---

## ✅ Готово!

После этого:
- ✅ Боты OpenClaw смогут использовать `gh pr create/review/merge`
- ✅ Git работает от openclaw
- ✅ SSH ключи работают
- ✅ Безопасно (не работаем от root)

---

## 🐛 Troubleshooting

### Проблема: "You are not logged into any GitHub hosts"

**Решение:**
```bash
# Проверьте что вы под openclaw
whoami
# Должно быть: openclaw

# Попробуйте снова
gh auth login
```

### Проблема: "Could not read from remote repository"

**Решение:**
```bash
# Проверьте SSH ключ
ssh -T git@github.com
# Должно быть: Hi a3ka! You've successfully authenticated
```

### Проблема: "Permission denied"

**Решение:**
```bash
# Проверьте права на .ssh
ls -la ~/.ssh/
# Должно быть:
# drwx------ (700)
# -rw------- id_rsa (600)
# -rw-r--r-- id_rsa.pub (644)

# Если неправильные права:
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

---

## 📚 Справка

**Где хранится токен gh CLI:**
- `~/.config/gh/hosts.yml`

**Как выйти из gh:**
```bash
gh auth logout
```

**Как проверить токен:**
```bash
gh auth status
```

**Документация:**
- https://cli.github.com/manual/gh_auth_login

---

**Последнее обновление:** 2026-02-06
**Готово к выполнению:** ✅ ДА

Удачи! После `gh auth login` вернитесь и сообщите "готово", мы продолжим настройку GitHub (branch protection).
