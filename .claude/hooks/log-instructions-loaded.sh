#!/usr/bin/env bash
# Claude Code hook — InstructionsLoaded — testemunho de quais instruções entraram em contexto.
#
# As 16 rules de `.claude/rules/` carregam por path-matching (`paths:`), e isso é invisível de
# dentro da sessão: ninguém consegue afirmar, olhando para trás, se a rule de `domain/` chegou a
# valer quando o arquivo foi editado. A dúvida é concreta — a auditoria de 2026-08-17 gastou meia
# investigação para decidir se aquelas rules eram carregadas por alguma coisa ou eram letra morta.
#
# Com este log, "essa regra estava carregada?" deixa de ser suposição e vira consulta.
#
# Grava o JSON do stdin sem interpretá-lo: a doc oficial fixa os valores de matcher do evento
# (session_start, nested_traversal, path_glob_match, include, compact) mas ainda não fixa o schema
# do payload. Inventar campos aqui seria criar mais um artefato afirmando o que não conferiu.
#
# Exit code: sempre 0 — observabilidade nunca bloqueia o trabalho.

set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

LOGFILE=".claude/.last-instructions.log"
mkdir -p .claude

payload=$(cat 2>/dev/null || true)
[ -z "$payload" ] && exit 0

printf '%s\t%s\n' "$(date -Iseconds)" "$payload" >> "$LOGFILE"

# Teto de tamanho: isto é testemunho recente, não arquivo histórico. Sem o corte, um log de evento
# assíncrono cresce sem limite e cala justamente quando alguém precisa dele.
linhas=$(wc -l < "$LOGFILE" 2>/dev/null || echo 0)
if [ "$linhas" -gt 500 ]; then
  tail -200 "$LOGFILE" > "${LOGFILE}.tmp" 2>/dev/null && mv "${LOGFILE}.tmp" "$LOGFILE"
fi

exit 0
