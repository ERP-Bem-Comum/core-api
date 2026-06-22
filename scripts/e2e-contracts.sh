#!/usr/bin/env bash
# scripts/e2e-contracts.sh — orquestra o smoke E2E da borda contracts (CONTRACTS-HTTP-E2E-SMOKE).
#
# Sobe MySQL (Docker), inicia o servidor real com auth+contracts em MySQL (dual-pool: writer=root,
# reader=readonly_bi) e roda o smoke (tests/e2e/contracts-smoke.e2e.ts) via Node + fetch. O operador
# com contract:read+write vem do seed RBAC via env (CORE_API_E2E + AUTH_SEED_JSON). `trap` garante o
# teardown (server, compose, secrets) mesmo em falha.
#
# Storage: o smoke NÃO faz upload (fora de escopo, SPEC §6) — o composition só valida a config `S3_*`
# (parseAwsS3Env) e cria o client S3 lazy, nunca contatado aqui. Por isso o MinIO NÃO sobe e o
# `S3_ENDPOINT` aponta para uma porta dummy local. (Upload real → ver test:integration:storage.)
#
# Uso: pnpm run test:e2e:contracts   (NÃO faz parte do `pnpm test` — exige Docker).
set -uo pipefail

SRV=""
cleanup() {
  [ -n "$SRV" ] && kill "$SRV" 2>/dev/null || true
  # Fallback: mata qualquer server.ts órfão (kill por PID pode falhar se o processo forkou/escapou).
  pkill -f 'node .*src/server.ts' 2>/dev/null || true
  docker compose down -v >/dev/null 2>&1 || true
  rm -f secrets/mysql_*.txt
}
trap cleanup EXIT

# Limpeza preventiva: um server órfão de uma run anterior (na PORT 3100, conectado a um MySQL já
# destruído) responderia /health mas falharia as queries — fazendo o smoke bater no processo errado.
pkill -f 'node .*src/server.ts' 2>/dev/null || true

# Secrets de teste (mesmo padrão de test:integration:*) — efêmeros, removidos no cleanup.
mkdir -p secrets
printf 'rootpw-migration-test-only' > secrets/mysql_root_password.txt
printf 'apppw-migration-test-only' > secrets/mysql_app_password.txt
printf 'ropw-migration-test-only' > secrets/mysql_readonly_password.txt
chmod 644 secrets/mysql_*.txt

# MySQL 8.4 via compose; --wait bloqueia até o healthcheck passar. (MinIO não sobe — sem upload no smoke.)
docker compose up -d mysql --wait || exit 1

# Provisiona o schema (CORE-MIGRATE-BOOT-INVERT: o server NÃO migra mais no boot).
MIGRATE_DATABASE_URL='mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core' \
  node --experimental-strip-types --enable-source-maps --no-warnings src/jobs/migrate/run.ts || exit 1

# Servidor real em background (applyMigrations:false — schema já provisionado). Semeia o operador
# RBAC (CORE_API_E2E=1 + AUTH_SEED_JSON). Dual-pool: writer=root, reader=readonly_bi (SELECT-only).
AUTH_DRIVER=mysql \
  AUTH_DATABASE_URL='mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core' \
  CONTRACTS_DRIVER=mysql \
  CONTRACTS_DATABASE_URL='mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core' \
  CONTRACTS_READER_URL='mysql://readonly_bi:ropw-migration-test-only@127.0.0.1:3306/core' \
  S3_REGION=us-east-1 \
  S3_BUCKET=contracts-documents \
  S3_ACCESS_KEY_ID=dev-access-key \
  S3_SECRET_ACCESS_KEY=dev-secret-key-min-8-chars \
  S3_ENDPOINT=http://127.0.0.1:9555 \
  S3_FORCE_PATH_STYLE=true \
  CORE_API_E2E=1 \
  AUTH_SEED_JSON='{"users":[{"email":"e2e-operator@example.com","password":"Str0ng-Passphrase-2026!","permissions":["contract:read","contract:write"]}]}' \
  PORT=3100 \
  LOG_LEVEL=warn \
  node --experimental-strip-types --enable-source-maps --no-warnings src/server.ts &
SRV=$!
disown "$SRV" 2>/dev/null || true

# Smoke via fetch — espera o /health no before(); seu exit code vira o do script (trap preserva).
E2E_BASE_URL=http://127.0.0.1:3100 \
  node --test --experimental-strip-types --enable-source-maps --no-warnings tests/e2e/contracts-smoke.e2e.ts
