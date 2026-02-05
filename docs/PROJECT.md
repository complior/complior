# PROJECT.md — AI Act Compliance Platform

## Суть проекта
**Название:** AI Act Compliance Platform
**Описание:** Self-service SaaS платформа для EU SMB — подготовка AI-систем к EU AI Act
**Проблема:** Компании не могут самостоятельно определить уровень риска своих AI-систем и требования к compliance
**Решение:** Автоматизированный классификатор + step-by-step guidance + compliance checklist generator
**Аудитория:** B2B — CTO, compliance officers, legal teams в компаниях 10-250 сотрудников (DACH region)

## Текущая фаза
**Фаза:** Setup (Sprint 0)
**Цель:** Инициализация команды и инфраструктуры
**Дедлайн:** 2026-02-07
**Текущий спринт:** Sprint 000 (Setup)

## Ключевые решения
- **Стек:** Next.js 14 + TypeScript + Prisma + PostgreSQL
- **Deployment:** Docker → Hetzner Cloud (EU-only для production data)
- **AI Models (Dev Team):** OpenRouter unified API (Claude, GPT, Gemini, DeepSeek, Kimi)
- **AI Models (Product):** Mistral API (EU sovereign) + self-hosted OSS
- **Workflow:** Scrum с Approval Gates
- **Git:** GitHub, branch protection, Marcus review gate + PO merge gate

Подробности архитектуры → ARCHITECTURE.md, adr/*.md

## Ценностное предложение
1. **Для CTO:** Снижение legal risk, автоматизация compliance assessment
2. **Для Compliance Officers:** Пошаговые чеклисты, документация под ключ
3. **Для Legal Teams:** Mapping AI систем на AI Act requirements с обоснованиями

## Глоссарий проекта
- **High Risk AI System** — AI-система категории "высокий риск" по AI Act Annex III
- **Conformity Assessment** — процедура подтверждения соответствия (самооценка или notified body)
- **Risk Category** — Unacceptable / High / Limited / Minimal risk
- **Technical Documentation** — документация согласно AI Act Art. 11
- **FOSS Exception** — исключение для open-source AI компонентов

## Контакты и роли
**Founder (Product Owner):** Утверждает планы, Sprint Backlog, Sprint Review, мержит PRs
**Alex (Execution Master):** Scrum Board, Daily Scrum, Sprint Review, координация
**Marcus (Planning Master):** Архитектура, Sprint Planning (tech), Code Review

## Команда (11 агентов)
См. полное описание в AGENTS.md каждого workspace

---

**Последнее обновление:** 2026-02-04
**Версия:** 0.1.0 (Setup)
