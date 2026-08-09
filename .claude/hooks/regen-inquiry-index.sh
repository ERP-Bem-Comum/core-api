#!/usr/bin/env bash
# Regenera os derivados de `handbook/inquiries/` depois de escrever uma inquiry.
#
# Fase 1 da spec 041. O INDEX.md dizia "gerado a partir do disco" e era mantido à mão — este hook é
# metade do que torna a frase verdadeira (a outra metade é o gate em tests/cleanup/inquiry-hygiene).
#
# Falha ABERTA de propósito, ao contrário do adr-guard: aqui não há decisão de segurança em jogo.
# Se o gerador quebrar, o gate de teste acusa no fim do turno; travar a edição de um .md porque um
# script auxiliar falhou custaria mais do que protege.
#
# Não regenera quando o arquivo tocado É um derivado — senão o próprio `docs:index` reentra em loop
# através do PostToolUse do Write que ele mesmo faz.

set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0

case "$file" in
  */handbook/inquiries/INDEX.md | */handbook/inquiries/PERGUNTAS-EM-ABERTO.md) exit 0 ;;
  */handbook/inquiries/[0-9][0-9][0-9][0-9]-*.md) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
node --experimental-strip-types --no-warnings scripts/handbook/inquiry-index.ts >/dev/null 2>&1

exit 0
