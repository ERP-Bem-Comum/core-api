#!/usr/bin/env bash
# scripts/e2e/bruno-all.sh — runner ÚNICO de integração HTTP (spec 007, US4).
#
# Sobe MySQL + MinIO via Docker, boota o server com TODOS os módulos em driver real (auth/contracts/
# partners → mysql; storage → minio) e os seeds completos (SEED-CONTRACT), e executa a coleção
# unificada `api-collections/core-api`:
#   - PRINCIPAL (0-auth + 1-7): deve PASSAR — determina o exit code (FR-008).
#   - z-pending-fixes: suíte de REGRESSÃO. Roda em processo próprio, mas o rc dela entra no exit
#     code junto com o da principal (linha final: `[ $RC_MAIN -eq 0 ] && [ $RC_PENDING -eq 0 ]`).
#     ⚠️ O NOME MENTE, e é dívida conhecida. A pasta nasceu expected-fail — o ADR-0038 §2 manda
#     isolar teste que reprova de propósito —, mas os 5 tickets foram implementados e ela virou
#     regressão bloqueante. Renomear tocaria 17 registros históricos (`.claude/.pipeline/`,
#     `specs/007/safety-net/`) que o ADR-0057 §5 proíbe reescrever, mais errata no ADR-0038, que é
#     imutável. Custo maior que o do nome errado — decidido em 2026-08-05, com a Inquiry-0026 aberta
#     para medir se o Bruno permanece.
#
# Uso: pnpm run test:integration:all   (exige Docker + bru CLI; NÃO faz parte de `pnpm test`).
# Token compartilhado: o `bru run` recebe TODAS as pastas principais num único processo (o token
# capturado em 0-auth persiste). Rodar pasta-a-pasta perderia o token (bug do 401).
set -uo pipefail

SRV=""
cleanup() {
  [ -n "$SRV" ] && kill "$SRV" 2>/dev/null || true
  pkill -f 'node .*src/server.ts' 2>/dev/null || true
  docker compose down -v >/dev/null 2>&1 || true
  rm -f secrets/mysql_*.txt
}
trap cleanup EXIT
pkill -f 'node .*src/server.ts' 2>/dev/null || true

if ! command -v bru &>/dev/null; then
  echo "[e2e-all] ERRO: 'bru' CLI nao encontrado (rode via pnpm, que injeta node_modules/.bin no PATH)." >&2
  exit 1
fi

mkdir -p secrets
printf 'rootpw-migration-test-only' > secrets/mysql_root_password.txt
printf 'apppw-migration-test-only' > secrets/mysql_app_password.txt
printf 'ropw-migration-test-only' > secrets/mysql_readonly_password.txt
chmod 644 secrets/mysql_*.txt

MYSQL_PORT="${MYSQL_PORT:-3307}"
export MYSQL_PORT

echo "[e2e-all] Subindo MySQL + MinIO..."
docker compose up -d mysql minio --wait || exit 1
# Cria o bucket contracts-documents (minio-bootstrap roda uma vez e sai).
docker compose up minio-bootstrap >/dev/null 2>&1 || true

# Seed RBAC unificado (SEED-CONTRACT): 5 usuarios (o bare-user e2e-bare e' registrado via /register no 0-auth).
SEED_JSON='{"users":[
  {"email":"admin.e2e@bemcomum.dev","password":"Str0ng-Passphrase-2026!","permissions":["user:list","user:read","user:create","user:update","user:activate","user:deactivate","role:read","user:assign-role","role:create","role:update"]},
  {"email":"bare.e2e@bemcomum.dev","password":"Str0ng-Passphrase-2026!","permissions":[]},
  {"email":"e2e-reader@example.com","password":"Str0ng-Passphrase-2026!","permissions":["contract:read"]},
  {"email":"e2e-contracts@example.com","password":"Str0ng-Passphrase-2026!","permissions":["contract:read","contract:write"]},
  {"email":"e2e-partners@example.com","password":"Str0ng-Passphrase-2026!","permissions":["supplier:read","supplier:write","financier:read","financier:write","collaborator:read","collaborator:write","act:read","act:write","geography:read","geography:write"]},
  {"email":"e2e-programs@example.com","password":"Str0ng-Passphrase-2026!","permissions":["program:read","program:write","program:deactivate"]}
]}'

