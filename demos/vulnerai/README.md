# VulnerAI — Intentionally Non-Compliant AI Chatbot

A Next.js AI chatbot that deliberately violates EU AI Act obligations.
Use this project to see Complior in action.

## Quick Start

```bash
# 1. Clone and enter the demo
cd demos/vulnerai

# 2. First scan — expect ~18/100 (Critical non-compliance)
complior scan

# 3. Auto-fix all findings
complior fix --all

# 4. Re-scan — expect ~85/100 (Good compliance)
complior scan
```

## Expected Scores

| Stage | Score | Zone |
|-------|-------|------|
| Before fix | ~18/100 | Red (Critical) |
| After fix | ~85/100 | Green (Good) |

## Intentional Violations

| # | Violation | File | Obligation |
|---|-----------|------|------------|
| 1 | AI chatbot without disclosure | `src/app/chat/page.tsx` | OBL-015, Art. 50(1) |
| 2 | No C2PA content marking | `src/lib/ai.ts` | OBL-016, Art. 50(2) |
| 3 | No AI Literacy documentation | (missing) | OBL-001, Art. 4 |
| 4 | No FRIA document | (missing) | OBL-013, Art. 27 |
| 5 | Log retention 7 days (need 180) | `docker-compose.yml` | OBL-006a, Art. 12 |
| 6 | No kill switch | `src/lib/ai.ts` | OBL-010, Art. 14 |
| 7 | No prohibited practice screening | (missing) | OBL-002, Art. 5 |
| 8 | No monitoring policy | (missing) | OBL-011, Art. 26 |
| 9 | No incident report template | (missing) | OBL-021, Art. 73 |
| 10 | No human oversight docs | (missing) | OBL-008, Art. 14 |
