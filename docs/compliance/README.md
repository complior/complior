# compliance/ — AI Act Compliance Specs

**Owner:** Elena (AI Act Legal Expert)

## Цель директории
Elena сохраняет здесь compliance specs для каждой User Story:
- Risk classification (Unacceptable / High / Limited / Minimal)
- Applicable AI Act Articles and Annexes
- Legal requirements для реализации
- Transparency obligations (UI disclosures, consent flows)

## Формат файлов
```
US-NNN-compliance.md — Compliance spec для конкретной User Story
```

## Workflow
1. Elena получает [Legal] User Story от Alex
2. Анализирует через AI Act Articles (используя AI-ACT-KB.md)
3. Создаёт compliance spec → `compliance/US-NNN-compliance.md`
4. Тегает команду: @kai_ux_designer_bot (UX для disclosures), @max_backend_bot @nina_frontend_bot (реализация)
5. Они реализуют compliance requirements в своих PRs

---

**Note:** БЕЗ Git — Elena сохраняет файлы напрямую, команда читает для реализации.
