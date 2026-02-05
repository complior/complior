# testing/ — QA Test Plans

**Owner:** Quinn (QA Engineer)

## Цель директории
Quinn сохраняет здесь test plans для каждой User Story:
- Test scenarios (happy path + edge cases + negative tests)
- Coverage goals
- Test automation requirements

## Формат файлов
```
US-NNN-test-plan.md — Test plan для конкретной User Story
```

## Workflow
1. Quinn получает [QA] User Story от Alex
2. Создаёт test plan → `testing/US-NNN-test-plan.md`
3. Тегает @max_backend_bot @nina_frontend_bot в группе: test plan готов
4. Max/Nina пишут тесты в своих PRs на основе этого test plan
5. Quinn review тестов в PRs

---

**Note:** БЕЗ Git — Quinn сохраняет файлы напрямую, Max/Nina читают для написания тестов.
