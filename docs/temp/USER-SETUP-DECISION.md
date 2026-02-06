# Настройка пользователей: root vs openclaw

## 🔍 Текущая ситуация:

```bash
# Я (Claude Code) работаю от:
whoami
# → root

# SSH ключи находятся:
ls ~/.ssh/
# → /root/.ssh/id_rsa (работает с GitHub)

# Git операции (git push) выполняются от:
# → root (успешно работает)

# Но процессы OpenClaw запускаются от:
ps aux | grep openclaw
# → su openclaw (от пользователя openclaw)

# У пользователя openclaw НЕТ SSH ключей:
ls /home/openclaw/.ssh/
# → directory not found
```

---

## ⚠️ Проблема:

**Несоответствие пользователей:**
- Claude Code (я) работает от **root**
- Git SSH работает с ключами **root** (/root/.ssh/)
- Но боты OpenClaw запускаются от **openclaw**

**Что это значит:**
- Если сделать `gh auth login` от **root** → боты (openclaw) не смогут использовать
- Если боты будут делать `gh pr create` → у них не будет доступа к токену

---

## 🎯 Решение: Два варианта

### Вариант A: Всё от root (БЫСТРО, но не лучшая практика)

**Что делать:**
```bash
# От root (текущий пользователь)
gh auth login
# → Выбрать: GitHub.com → SSH → Login with browser
```

**Плюсы:**
- ✅ Быстро (2 минуты)
- ✅ SSH ключи уже есть
- ✅ Git уже работает

**Минусы:**
- ⚠️ Работа от root не рекомендуется (security best practice)
- ⚠️ Если боты запускаются от openclaw - не смогут использовать gh CLI

**Когда выбрать:**
- Если все боты OpenClaw и Claude Code работают от root
- Если это dev environment (не production)

---

### Вариант B: Перенести на openclaw (ПРАВИЛЬНО, безопаснее)

**Что делать:**

#### 1. Скопировать SSH ключи в /home/openclaw/.ssh/
```bash
# От root
mkdir -p /home/openclaw/.ssh
cp /root/.ssh/id_rsa /home/openclaw/.ssh/
cp /root/.ssh/id_rsa.pub /home/openclaw/.ssh/
cp /root/.ssh/known_hosts /home/openclaw/.ssh/
chown -R openclaw:openclaw /home/openclaw/.ssh
chmod 700 /home/openclaw/.ssh
chmod 600 /home/openclaw/.ssh/id_rsa
chmod 644 /home/openclaw/.ssh/id_rsa.pub
```

#### 2. Настроить Git для openclaw
```bash
su - openclaw -c "git config --global user.name 'OpenClaw Dev Team'"
su - openclaw -c "git config --global user.email 'openclaw@aiact.local'"
```

#### 3. gh auth login от openclaw
```bash
su - openclaw -c "gh auth login"
# → GitHub.com → SSH → Login with browser
```

#### 4. Изменить владельца PROJECT репозитория
```bash
chown -R openclaw:openclaw /home/openclaw/PROJECT
```

#### 5. Проверка
```bash
su - openclaw -c "cd /home/openclaw/PROJECT && git status"
su - openclaw -c "gh auth status"
su - openclaw -c "ssh -T git@github.com"
```

**Плюсы:**
- ✅ Безопасно (не работаем от root)
- ✅ Боты OpenClaw смогут использовать gh CLI
- ✅ Правильная практика

**Минусы:**
- ⏱️ Требует дополнительной настройки (10 минут)

**Когда выбрать:**
- Если боты OpenClaw запускаются от пользователя openclaw
- Для production/staging environment
- Best practice

---

## 🤔 Как решить что выбрать?

**Вопрос:** От какого пользователя запускаются боты OpenClaw когда они работают с кодом?

**Проверка:**
```bash
# Запустите любого бота (например, Marcus) и попросите его выполнить:
# whoami
# pwd

# Или проверьте как запускается OpenClaw:
ps aux | grep openclaw
```

**Если ответ:**
- **root** → Выбирайте Вариант A (gh auth login от root)
- **openclaw** → Выбирайте Вариант B (перенести всё на openclaw)

---

## 💡 Моя рекомендация:

**Вариант B (openclaw)** потому что:
1. Процессы OpenClaw запускаются через `su openclaw`
2. Безопаснее не работать от root
3. Боты смогут использовать gh CLI напрямую
4. Соответствует best practices

**План действий:**
1. Я скопирую SSH ключи в /home/openclaw/.ssh/
2. Настрою владельца /home/openclaw/PROJECT
3. Вы сделаете `su - openclaw` и выполните `gh auth login`
4. Боты будут работать от openclaw с полным доступом к Git и gh CLI

---

## 🚀 Хотите чтобы я настроил Вариант B сейчас?

Скажите "да" и я:
1. Скопирую SSH ключи
2. Настрою владельца PROJECT
3. Настрою Git config для openclaw
4. Дам инструкцию для `gh auth login` от openclaw

После этого всё будет работать правильно и безопасно.

---

**Последнее обновление:** 2026-02-05
