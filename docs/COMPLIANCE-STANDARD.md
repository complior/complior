# Complior Compliance Metadata Standard

**Version:** 1.0 | **Status:** Draft | **Updated:** 2026-02-17

## Overview

Machine-readable format for web applications to declare AI compliance status. Enables automated discovery, verification, and monitoring by regulators, auditors, and tools.

---

## 1. HTML Meta Tags

```html
<meta name="ai-compliance" content="complior:v1" />
<meta name="ai-system-type" content="chatbot" />
<meta name="ai-provider" content="openai:gpt-4o" />
<meta name="ai-compliance-score" content="87" />
<meta name="ai-compliance-date" content="2026-05-15" />
```

| Tag | Required | Description |
|-----|----------|-------------|
| `ai-compliance` | Yes | Standard identifier and version |
| `ai-system-type` | Yes | `chatbot`, `content-generation`, `recommendation`, `classification`, `decision-support`, `autonomous-agent` |
| `ai-provider` | Yes | Format: `provider:model` |
| `ai-compliance-score` | No | 0-100 from last assessment |
| `ai-compliance-date` | No | ISO 8601 date |

---

## 2. JavaScript Object

```js
window.__AI_COMPLIANCE__ = {
  scanner: "complior/1.0",
  score: 87,
  lastScan: "2026-05-15",
  disclosures: ["chatbot", "content-generation"],
  jurisdictions: ["eu-ai-act"],
  certificate: "https://complior.ai/cert/abc123"
};
```

---

## 3. HTTP Headers

```
X-AI-Compliance: complior/1.0; score=87
X-AI-System-Type: chatbot
X-AI-Provider: openai:gpt-4o
```

Suitable for API endpoints where HTML meta tags are not applicable.

---

## 4. Well-Known Endpoint

Serve at `/.well-known/ai-compliance.json`:

```json
{
  "version": "1.0",
  "scanner": "complior",
  "score": 87,
  "lastScan": "2026-05-15",
  "systems": [{
    "type": "chatbot",
    "provider": "openai:gpt-4o",
    "riskLevel": "limited",
    "disclosure": true,
    "logging": true,
    "contentMarking": true
  }],
  "jurisdictions": ["eu-ai-act"],
  "certificate": "https://complior.ai/cert/abc123"
}
```

---

## 5. Compliance Badge

```markdown
[![AI Compliance](https://complior.ai/badge/score/repo-name.svg)](https://complior.ai/report/repo-name)
```

| Score | Color | Label |
|-------|-------|-------|
| 90-100 | Green | Compliant |
| 70-89 | Blue | Mostly Compliant |
| 50-69 | Yellow | Partial |
| 0-49 | Red | Non-Compliant |

Free for open-source repos. Paid badge with QR certificate for commercial projects.

---

## 6. Scanner Detection Order

1. `GET /.well-known/ai-compliance.json` (canonical source)
2. HTTP response headers
3. HTML `<meta>` tags in DOM
4. `window.__AI_COMPLIANCE__` after page load

Conflicts between sources are flagged as warnings.

---

## License

This specification is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
