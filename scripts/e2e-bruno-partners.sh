#!/usr/bin/env bash
# scripts/e2e-bruno-partners.sh — smoke E2E HTTP via Bruno (.bru) para toda a borda /api/v1 do modulo partners.
#
# Cobertura: suppliers (CRUD + export CSV + service-categories), financiers (CRUD),
#            collaborators (CRUD + complete-registration + import CSV),
#            territory (partner-states + partner-municipalities).
# Subtitui: scripts/e2e-collaborators.sh (cobertura de collaborators migrada para a colecao Bruno).
#
# Espelha o padrao de scripts/e2e-collaborators.sh (mesmo trap/cleanup, secrets efemeros, MYSQL_PORT,
# compose --wait, server em background, seed RBAC) — mas roda a colecao Bruno via `bru run`.
# auth/contracts ficam em memory; partners=mysql (RW split: writer=root, reader=readonly_bi, banco `core`).
# O operador tem supplier:read+write, financier:read+write, collaborator:read+write,
# geography:read+write (seed RBAC via AUTH_SEED_JSON).
#
# PRE-REQUISITO: `bru` CLI disponivel — NAO usar npm (ADR-0012).
#   Verificacao: bru --version
#   FRICCAO DE SUPPLY-CHAIN: instalar @usebruno/cli DENTRO deste repo esbarra no guard
#   `trustPolicy: no-downgrade` do pnpm-workspace.yaml (ADR-0011/0029) — uma transitive dep
#   (semver@6.3.1) dispara ERR_PNPM_TRUST_DOWNGRADE. Caminhos validos hoje:
#     (a) instalar/rodar o bru FORA da arvore do projeto (onde o workspace config nao se aplica); ou
#     (b) adicionar excecao cirurgica em trustPolicyExclude — porem isso muda a postura de
#         supply-chain do repo e deve vir junto do ADR de adocao do Bruno (hoje SEM ADR).
#
# Uso: pnpm run test:e2e:bruno:partners   (NAO faz parte de `pnpm test` — exige Docker + bru CLI).
# CI opt-in: incluir em CI exige ADR de adocao do Bruno + resolver a friccao de trust acima.
#
# Reporter JUnit (opt-in via E2E_JUNIT_REPORT=1):
#   E2E_JUNIT_REPORT=1 pnpm run test:e2e:bruno:partners
set -uo pipefail

SRV=""
cleanup() {
  [ -n "$SRV" ] && kill "$SRV" 2>/dev/null || true
  pkill -f 'node .*src/server.ts' 2>/dev/null || true
  docker compose down -v >/dev/null 2>&1 || true
  rm -f secrets/mysql_*.txt
}
trap cleanup EXIT

# Limpeza preventiva: server orfao de uma run anterior responderia /health mas falharia as queries.
pkill -f 'node .*src/server.ts' 2>/dev/null || true

# Verifica se `bru` esta disponivel.
if ! command -v bru &>/dev/null; then
  echo "[e2e-bruno-partners] ERRO: 'bru' CLI nao encontrado." >&2
  echo "  Instalar @usebruno/cli DENTRO deste repo falha no guard trustPolicy=no-downgrade" >&2
  echo "  (semver@6.3.1 -> ERR_PNPM_TRUST_DOWNGRADE; ADR-0011/0029). Caminho validado:" >&2
  echo "    rode o bru fora da arvore do projeto, ex.:" >&2
  echo "    (cd /tmp && pnpm dlx @usebruno/cli run <CAMINHO_ABS>/api-collections/partners --env local -r)" >&2
  echo "  Nunca usar npm (ADR-0012)." >&2
  exit 1
fi

# Secrets de teste (mesmo padrao de test:integration:*) — efemeros, removidos no cleanup.
mkdir -p secrets
printf 'rootpw-migration-test-only' > secrets/mysql_root_password.txt
printf 'apppw-migration-test-only' > secrets/mysql_app_password.txt
printf 'ropw-migration-test-only' > secrets/mysql_readonly_password.txt
chmod 644 secrets/mysql_*.txt