echo "[e2e-all] Bootando server (os 7 modulos em mysql — ADR-0068)..."
DB="mysql://root:rootpw-migration-test-only@127.0.0.1:${MYSQL_PORT}/core"
RO="mysql://readonly_bi:ropw-migration-test-only@127.0.0.1:${MYSQL_PORT}/core"

# Provisiona o schema (CORE-MIGRATE-BOOT-INVERT: o server NÃO migra mais no boot).
echo "[e2e-all] Aplicando migrations (job migrate)..."
MIGRATE_DATABASE_URL="$DB" \
  node --experimental-strip-types --enable-source-maps --no-warnings src/jobs/migrate/run.ts || exit 1

# Os SETE módulos vêm do helper (ADR-0068). Antes, `financial`, `budget-plans` e `reports` não eram
# declarados aqui e subiam em memória sem aviso — a coleção Bruno exercitava rotas do `financial`
# contra um store volátil, e o que passava era um servidor meio configurado.
S3_HOST="127.0.0.1:${MINIO_API_PORT:-9000}" source scripts/e2e/server-env.sh

S3_ENDPOINT="http://127.0.0.1:${MINIO_API_PORT:-9000}" \
  S3_REGION=us-east-1 \
  S3_BUCKET=contracts-documents \
  S3_ACCESS_KEY_ID=dev-access-key \
  S3_SECRET_ACCESS_KEY=dev-secret-key-min-8-chars \
  S3_FORCE_PATH_STYLE=true \
  CORE_API_E2E=1 \
  AUTH_SEED_JSON="$SEED_JSON" \
  AUTH_LOGIN_RATE_LIMIT_MAX=1000 \
  PORT=3100 \
  LOG_LEVEL=warn \
  node --experimental-strip-types --enable-source-maps --no-warnings src/server.ts &
SRV=$!
disown "$SRV" 2>/dev/null || true

echo "[e2e-all] Aguardando /health ..."
for i in $(seq 1 60); do
  curl -sf http://127.0.0.1:3100/health >/dev/null 2>&1 && { echo "[e2e-all] Servidor pronto."; break; }
  [ "$i" -eq 60 ] && { echo "[e2e-all] ERRO: servidor nao respondeu em 30s." >&2; exit 1; }
  sleep 0.5
done

export E2E_SEED_PASSWORD="Str0ng-Passphrase-2026!"

# ─── PRINCIPAL: pastas em UM unico `bru run` (token de 0-auth persiste) ──────────────
MAIN_FOLDERS=(0-auth 1-users 2-me 3-roles-permissions 4-auth-security 5-auth-improvements 6-contracts 7-partners 8-programs)
JSON_MAIN=(); [ "${E2E_JSON_REPORT:-0}" = "1" ] && { mkdir -p "$(pwd)/test-results"; JSON_MAIN=(--reporter-json "$(pwd)/test-results/main.json"); }
echo "[e2e-all] === Suíte PRINCIPAL (${MAIN_FOLDERS[*]}) ==="
( cd api-collections/core-api && bru run "${MAIN_FOLDERS[@]}" --env local -r "${JSON_MAIN[@]}" )
RC_MAIN=$?

# ─── REGRESSÃO DE FIX: z-pending-fixes (os 5 tickets foram implementados → DEVE passar) ──
echo "[e2e-all] === Suíte REGRESSÃO (z-pending-fixes — deve PASSAR após os 5 fixes) ==="
JSON_PEND=(); [ "${E2E_JSON_REPORT:-0}" = "1" ] && JSON_PEND=(--reporter-json "$(pwd)/test-results/pending.json"); ( cd api-collections/core-api && bru run 0-auth z-pending-fixes --env local -r "${JSON_PEND[@]}" )
RC_PENDING=$?

echo
echo "[e2e-all] ===================== RESUMO ====================="
echo "[e2e-all] PRINCIPAL:  rc=$RC_MAIN  $([ $RC_MAIN -eq 0 ] && echo 'VERDE ✓' || echo 'VERMELHO ✗ (regressão a corrigir)')"
echo "[e2e-all] REGRESSÃO:  rc=$RC_PENDING  $([ $RC_PENDING -eq 0 ] && echo 'VERDE ✓' || echo 'VERMELHO ✗ (fix quebrado)')"
echo "[e2e-all] =================================================="

# Gate: AMBAS as suítes devem passar (os 5 tickets de fix já estão implementados).
[ $RC_MAIN -eq 0 ] && [ $RC_PENDING -eq 0 ]; exit $?
