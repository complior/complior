# SECURITY-POLICY.md — AI Act Compliance Platform

**Status:** 🚧 TODO — Leo должен заполнить во время работы
**Version:** 0.1.0 (placeholder)
**Last updated:** 2026-02-04

## Цель документа
Security policies, OWASP Top 10 checklist, known CVEs, incident response protocol.

## OWASP Top 10 Checklist
- [ ] A01: Broken Access Control
- [ ] A02: Cryptographic Failures
- [ ] A03: Injection (SQL, XSS, Command)
- [ ] A04: Insecure Design
- [ ] A05: Security Misconfiguration
- [ ] A06: Vulnerable Components
- [ ] A07: Identification & Authentication Failures
- [ ] A08: Software & Data Integrity Failures
- [ ] A09: Security Logging & Monitoring Failures
- [ ] A10: Server-Side Request Forgery (SSRF)

## Known CVEs
TODO: Leo обновляет при обнаружении уязвимостей в dependencies

## Security Best Practices
- NEVER hardcode secrets (use .env + GitHub Secrets)
- ALWAYS sanitize user input (backend + frontend)
- ALWAYS use HTTPS in production
- ALWAYS enable CORS properly
- ALWAYS implement rate limiting
- ALWAYS log security events

## Incident Response Protocol
TODO: Leo создаст протокол реагирования на инциденты

---

**Maintenance:** Leo обновляет этот файл по мере работы.
