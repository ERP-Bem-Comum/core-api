#!/usr/bin/env bash
#
# Sobe a borda HTTP com o ambiente de E2E aplicado por SOURCE, não por `--env-file`.
#
# POR QUE SOURCE. Medido em 14/10/2026, em três passos:
#
#   1. `--env-file` do Node não sobrescreve env de PROCESSO:
#        X_TESTE=do-ambiente node --env-file=arq.env -e 'console.log(process.env.X_TESTE)'
#        → do-ambiente
#   2. O overmind carrega o `.env` e o injeta como env de processo no filho.
#   3. O `.env` GERADO traz `AUTH_SEED_JSON=""` e `CORE_API_E2E="false"` — são variáveis
#      catalogadas, e o template as declara vazias/desligadas, que é o correto para ele.
#
# Resultado: o `--env-file=.tmp/e2e.env` não vencia, `AUTH_SEED_JSON` chegava VAZIO, e a guarda
# dupla de `parseE2eAuthSeed` devolvia `undefined` — o caminho correto de produção, onde o seed deve
# ser inerte. Nenhum erro, nenhum aviso: o sintoma aparecia 8 requests depois, como 401 por usuário
# inexistente. `set -a` + `.` exporta sobrescrevendo, e é a única forma que vence env de processo.
set -euo pipefail

# Dois níveis: este arquivo vive em `scripts/debug/`, e os caminhos abaixo são relativos à RAIZ.
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

set -a
# shellcheck source=/dev/null
. ./.tmp/e2e.env
set +a

exec node --enable-source-maps src/server.ts
