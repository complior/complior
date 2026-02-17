# Compliance Pack Format

**Version:** 1.0 | **Status:** Draft

## Overview

Compliance Packs are industry-specific rule extensions for Complior, following the ESLint plugin pattern. Partners (law firms, consultancies) can publish packs that add domain-specific compliance checks.

---

## Pack JSON Format

```json
{
  "name": "Healthcare AI Pack",
  "version": "1.0.0",
  "author": "Baker McKenzie",
  "jurisdiction": "eu-ai-act",
  "industry": "healthcare",
  "rules": [
    {
      "id": "health-ai-001",
      "check": "patient-data-ai-disclosure",
      "severity": "CRITICAL",
      "article": "eu-50.1",
      "description": "AI disclosure must mention health data processing",
      "pattern": {
        "type": "ast",
        "language": "typescript",
        "match": "CallExpression[callee.name='createChatbot']",
        "condition": "missing-health-disclosure"
      },
      "fix": {
        "type": "template",
        "template": "disclosure-health-data"
      }
    }
  ]
}
```

### Rule Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique rule identifier |
| `check` | string | Yes | Check name for CLI output |
| `severity` | enum | Yes | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `article` | string | Yes | Regulation article reference |
| `description` | string | Yes | Human-readable description |
| `pattern` | object | Yes | Detection pattern (AST, regex, or file check) |
| `fix` | object | No | Auto-fix template |

---

## Configuration

`.compliorrc.json` — ESLint-style extends:

```json
{
  "extends": ["complior:eu-ai-act"],
  "packs": ["@complior-rules/healthcare"],
  "jurisdictions": ["eu-ai-act"],
  "rules": {
    "disclosure-detail": "warn",
    "health-ai-001": "error"
  }
}
```

---

## Distribution Channels

| Channel | Example | Description |
|---------|---------|-------------|
| Built-in | `complior:eu-ai-act` | Ships with Complior |
| Community (npm) | `@complior-rules/healthcare` | Published on npm |
| Partner | `@bakermckenzie/ai-compliance-eu` | Law firm branded |

### Install

```bash
ai-comply rules add @complior-rules/healthcare
```

### List installed

```bash
ai-comply rules list
```

---

## Creating a Pack

1. Create a JSON file following the format above
2. Publish to npm with `@complior-rules/` scope (community) or your org scope (partner)
3. Users install via `ai-comply rules add <package>`
4. Rules merge with built-in rules; `severity` can be overridden in `.compliorrc.json`

---

## License

Pack format specification: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
