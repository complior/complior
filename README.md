# AI Act Compliance Platform

SaaS платформа для автоматизированной классификации AI-систем по рискам в соответствии с EU AI Act.

## Описание

Self-service платформа для EU SMB (малого и среднего бизнеса) для подготовки AI-систем к требованиям EU AI Act:
- Автоматизированная классификация уровней риска AI-систем
- Step-by-step guidance по compliance
- Генератор compliance checklist
- Техническая документация под ключ

## Целевая аудитория

B2B — CTO, compliance officers, legal teams в компаниях 10-250 сотрудников (DACH region)

## Технологический стек

- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Backend**: Next.js API routes / FastAPI
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + OAuth2 (Google, Microsoft)
- **Deployment**: Docker + Kubernetes
- **Architecture**: DDD / Onion Architecture

## Структура проекта

```
PROJECT/
├── docs/              # Документация проекта
│   ├── PROJECT.md     # Паспорт проекта
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── CODING-STANDARDS.md
│   └── ...
├── adr/               # Architecture Decision Records
├── api/               # API контракты и спецификации
├── daily-scrum/       # Daily Scrum отчёты
├── sprints/           # Архив спринтов
├── src/               # Исходный код проекта
└── tests/             # Тесты
```

## Команда разработки

Проект разрабатывается автономной AI-командой из 11 агентов:
- **Alex** (Orchestrator) — Coordination & Sprint management
- **Marcus** (CTO) — Architecture & Planning
- **Max** (Senior Backend) — Backend development
- **Nina** (Senior Frontend) — Frontend development
- **Kai** (UX Designer) — UI/UX design
- **Ava** (Researcher) — Research & documentation
- **Leo** (SecOps) — Security audit
- **Quinn** (QA) — Testing
- **Derek** (DevOps) — CI/CD & deployment
- **Elena** (AI Act Expert) — Legal compliance
- **Diana** (Tech Writer) — Documentation

## Workflow

Команда работает по Scrum с Approval Gates:
1. **Phase 0**: Архитектурные артефакты (Marcus) → PO утверждает
2. **Sprint Planning**: Marcus + Alex → PO утверждает Sprint Backlog
3. **Development**: Автономная работа команды
4. **Sprint Review**: Alex → PO утверждает
5. **PR Merge**: Marcus review + Leo security → PO мержит

## Начало работы

Детали настройки и запуска см. в `docs/PROJECT.md`

## Лицензия

Proprietary - All rights reserved

---

**Status**: Phase 0 (Architecture & Setup)
**Last Updated**: 2026-02-05
