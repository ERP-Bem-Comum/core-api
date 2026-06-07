#!/usr/bin/env bash
# scripts/e2e-bruno-auth.sh — smoke E2E HTTP via Bruno (.bru) para a borda /api/v1/users + /api/v2/auth.
#
# Cobertura: auth (login admin/bare + negativos + /me), users US1-US5 (list paginacao/busca/filtro/RBAC,
#            create, detail, update, activate/deactivate), e seguranca (JWT forjado, bearer vazio, SQLi,
#            mass-assignment, escalada de privilegio, search anti-DoS).
#
# Espelha scripts/e2e-bruno-partners.sh: secrets efemeros, MySQL via compose --wait (MYSQL_PORT),
# server real em background (auth=mysql -> aplica migrations no boot + valida persistencia), seed RBAC
# via AUTH_SEED_JSON. auth=mysql; contracts/partners ficam em memory (irrelevantes aqui).
#
# PRE-REQUISITO: `bru` CLI. Instalar @usebruno/cli DENTRO do repo esbarra no guard trustPolicy=no-downgrade
#   (ADR-0011/0029). Caminho validado: rodar fora da arvore, ex.:
#     (cd /tmp && pnpm dlx @usebruno/cli@3.4.2 run <ABS>/api-collections/auth -r --env local)
#
# Uso: pnpm run test:e2e:bruno:auth   (NAO faz parte de `pnpm test` — exige Docker + bru CLI).
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
  echo "[e2e-bruno-auth] ERRO: 'bru' CLI nao encontrado." >&2
  echo "  Rode fora da arvore do projeto, ex.:" >&2
  echo "    (cd /tmp && pnpm dlx @usebruno/cli@3.4.2 run \"$(pwd)/api-collections/auth\" -r --env local)" >&2
  exit 1
fi

mkdir -p secrets
printf 'rootpw-migration-test-only' > secrets/mysql_root_password.txt
printf 'apppw-migration-test-only' > secrets/mysql_app_password.txt
printf 'ropw-migration-test-only' > secrets/mysql_readonly_password.txt
chmod 644 secrets/mysql_*.txt

MYSQL_PORT="${MYSQL_PORT:-3307}"
export MYSQL_PORT
docker compose up -d mysql --wait || exit 1

AUTH_DRIVER=mysql \
  AUTH_DATABASE_URL="mysql://root:rootpw-migration-test-only@127.0.0.1:${MYSQL_PORT}/core" \
  CORE_API_E2E=1 \
  AUTH_SEED_JSON='{"users":[{"email":"admin.e2e@bemcomum.dev","password":"Str0ng-Passphrase-2026!","permissions":["user:list","user:read","user:create","user:update","user:activate","user:deactivate"]},{"email":"bare.e2e@bemcomum.dev","password":"Str0ng-Passphrase-2026!","permissions":[]}]}' \
  PORT=3100 \
  LOG_LEVEL=warn \
  node --experimental-strip-types --enable-source-maps --no-warnings src/server.ts &
SRV=$!
disown "$SRV" 2>/dev/null || true

echo "[e2e-bruno-auth] Aguardando servidor em http://127.0.0.1:3100/health ..."
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:3100/health >/dev/null 2>&1; then
    echo "[e2e-bruno-auth] Servidor pronto."
    break
  fi
  [ "$i" -eq 60 ] && { echo "[e2e-bruno-auth] ERRO: servidor nao respondeu em 30s." >&2; exit 1; }
  sleep 0.5
done

# Senha do seed lida pelos requests de login via {{process.env.E2E_SEED_PASSWORD}}.
export E2E_SEED_PASSWORD="Str0ng-Passphrase-2026!"

COLLECTION_DIR="api-collections/auth"
FOLDERS=(1-auth 2-users 3-security)
echo "[e2e-bruno-auth] Executando colecao (ordem: ${FOLDERS[*]})"
for folder in "${FOLDERS[@]}"; do
  echo "[e2e-bruno-auth] --- Pasta: $folder/"
  ( cd "$COLLECTION_DIR" && bru run "$folder" --env local )
done
