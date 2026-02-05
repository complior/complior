# design/ — UX Design Specs

**Owner:** Kai (UX Designer)

## Цель директории
Kai сохраняет здесь UX design specs для каждой User Story:
- Wireframes (ASCII-арт или ссылки на Figma/Excalidraw)
- User flows (Mermaid diagrams)
- Component specifications
- Accessibility requirements

## Формат файлов
```
US-NNN-feature-name.md — Design spec для конкретной User Story
DESIGN-SYSTEM.md — Общий design system (цвета, типографика, компоненты)
```

## Workflow
1. Kai получает [UX] User Story от Alex
2. Создаёт design spec → `design/US-NNN-feature-name.md`
3. Тегает @nina_frontend_bot в группе: design готов к реализации
4. Nina реализует design в своих PRs

---

**Note:** БЕЗ Git — Kai сохраняет файлы напрямую, Nina читает их для реализации.
