#!/usr/bin/env bash
# Gate de tombstone — Fase 2 da spec 041.
#
# Recusa o commit que apaga ou renomeia um `.md` ainda citado por outro documento, sem declarar o
# destino (ou a lápide) em handbook/redirects.json.
#
# POR QUE NÃO VIVE NO pre-commit-typecheck.sh: aquele gate sai cedo quando não há `.ts` staged, e o
# commit que apaga só documentação é exatamente o que ele nunca inspecionaria. Este roda antes dele,
# a partir do .githooks/pre-commit.
#
# CUSTO: o filtro barato mora aqui. Só invoca o node quando o diff staged tem `.md` deletado ou
# renomeado — o caso raro. Commit comum não paga nada além de um `git diff --cached`.
#
# Exit 0 = segue. Exit != 0 = commit recusado. Escape: git commit --no-verify.

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -z "${REPO_ROOT}" ] && exit 0
[ -f "${REPO_ROOT}/tsconfig.json" ] || exit 0

REMOVED=$(git diff --cached --diff-filter=DR --name-only 2>/dev/null | grep -E '\.md$' || true)
[ -z "${REMOVED}" ] && exit 0

NODE_BIN="$(command -v node || true)"
if [ -z "${NODE_BIN}" ]; then
  # Fail-closed, mesmo critério do "pnpm ausente" no gate de qualidade: um portão que não
  # conseguiu decidir não deve liberar. O caminho é raro e o escape está documentado.
  echo "❌ pre-commit: node não encontrado no PATH — o gate de tombstone não pôde rodar." >&2
  echo "   Se for deliberado: git commit --no-verify" >&2
  exit 1
fi

exec "${NODE_BIN}" --experimental-strip-types --no-warnings \
  "${REPO_ROOT}/scripts/handbook/tombstone.ts"
