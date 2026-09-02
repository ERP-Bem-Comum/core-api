#!/usr/bin/env bash
# scripts/e2e/collaborators.sh — orquestra o smoke E2E da borda /api/v1/collaborators (P4-SMOKE).
#
# [DEPRECATED] A cobertura de collaborators foi migrada para a colecao Bruno em
# api-collections/core-api/7-partners/collaborators/ (ADR-0034). Use:
#   pnpm run test:e2e:bruno:partners
# Este script sera removido apos validacao em ambiente de CI. Nao adicionar novos cenarios aqui.
#
# Sobe MySQL (Docker), inicia o servidor real com partners em MySQL (RW split: writer=root,
# reader=readonly_bi) e roda o smoke (tests/e2e/collaborators-smoke.e2e.ts) via Node + fetch.
# auth/contracts ficam em memory (nao participam do fluxo) — foco no partners MySQL. O operador
# com collaborator:read+write vem do seed RBAC via env (CORE_API_E2E + AUTH_SEED_JSON). `trap`
# garante o teardown (server, compose, secrets) mesmo em falha.
#
# Uso: pnpm run test:e2e:collaborators   (NAO faz parte do `pnpm test` — exige Docker).
set -uo pipefail

# Projeto Docker isolado + backup/restore dos secrets (#517) — sem isto, o teardown apagava o
# banco e os secrets do dev local.
# shellcheck source=scripts/e2e/_e2e-env.sh
source "$(dirname "$0")/_e2e-env.sh"

SRV=""
cleanup() {
  [ -n "$SRV" ] && kill "$SRV" 2>/dev/null || true
  pkill -f 'node .*src/server.ts' 2>/dev/null || true
  e2e_teardown
}
trap cleanup EXIT

# Limpeza preventiva: server orfao de uma run anterior responderia /health mas falharia as queries.
pkill -f 'node .*src/server.ts' 2>/dev/null || true

# Secrets de teste (mesmo padrao de test:integration:*) — efemeros; os do dev sao restaurados.
e2e_setup

# Porta do host configuravel (evita conflito com um MySQL ja em 3306 — ex.: stack bemcomum-*).
# O compose le ${MYSQL_PORT:-3306}; as URLs abaixo usam a mesma porta. Rode com MYSQL_PORT=3307 se 3306 ocupada.
MYSQL_PORT="${MYSQL_PORT:-3306}"
export MYSQL_PORT

# MySQL 8.4 via compose; --wait bloqueia ate o healthcheck passar.
e2e_compose up -d mysql --wait || exit 1

# Provisiona o schema (CORE-MIGRATE-BOOT-INVERT: o server NÃO migra mais no boot).
MIGRATE_DATABASE_URL="mysql://root:rootpw-migration-test-only@127.0.0.1:${MYSQL_PORT}/core" \
  node --experimental-strip-types --enable-source-maps --no-warnings src/jobs/migrate/run.ts || exit 1

# Servidor real em background (applyMigrations:false — schema já provisionado). O operador RBAC é
# semeado por CORE_API_E2E=1 + AUTH_SEED_JSON (collaborator:read+write).
#
# ⚠️ O seed roda AGORA sobre auth=mysql, e não mais sobre memory: sob o ADR-0068 os SETE módulos são
# obrigatórios, e o helper os declara. `applyRbacSeed` não distingue driver (`composition.ts:448`) e
# persiste o Role antes do usuário justamente para satisfazer a FK que só existe em mysql
# (`composition.ts:349-350`) — o caminho mysql é o mais exigente dos dois, não o mais frouxo.
DB="mysql://root:rootpw-migration-test-only@127.0.0.1:${MYSQL_PORT}/core" \
  RO="mysql://readonly_bi:ropw-migration-test-only@127.0.0.1:${MYSQL_PORT}/core" \
  source scripts/e2e/server-env.sh

CORE_API_E2E=1 \
  AUTH_SEED_JSON='{"users":[{"email":"e2e-rh@example.com","password":"Str0ng-Passphrase-2026!","permissions":["collaborator:read","collaborator:write"]}]}' \
  PORT=3100 \
  LOG_LEVEL=warn \
  node --experimental-strip-types --enable-source-maps --no-warnings src/server.ts &
SRV=$!
disown "$SRV" 2>/dev/null || true

# Smoke via fetch — espera o /health no before(); seu exit code vira o do script (trap preserva).
E2E_BASE_URL=http://127.0.0.1:3100 \
  node --test --experimental-strip-types --enable-source-maps --no-warnings tests/e2e/collaborators-smoke.e2e.ts
