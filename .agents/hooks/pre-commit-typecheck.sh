#!/usr/bin/env bash
# Hook: PreToolUse (Bash git commit *)
# Roda 4 gates antes do commit: format → typecheck → lint → tests.
# Exit 0 = permite commit. Exit 2 = bloqueia commit.
#
# Inspirado em .claude/hooks/pre-commit-kodus.sh do projeto ACDG/frontend.

set -uo pipefail

# Skip cedo se não estiver em repo git (smoke test fora de repo, instalação inicial).
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "${REPO_ROOT}" ]; then
  exit 0
fi

CORE_API_DIR="${REPO_ROOT}/ERP-CONTRACTS"

# Se não estamos no core-api (ex: rodando em outro pacote do monorepo), passa.
if [ ! -f "${CORE_API_DIR}/tsconfig.json" ]; then
  exit 0
fi

# Só roda se houver mudanças staged em arquivos .ts dentro do core-api
STAGED_TS=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null \
  | grep -E '^ERP-CONTRACTS/.+\.tsx?$' \
  || true)
if [ -z "${STAGED_TS}" ]; then
  exit 0
fi

echo "" >&2
echo "🧪 Pre-commit checks (core-api) — format → typecheck → lint → tests" >&2
echo "" >&2

FAILED=0

# ---------------------------------------------------------------------------
# Resolver pnpm (preferido) ou fallback npx
# ---------------------------------------------------------------------------
PNPM_CMD=""
if command -v pnpm >/dev/null 2>&1; then
  PNPM_CMD="pnpm --dir=${CORE_API_DIR} --silent"
fi

run_pnpm_script() {
  local script="$1"
  local label="$2"
  if [ -n "${PNPM_CMD}" ]; then
    if ! ${PNPM_CMD} "${script}" 2>&1 | sed 's/^/    /' >&2; then
      echo "❌ ${label} falhou" >&2
      FAILED=1
    else
      echo "✅ ${label} OK" >&2
    fi
  else
    echo "⚠️  pnpm não encontrado — pulando ${label}" >&2
  fi
}

# ---------------------------------------------------------------------------
# Check 1 — Format check (Prettier, mais rápido)
# Bloqueia se algum arquivo está fora do estilo. Dev resolve com `pnpm format`.
# ---------------------------------------------------------------------------
echo "▶ [1/4] Format check (prettier --check)..." >&2
run_pnpm_script "format:check" "format"

# ---------------------------------------------------------------------------
# Check 2 — Type check (mais rápido a falhar dos type-aware)
# ---------------------------------------------------------------------------
echo "" >&2
echo "▶ [2/4] Type check (tsc --noEmit)..." >&2
run_pnpm_script "typecheck" "typecheck"

# ---------------------------------------------------------------------------
# Check 3 — Lint (ESLint + typescript-eslint)
# ---------------------------------------------------------------------------
echo "" >&2
echo "▶ [3/4] Lint (eslint)..." >&2
run_pnpm_script "lint" "lint"

# ---------------------------------------------------------------------------
# Check 4 — Tests (node:test + --experimental-strip-types)
# ---------------------------------------------------------------------------
HAS_TESTS=$(find "${CORE_API_DIR}/tests" -name '*.test.ts' -print -quit 2>/dev/null || true)
if [ -n "${HAS_TESTS}" ]; then
  echo "" >&2
  echo "▶ [4/4] Test run (node --test --experimental-strip-types)..." >&2
  run_pnpm_script "test" "tests"
else
  echo "" >&2
  echo "ℹ  [4/4] Nenhum arquivo *.test.ts encontrado em tests/ — pulando" >&2
fi

# ---------------------------------------------------------------------------
# Veredito
# ---------------------------------------------------------------------------
if [ "${FAILED}" -ne 0 ]; then
  echo "" >&2
  echo "🚫 BLOCKED: corrija os erros acima antes de commitar." >&2
  echo "   Bypass de emergência (NÃO recomendado): git commit --no-verify" >&2
  exit 2
fi

echo "" >&2
echo "🚀 Pre-commit OK — prosseguindo com o commit" >&2
exit 0
