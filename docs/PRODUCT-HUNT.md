# Complior — Product Hunt Launch Draft

## Tagline
AI Act compliance in your terminal. Scan, fix, ship.

## Description

**Complior** is an open-source terminal tool that scans your AI project for EU AI Act compliance and auto-fixes violations.

Think ESLint, but for AI regulation.

### The Problem

The EU AI Act (effective February 2025) imposes 108 obligations on companies deploying AI in Europe. Non-compliance means fines up to 7% of global revenue. Most dev teams don't know where to start.

### The Solution

```bash
curl -fsSL https://complior.ai/install.sh | sh
complior scan        # Score: 25/100
complior fix --all   # Score: 85/100
```

Complior scans your codebase in <10 seconds across 5 layers:
- **File presence** — Do required policy documents exist?
- **Document quality** — Do they contain the right sections?
- **Configuration** — Are log retention, API wrapping, etc. correct?
- **Code patterns** — AI disclosure, kill switches, bias checks?
- **Deep analysis** — LLM-powered semantic review (Pro)

Then auto-fixes what it finds: generates missing documents, adds code components, updates configs.

### Key Features

- **5-Layer Scanner** — L1 file presence to L5 LLM analysis
- **Auto-Fixer** — One command fixes 80%+ of violations
- **Interactive TUI** — Beautiful terminal dashboard with 6 views
- **CI/CD Ready** — `complior scan --ci --threshold 70`
- **SDK Middleware** — Runtime compliance for OpenAI/Anthropic/Google
- **Watch Mode** — Continuous monitoring during development
- **PDF Reports** — Audit-ready compliance reports

### Who is it for?

- Dev teams building AI-powered products for European markets
- CTOs and compliance officers needing automated compliance tooling
- AI startups preparing for EU AI Act enforcement
- Enterprise teams integrating AI into existing products

## Pricing

- **Free:** L1-L4 scanning, unlimited projects, no API key needed
- **Pro ($39/seat/month):** L5 deep analysis, priority support, advanced reporting
- **Enterprise:** Custom, on-premise, SSO, dedicated support

## Makers

Built by engineers who got tired of reading 144 pages of EU regulation.

## First Comment

Hey Product Hunt! 👋

We built Complior because we were frustrated. The EU AI Act is 144 pages, 108 obligations, and affects literally every company using AI in Europe.

We wanted something that works like ESLint — scan, see issues, fix them, move on.

The scanner runs in <10 seconds, the fixer handles 80% of issues automatically, and you can go from score 25 to 85 in under 2 minutes.

Would love your feedback:
- What regulations should we add next? (NIST AI RMF? ISO 42001?)
- Would you use this in your CI/CD pipeline?
- What's your biggest pain point with AI compliance?

Try it: `curl -fsSL https://complior.ai/install.sh | sh`
