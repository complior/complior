# AI Act Knowledge Base

База знаний по EU AI Act для команды (Elena + Ava).

## Ключевые статьи

### Article 5: Prohibited AI Practices (Unacceptable Risk)
- Subliminal manipulation
- Exploitation of vulnerabilities
- Social scoring by public authorities
- Real-time biometric identification (with exceptions)

### Article 6: Classification Rules for High-Risk AI
Система считается high-risk если:
1. Используется как safety component продукта из Annex I (machinery, medical devices, etc.)
2. ИЛИ попадает в use cases из Annex III

### Annex III: High-Risk Use Cases
1. Biometrics identification and categorisation
2. Critical infrastructure management
3. Education and vocational training
4. Employment and worker management
5. Access to essential services (credit scoring, emergency services)
6. Law enforcement
7. Migration, asylum, border control
8. Administration of justice

### Article 9: Risk Management System
Требования для High-risk систем:
- Continuous iterative process
- Risk identification and mitigation
- Testing and validation
- Human oversight measures

### Article 10: Data Governance
- Training, validation, testing datasets
- Data quality requirements
- Bias detection and mitigation

### Article 52: Transparency Obligations
- Users must be informed when interacting with AI
- Emotion recognition / biometric categorization → disclosure
- Deep fakes → labeling requirement

## Risk Classification Flow

```
AI System Description
    ↓
Article 5 check → YES → ⛔ Unacceptable Risk (prohibited)
    ↓ NO
Annex III check → YES → 🔴 High Risk (conformity assessment required)
    ↓ NO
Transparency obligation → YES → 🟡 Limited Risk (transparency required)
    ↓ NO
🟢 Minimal Risk (no specific obligations)
```

## Полезные ссылки
- AI Act official text: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689
- Compliance checklist: (TODO - Elena создаст)

---

**Инструкция для Elena:**
- Обновляй при изменениях в AI Act
- Добавляй case law когда появится
- Создай compliance checklists в compliance/*.md
- Работай с Ava для мониторинга updates

**Последнее обновление:** 2026-02-04
