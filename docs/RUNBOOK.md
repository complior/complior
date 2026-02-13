# Operations Runbook

## Service Management

### Start all services
```bash
cd /home/complior/PROJECT
docker compose -f docker-compose.production.yml up -d
```

### Stop all services
```bash
docker compose -f docker-compose.production.yml down
```

### Restart a single service
```bash
docker compose -f docker-compose.production.yml restart backend
```

### View logs
```bash
# All services
docker compose -f docker-compose.production.yml logs -f --tail=100

# Single service
docker compose -f docker-compose.production.yml logs -f backend --tail=50
```

### Health check
```bash
curl -s http://127.0.0.1:8000/health | jq .
```

---

## Deployment

### Standard deploy (from CI/CD)
Push to `main` branch triggers automatic deployment via GitHub Actions.

### Manual deploy
```bash
cd /home/complior/PROJECT
git fetch origin main
git checkout main
git pull origin main

docker compose -f docker-compose.production.yml build --no-cache backend frontend
docker compose -f docker-compose.production.yml up -d --no-deps backend
docker compose -f docker-compose.production.yml up -d --no-deps frontend

# Run migrations
docker compose -f docker-compose.production.yml exec -T backend node app/setup.js

# Verify
curl -s http://127.0.0.1:8000/health | jq .
```

### Rollback
```bash
cd /home/complior/PROJECT
git log --oneline -5        # Find previous good commit
git checkout <commit-sha>

docker compose -f docker-compose.production.yml up -d --build backend frontend

curl -s http://127.0.0.1:8000/health | jq .
```

---

## Database

### Connect to PostgreSQL
```bash
docker exec -it complior-postgres psql -U complior -d complior
```

### Manual backup
```bash
/home/complior/PROJECT/scripts/backup-db.sh
```

### Restore from backup
```bash
/home/complior/PROJECT/scripts/restore-db.sh <backup-file.sql.gz>
```

### List backups
```bash
ls -lh /home/complior/PROJECT/backups/
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|:-----:|-------------|:------------:|
| P0 | Service down, data loss | Immediate |
| P1 | Key feature broken | < 1 hour |
| P2 | Minor issue | < 4 hours |
| P3 | Cosmetic | Next sprint |

### Common Issues

**Backend not responding:**
```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs backend --tail=50
docker compose -f docker-compose.production.yml restart backend
```

**Database connection issues:**
```bash
docker exec complior-postgres pg_isready -U complior
docker compose -f docker-compose.production.yml restart postgres
# Wait for health check, then restart backend
sleep 10
docker compose -f docker-compose.production.yml restart backend
```

**TLS certificate issues:**
```bash
docker compose -f docker-compose.production.yml logs caddy --tail=20
docker compose -f docker-compose.production.yml restart caddy
```

**Disk space full:**
```bash
df -h /
docker system prune -f
# Check backup retention
ls -lh /home/complior/PROJECT/backups/
```
