# infrastructure/ — Infrastructure Documentation

**Owner:** Derek (DevOps Engineer)

## Цель директории
Derek сохраняет здесь infrastructure docs:
- Deployment guides
- CI/CD configuration details
- Environment variables
- Docker setup
- Troubleshooting

## Формат файлов
```
DEPLOYMENT.md — Deployment guide (local + staging + production)
CI-CD.md — CI/CD pipeline details
MONITORING.md — Monitoring and logging setup
```

## Workflow
1. Derek получает [DevOps] User Story от Alex
2. Настраивает infrastructure (Docker, CI/CD, etc.)
3. Создаёт infrastructure changes → Derek использует Git для infrastructure PRs
4. Документирует → `infrastructure/*.md`
5. Тегает @diana_tech_writer_bot для review документации (опционально)

---

**Note:** Derek использует Git для infrastructure code (Dockerfiles, workflows), но документацию пишет напрямую сюда.
