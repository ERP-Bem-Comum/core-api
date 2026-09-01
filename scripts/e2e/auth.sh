#!/usr/bin/env bash
# scripts/e2e/auth.sh — orquestra o smoke E2E da borda auth (AUTH-HTTP-E2E-SMOKE).
#
# Sobe MySQL (Docker), provisiona o schema (job migrate), inicia o servidor real (AUTH_DRIVER=mysql)
# e roda o smoke (tests/e2e/auth-smoke.e2e.ts) via Node + fetch. `trap` garante o
# teardown (mata o server, derruba o compose, remove secrets) mesmo em falha.
#
# Uso: pnpm run test:e2e:auth   (NÃO faz parte do `pnpm test` — exige Docker).
set -uo pipefail

SRV=""
cleanup() {
  [ -n "$SRV" ] && kill "$SRV" 2>/dev/null || true
  docker compose down -v >/dev/null 2>&1 || true
  rm -f secrets/mysql_*.txt
}
trap cleanup EXIT

# Secrets de teste (mesmo padrão de test:integration:auth) — efêmeros, removidos no cleanup.
mkdir -p secrets
printf 'rootpw-migration-test-only' > secrets/mysql_root_password.txt
printf 'apppw-migration-test-only' > secrets/mysql_app_password.txt
printf 'ropw-migration-test-only' > secrets/mysql_readonly_password.txt
chmod 644 secrets/mysql_*.txt

# MySQL 8.4 via compose; --wait bloqueia até o healthcheck passar.
docker compose up -d mysql --wait || exit 1

# Provisiona o schema (CORE-MIGRATE-BOOT-INVERT: o server NÃO migra mais no boot).
MIGRATE_DATABASE_URL='mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core' \
  node --experimental-strip-types --enable-source-maps --no-warnings src/jobs/migrate/run.ts || exit 1

# Servidor real em background (applyMigrations:false — schema já provisionado acima).
#
# Os SETE módulos são declarados pelo helper, e não só o `auth`: sob o ADR-0068 o boot exige a
# configuração de todos, porque o `server.ts` compõe todos. Antes, os seis não citados aqui subiam
# em memória sem aviso — este smoke media um servidor meio configurado e não tinha como saber.
DB='mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core' \
  source scripts/e2e/server-env.sh

PORT=3100 \
  LOG_LEVEL=warn \
  node --experimental-strip-types --enable-source-maps --no-warnings src/server.ts &
SRV=$!
# disown: o shell não anuncia "Terminated" quando o trap mata o server no teardown.
disown "$SRV" 2>/dev/null || true

# Smoke via fetch — espera o /health no before(); seu exit code vira o do script (trap preserva).
E2E_BASE_URL=http://127.0.0.1:3100 \
  node --test --experimental-strip-types --enable-source-maps --no-warnings tests/e2e/auth-smoke.e2e.ts