# Porta do host configuravel (evita conflito com um MySQL ja em 3306 — ex.: stack bemcomum-*).
# O compose le ${MYSQL_PORT:-3306}; as URLs abaixo usam a mesma porta. Rode com MYSQL_PORT=3307 se 3306 ocupada.
MYSQL_PORT="${MYSQL_PORT:-3306}"
export MYSQL_PORT

# MySQL 8.4 via compose; --wait bloqueia ate o healthcheck passar.
docker compose up -d mysql --wait || exit 1

# Servidor real em background. partners=mysql aplica migrations par_* no boot; auth=memory semeia o
# operador RBAC com todas as permissoes necessarias para a colecao completa. contracts=memory (default).
PARTNERS_DRIVER=mysql \
  PARTNERS_DATABASE_URL="mysql://root:rootpw-migration-test-only@127.0.0.1:${MYSQL_PORT}/core" \
  PARTNERS_READER_URL="mysql://readonly_bi:ropw-migration-test-only@127.0.0.1:${MYSQL_PORT}/core" \
  CORE_API_E2E=1 \
  AUTH_SEED_JSON='{"users":[{"email":"e2e-partners@example.com","password":"Str0ng-Passphrase-2026!","permissions":["supplier:read","supplier:write","financier:read","financier:write","collaborator:read","collaborator:write","geography:read","geography:write"]},{"email":"e2e-bare@example.com","password":"Str0ng-Passphrase-2026!","permissions":[]}]}' \
  PORT=3100 \
  LOG_LEVEL=warn \
  node --experimental-strip-types --enable-source-maps --no-warnings src/server.ts &
SRV=$!
disown "$SRV" 2>/dev/null || true

# Aguarda /health ficar disponivel (max 30s, intervalo 500ms).
echo "[e2e-bruno-partners] Aguardando servidor em http://127.0.0.1:3100/health ..."
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:3100/health >/dev/null 2>&1; then
    echo "[e2e-bruno-partners] Servidor pronto."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "[e2e-bruno-partners] ERRO: servidor nao respondeu em 30s." >&2
    exit 1
  fi
  sleep 0.5
done

# Exporta a senha do seed para o bru CLI ler via {{process.env.E2E_SEED_PASSWORD}}.
export E2E_SEED_PASSWORD="Str0ng-Passphrase-2026!"

# Monta o comando bru run.
# O `bru` exige cwd = raiz da colecao (onde esta o bruno.json); `bru run <subpath>` falha com
# "You can run only at the root of a collection". Por isso entramos na colecao via subshell.
# --env local: usa environments/local.bru (baseUrl + emails). -r: recursivo (auth/, suppliers/, financiers/).
COLLECTION_DIR="api-collections/partners"
# -r: recursivo (auth/, suppliers/, financiers/, collaborators/, territory/).
# A ordem de execucao segue os numeros seq dentro de cada pasta; as pastas rodam na ordem
# em que o bru as descobre (alfabetica). auth/ tem seq 1-4, financiers/ 20-27,
# collaborators/ 30-42, territory/ 50-59.
BRU_ARGS=(run . --env local -r)

# Flags de reporte JUnit opcionais (E2E_JUNIT_REPORT=1) — caminho ABSOLUTO (cwd muda no subshell).
if [ "${E2E_JUNIT_REPORT:-0}" = "1" ]; then
  REPORT_DIR="$(pwd)/test-results"
  mkdir -p "$REPORT_DIR"
  BRU_ARGS+=(--reporter-junit "$REPORT_DIR/bruno-partners.xml")
  echo "[e2e-bruno-partners] Reporter JUnit ativo: $REPORT_DIR/bruno-partners.xml"
fi

echo "[e2e-bruno-partners] Executando: (cd $COLLECTION_DIR && bru ${BRU_ARGS[*]})"
( cd "$COLLECTION_DIR" && bru "${BRU_ARGS[@]}" )
