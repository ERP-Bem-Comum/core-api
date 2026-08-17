#!/usr/bin/env bash
# Claude Code hook — SessionStart — instala o hook de pre-commit deste clone.
#
# `core.hooksPath` é estado local em `.git/config`, não conteúdo versionado: clone novo não o traz,
# e sem ele NÃO HÁ hook de commit instalado. A política de regressão zero perde o backstop mecânico
# de commit sem que nada acuse — o repositório parece protegido e não está. O CLAUDE.md registrava
# isso como gotcha para o humano executar à mão uma vez por clone; regra cujo cumprimento depende de
# alguém lembrar não é enforcement, é esperança.
#
# Já houve incidente exatamente aqui: `tests/scripts/gate-blocker.test.ts` documenta a medição de
# 2026-07-29, quando `core.hooksPath` apontava para um `.githooks` que não existia na branch.
#
# stdout de um SessionStart vira contexto que o Claude lê (code.claude.com/docs/en/hooks). Por isso
# só escreve quando AGE: sessão em clone já configurado não gasta contexto dizendo "nada a fazer".
#
# Exit code: sempre 0 — este hook conserta ou avisa, nunca impede a sessão de começar.

set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

# Fora de repositório git, ou sem o diretório de hooks versionado, não há o que instalar.
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
[ -d .githooks ] || exit 0

atual=$(git config core.hooksPath 2>/dev/null || true)
[ "$atual" = ".githooks" ] && exit 0

if git config core.hooksPath .githooks 2>/dev/null; then
  printf 'core.hooksPath estava em "%s" e foi apontado para .githooks — o hook de pre-commit deste clone passou a existir.\n' \
    "${atual:-<vazio>}"
else
  printf 'AVISO: core.hooksPath está em "%s" e a correção automática falhou. Sem isso não há hook de pre-commit neste clone; rode `git config core.hooksPath .githooks`.\n' \
    "${atual:-<vazio>}" >&2
fi

exit 0
