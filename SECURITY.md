# Security Policy

## Supported Versions

We support the latest GA release line for security patches.

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| 1.0.x   | :white_check_mark: | Current GA — security fixes within 7 days for critical |
| 0.9.x   | :x:                | Pre-release — please upgrade to 1.0.x |
| < 0.9   | :x:                | Alpha/beta — please upgrade |

The current line is documented in [`CHANGELOG.md`](./CHANGELOG.md).

---

## Reporting a Vulnerability

If you discover a security vulnerability in Complior, please report it responsibly.

> **Do NOT open a public issue.**

Email us at: **security@complior.ai**

Include:
- A description of the vulnerability
- Reproduction steps (minimal example preferred)
- Affected version(s) — find via `complior --version`
- Potential impact assessment
- Your suggested fix (optional)

### Response timeline

| Stage | SLA |
|-------|-----|
| Initial acknowledgement | Within 48 hours |
| Triage + severity classification | Within 72 hours |
| Critical fix (CVSS ≥ 9.0) | Within 7 days |
| High fix (CVSS 7.0–8.9) | Within 30 days |
| Medium / Low | Best effort, prioritized in next minor release |

We will keep you informed throughout the process and credit you in release notes (unless you prefer to remain anonymous).

---

## Security Design Principles

- **Deterministic compliance** — all scanner checks are AST-based rules; no LLM involvement in compliance decisions. LLM is opt-in for L5 deep scan and document enrichment only.
- **No secrets in code** — API keys, tokens, and credentials are never stored in source code. `.complior/.env` is gitignored by default.
- **ed25519 signatures** — Agent Passports are cryptographically signed using ed25519 (Edwards-curve Digital Signature Algorithm). Keys are generated locally on first `complior init` and stored at `~/.config/complior/keys/`. Public key included in passport for verification.
- **Evidence chain integrity** — Compliance evidence linked via SHA-256 hash chain + ed25519 signatures (tamper-proof). Verifiable via `complior agent evidence --verify`.
- **Local-first** — scanner works fully offline without any API key or network access. LLM features (`--llm`, `--ai`, `--full eval`) require explicit opt-in via BYOK API key.
- **Input validation** — all external data validated via Zod schemas (TypeScript Engine) and typed parsers (Rust CLI).
- **Process isolation** — engine runs as a separate process; CLI communicates via localhost HTTP only (default port 3099, never bound to public interfaces).
- **Supply chain transparency** — `complior scan --deep` includes SBOM generation (CycloneDX 1.5 JSON) listing all AI SDKs and dependencies. CVE detection across 45+ AI SDKs.

---

## Cryptographic Key Management

### Agent Passport keys (ed25519)

- **Generation:** First `complior init` creates a fresh ed25519 keypair via Node.js native crypto.
- **Storage:** `~/.config/complior/keys/` (mode 0600, owner-only readable).
- **Rotation:** Currently manual — delete `~/.config/complior/keys/` and re-run `complior agent init` to regenerate. Existing passports must be re-signed with new key. Future: `complior agent rotate-keys` (V2 milestone).
- **Verification:** Public key embedded in passport allows third-party verification without access to your private key.

### What if my key is compromised?

1. Generate a new key: `rm -rf ~/.config/complior/keys/ && complior agent init --force`
2. Re-sign all passports: `complior agent show <name>` shows current keys; manual re-sign workflow needed (V2 will automate).
3. Notify dependent parties (audit reviewers, SaaS integrations) of the key change.
4. Email security@complior.ai with details if the compromise affected published artifacts.

---

## Distribution Integrity

### Verifying GitHub Release binaries

Each GitHub Release includes a `checksums.txt` with SHA-256 hashes:

```bash
# Download the binary + checksums
curl -fsSL -o complior https://github.com/complior/complior/releases/latest/download/complior-linux-x86_64
curl -fsSL -o checksums.txt https://github.com/complior/complior/releases/latest/download/checksums.txt

# Verify
sha256sum -c checksums.txt --ignore-missing
# complior-linux-x86_64: OK
```

### Verifying npm packages

```bash
# Inspect package metadata before install
npm info complior@1.0.1
npm info @complior/engine@1.0.1
```

### Verifying crates.io packages

```bash
# Inspect crate metadata
cargo info complior-cli
```

---

## Known limitations

- **No hardware-backed key storage yet** — ed25519 keys live on disk. Future: TPM/HSM integration (post-V2).
- **No automated key rotation** — manual workflow only in v1.0.x.
- **Manual key compromise recovery** — no built-in revocation; requires manual passport re-signing.

These are tracked in `docs/V2-ROADMAP.md` for future milestones.

---

## Hall of Fame

We credit security researchers who responsibly disclose vulnerabilities (with their permission). To be added, email security@complior.ai with your discovery + preferred attribution.

_(No entries yet — be the first.)_

---

## Last updated

2026-05-04 (post v1.0.1 release docs sync)
