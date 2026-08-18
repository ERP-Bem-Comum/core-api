#!/usr/bin/env bash
# scripts/e2e/auth.sh — orquestra o smoke E2E da borda auth (AUTH-HTTP-E2E-SMOKE).
#
# Sobe MySQL (Docker), provisiona o schema (job migrate), inicia o servidor real (AUTH_DRIVER=mysql)
# e roda o smoke (tests/e2e/auth-smoke.e2e.ts) via Node + fetch. `trap` garante o
# teardown (mata o server, derruba o compose, remove secrets) mesmo em falha.
#
# Uso: pnpm run test:e2e:auth   (NÃO faz parte do `pnpm test` — exige Docker).
set -uo pipefail

# Projeto Docker isolado + backup/restore dos secrets (#517) — sem isto, o teardown apagava o
# banco e os secrets do dev local.
# shellcheck source=scripts/e2e/_e2e-env.sh
source "$(dirname "$0")/_e2e-env.sh"

SRV=""
cleanup() {
  [ -n "$SRV" ] && kill "$SRV" 2>/dev/null || true
  e2e_teardown
}
trap cleanup EXIT

# Secrets de teste (mesmo padrão de test:integration:auth) — efêmeros; os do dev são restaurados.
e2e_setup

# MySQL 8.4 via compose; --wait bloqueia até o healthcheck passar.
e2e_compose up -d mysql --wait || exit 1

# Provisiona o schema (CORE-MIGRATE-BOOT-INVERT: o server NÃO migra mais no boot).
MIGRATE_DATABASE_URL='mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core' \
  node --experimental-strip-types --enable-source-maps --no-warnings src/jobs/migrate/run.ts || exit 1

# Servidor real em background (applyMigrations:false — schema já provisionado acima).
AUTH_DRIVER=mysql \
  AUTH_DATABASE_URL='mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core' \
  PORT=3100 \
  LOG_LEVEL=warn \
  node --experimental-strip-types --enable-source-maps --no-warnings src/server.ts &
SRV=$!
# disown: o shell não anuncia "Terminated" quando o trap mata o server no teardown.
disown "$SRV" 2>/dev/null || true

# Smoke via fetch — espera o /health no before(); seu exit code vira o do script (trap preserva).
E2E_BASE_URL=http://127.0.0.1:3100 \
  node --test --experimental-strip-types --enable-source-maps --no-warnings tests/e2e/auth-smoke.e2e.ts
