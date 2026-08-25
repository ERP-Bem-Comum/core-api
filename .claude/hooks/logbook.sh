#!/usr/bin/env bash
# Claude Code hook — diário de bordo da sessão (SessionStart, SessionEnd, PreCompact, PostCompact,
# Stop). Uma linha JSON por evento, para que "a sessão caiu, o que aconteceu?" seja consulta e não
# arqueologia.
#
# ─── Por que existe ──────────────────────────────────────────────────────────────────────────────
#
# Em 18/08/2026 uma sessão morreu com `API Error: 529 Overloaded` no meio de um Edit. Descobrir
# isso custou garimpar um transcript de 5,1 MB em `~/.claude/projects/**.jsonl` — o dado estava
# lá, misturado a todo o conteúdo da conversa. O diário separa o que é OPERAÇÃO da sessão do que é
# CONVERSA: início, fim, compactações, turnos. É pouco byte e responde direto.
#
# ⚠️ O sinal mais importante deste arquivo é uma AUSÊNCIA. Sessão que caiu não emite `SessionEnd` —
# ela simplesmente para. Uma sessão cujo último evento é `session_start` ou `stop`, sem
# `session_end`, morreu; o timestamp do último evento é a hora do óbito, para cruzar com
# status.claude.com ou com o horário de um incidente. Ver `scripts/claude/logbook.ts`.
#
# Não registra conteúdo de prompt nem de ferramenta: diário é sobre a operação da sessão, e log que
# duplica a conversa vira mais um lugar onde dado sensível vaza.
#
# Exit code: sempre 0 — observabilidade nunca bloqueia o trabalho.

set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

# `.log` já é coberto pelo `*.log` do .gitignore — diário é estado local, nunca versionado.
LOGFILE=".claude/.session-logbook.log"
mkdir -p .claude

payload=$(cat 2>/dev/null || true)
[ -z "$payload" ] && exit 0

SESSION=$(printf '%s' "$payload" | jq -r '.session_id // ""' 2>/dev/null || echo '')
[ -z "$SESSION" ] && exit 0
EVENT=$(printf '%s' "$payload" | jq -r '.hook_event_name // "unknown"' 2>/dev/null || echo 'unknown')

# Contexto de git só no início — é o que situa a sessão ("qual branch eu estava mexendo?"). Repetir
# a cada turno seria custo de processo por evento sem informação nova.
BRANCH=''
HEAD=''
if [ "$EVENT" = 'SessionStart' ]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')
  HEAD=$(git rev-parse --short HEAD 2>/dev/null || echo '')
fi

jq -c -n \
  --arg ts "$(date -Iseconds)" \
  --arg session "$SESSION" \
  --arg event "$EVENT" \
  --arg source "$(printf '%s' "$payload" | jq -r '.source // .trigger // .reason // ""' 2>/dev/null || echo '')" \
  --arg version "${CLAUDE_CODE_VERSION:-}" \
  --arg branch "$BRANCH" \
  --arg head "$HEAD" \
  '{ts: $ts, session: $session, event: $event}
   + (if $source  == "" then {} else {source:  $source}  end)
   + (if $version == "" then {} else {version: $version} end)
   + (if $branch  == "" then {} else {branch:  $branch}  end)
   + (if $head    == "" then {} else {head:    $head}    end)' >> "$LOGFILE" 2>/dev/null

# Teto de tamanho: isto é testemunho recente, não arquivo histórico — mesma disciplina do
# `.last-instructions.log`. Sem o corte, o diário cresce sem limite e fica ilegível justamente
# quando alguém precisa dele.
linhas=$(wc -l < "$LOGFILE" 2>/dev/null || echo 0)
if [ "$linhas" -gt 2000 ]; then
  tail -1000 "$LOGFILE" > "${LOGFILE}.tmp" 2>/dev/null && mv "${LOGFILE}.tmp" "$LOGFILE"
fi

exit 0
