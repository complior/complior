# Complior Walkthrough — From 25/100 to 85/100 in 2 Minutes

## Prerequisites

```bash
# Install Complior (one command)
curl -fsSL https://complior.ai/install.sh | sh

# Or use npm / cargo / Docker
npx ai-comply
cargo install complior
docker run -it -v $(pwd):/project complior/complior
```

## Step 1: Clone the Demo Project

```bash
git clone https://github.com/complior/vulnerai-demo
cd vulnerai-demo
```

The VulnerAI demo is a Next.js 14 project with intentional EU AI Act violations:

| Violation | File | Obligation | Impact |
|-----------|------|------------|--------|
| No AI disclosure | `src/app/chat/page.tsx` | OBL-015 (Art. 50) | -8 pts |
| No C2PA marking | `src/lib/ai.ts` | OBL-016 (Art. 50) | -5 pts |
| No AI Literacy doc | — (missing) | OBL-001 (Art. 4) | -5 pts |
| No FRIA | — (missing) | OBL-013 (Art. 27) | -8 pts |
| Low log retention | `docker-compose.yml` | OBL-006a (Art. 12) | -3 pts |
| No kill switch | `src/lib/ai.ts` | OBL-010 (Art. 14) | -5 pts |
| No monitoring policy | — (missing) | OBL-011 (Art. 26) | -5 pts |
| No incident template | — (missing) | OBL-021 (Art. 73) | -3 pts |

## Step 2: Scan

```bash
complior scan
```

**Result:**
```
Score: 25/100 (Red Zone)
Checks: 108 total, 27 passed, 23 failed, 58 skipped
Files scanned: 6 in 2.3s

Findings (23):
  CRITICAL: 3
  HIGH: 8
  MEDIUM: 7
  LOW: 5
```

## Step 3: Fix

```bash
complior fix --all
```

Complior auto-generates:
- `docs/AI-LITERACY.md` — AI literacy training document
- `docs/FRIA.md` — Fundamental Rights Impact Assessment
- `docs/MONITORING-POLICY.md` — Human oversight policy
- `docs/INCIDENT-REPORT-TEMPLATE.md` — Incident reporting template
- Adds `<AIDisclosure />` component to chat page
- Updates `docker-compose.yml` log retention to 6 months
- Adds kill switch mechanism to AI utility

**After fix:**
```
Re-scanning... Score: 85/100 (Green Zone) (+60!)
```

## Step 4: Generate Report

```bash
complior report --format md
complior report --format pdf
```

Generates a comprehensive compliance audit report with:
- Executive summary
- Score breakdown by category
- Findings table with remediation status
- Timeline and recommendations

## Step 5: CI Integration

```bash
# Add to your CI pipeline
complior scan --ci --threshold 70

# SARIF output for IDE integration
complior scan --sarif > results.sarif
```

## Interactive Mode

Launch the full TUI for an interactive experience:

```bash
complior
```

Features:
- Real-time score gauge with animation
- 6-view dashboard (Dashboard, Scan, Fix, Score, Report, Chat)
- AI chat assistant for compliance questions
- Watch mode for continuous monitoring
- Theme picker (6 themes)
