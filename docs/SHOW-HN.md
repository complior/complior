# Show HN: Complior — AI Act Compliance Scanner in your Terminal

I built a terminal-based compliance tool for the EU AI Act.

**The problem:** EU AI Act (effective Feb 2, 2025) affects every company using AI in Europe. 108 obligations across 34 articles. Most developers have no idea where to start, and compliance consultants charge $500/hour.

**The solution:** `complior scan` checks your codebase against all 108 obligations in <10 seconds. `complior fix --all` auto-generates missing documents, adds disclosure components, fixes log retention configs — and re-scans to verify.

**Demo (30 seconds):**

```bash
curl -fsSL https://complior.ai/install.sh | sh
cd your-ai-project
complior scan          # Score: 25/100, 23 findings
complior fix --all     # Score: 85/100 (+60!)
complior report --format pdf   # Audit-ready PDF
```

**What it scans (5 layers):**
- L1: File presence (policies, FRIA, incident templates)
- L2: Document structure (required sections, content quality)
- L3: Config & dependencies (log retention, API wrapping)
- L4: Code patterns (disclosure components, kill switches, bias checks)
- L5: LLM deep analysis (semantic understanding, edge cases)

**Stack:**
- Rust TUI (Ratatui, 5MB static binary) — 6-view dashboard, animations, themes
- TypeScript Engine (Hono, SSE streaming) — scanner, fixer, reporter, MCP server
- SDK (`@complior/sdk`) — runtime middleware for OpenAI/Anthropic/Google/Vercel AI

**5 install methods:** curl, cargo, npx, brew, Docker

**Free tier:** L1-L4 scanning, unlimited projects. No API key needed.
**Pro ($39/seat):** L5 LLM analysis, priority support.

GitHub: https://github.com/a3ka/complior
Docs: https://complior.ai/docs

I'd love feedback on:
1. Which obligations are most confusing for developers?
2. Should we add more regulations beyond EU AI Act (NIST AI RMF, ISO 42001)?
3. Is the 5-layer scanner approach intuitive?
