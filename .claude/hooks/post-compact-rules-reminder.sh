#!/usr/bin/env bash
# Claude Code hook — PostCompact — devolve à sessão a lista de rules que a compactação derrubou.
#
# ─── O problema, medido (2026-08-18, Claude Code 2.1.234) ────────────────────────────────────────
#
# As rules de `.claude/rules/` entram por `load_reason: path_glob_match`, disparado quando uma
# ferramenta dedicada (Read/Edit/Write) toca um arquivo que casa com o glob. A compactação limpa o
# contexto — e o testemunho local diz que elas NÃO voltam: em `.claude/.last-instructions.log`,
# 6 sessões produziram 14 `session_start` + 14 `path_glob_match` e **zero** eventos com
# `load_reason: compact`, apesar de 4 compactações registradas nos transcripts.
#
# `compact` É um valor documentado do matcher de `InstructionsLoaded`
# (https://code.claude.com/docs/en/hooks.md — `session_start`, `nested_traversal`,
# `path_glob_match`, `include`, `compact`). O que se mediu aqui é que, para rule carregada por
# glob, ele não dispara. Divergência entre o documentado e o observado: registrada, não resolvida
# escolhendo o lado mais conveniente.
#
# Efeito prático: o agente começa a sessão aderente e degrada depois da primeira compactação, sem
# que nada o avise. Foi a queixa que originou esta investigação.
#
# ─── O que este hook faz ─────────────────────────────────────────────────────────────────────────
#
# Lê o próprio testemunho (`.last-instructions.log`), descobre quais rules estavam valendo NESTA
# sessão, e devolve a lista com a instrução de reinjeção. Não tenta recarregar a rule — não existe
# forma suportada de fazer isso sem tocar um arquivo do glob; o que existe é avisar quem pode.
#
# ⚠️ Incerteza honesta: a doc lista `additionalContext` entre os campos de saída, mas a seção que
# detalha QUAIS eventos o honram vem truncada na página. Se `PostCompact` não o honrar, o
# `systemMessage` garante que ao menos o humano veja o aviso. Um dos dois chega.
#
# Indício de que o humano é o destinatário mais provável aqui: na tabela de comportamento do
# exit code 2, `PostCompact` é descrito como "Shows stderr to user only" — o canal deste evento
# aponta para fora, não para o modelo. O aviso foi escrito para servir aos dois leitores.
#
# `session_id` NÃO é chute: a doc o lista entre os campos comuns que TODO evento recebe
# (session_id, prompt_id, transcript_path, cwd, permission_mode, effort, hook_event_name, e
# agent_id/agent_type em subagente) — "in addition to event-specific fields". Ainda assim o hook
# silencia se vier vazio: lembrete que falha aberto é ruído, e ruído é o que faz desligarem gate.
#
# Exit code: sempre 0 — lembrete nunca bloqueia trabalho.

set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

LOGFILE=".claude/.last-instructions.log"
[ -r "$LOGFILE" ] || exit 0

payload=$(cat 2>/dev/null || true)
SESSION=$(printf '%s' "$payload" | jq -r '.session_id // ""' 2>/dev/null || echo '')
[ -z "$SESSION" ] && exit 0

# O evento vem do payload, não hardcoded: este mesmo script está registrado em DOIS eventos, e
# devolver o nome errado em `hookEventName` é o tipo de erro que falha em silêncio.
#
# Por que dois: a existência de `PostCompact` está em disputa. Duas leituras da doc oficial o
# citam ("After context compaction completes"; e "Shows stderr to user only" na tabela de exit 2);
# uma terceira não o encontrou. Não há prova empírica — compactar de propósito para medir custaria
# o contexto da sessão. Já `SessionStart` com matcher `compact` é confirmado pelas TRÊS leituras
# ("startup, resume, clear, compact, fork"), e cobre o mesmo instante: a sessão retomando depois
# da compactação. Registrar nos dois faz o lembrete sobreviver a qualquer um dos lados estar
# errado — e se ambos dispararem, o pior caso é o aviso sair duas vezes.
EVENT=$(printf '%s' "$payload" | jq -r '.hook_event_name // "PostCompact"' 2>/dev/null || echo 'PostCompact')

# Rules desta sessão que entraram por glob — únicas, na ordem em que apareceram.
RULES=$(
  cut -f2 "$LOGFILE" 2>/dev/null |
    jq -r --arg s "$SESSION" \
      'select(.session_id == $s and .load_reason == "path_glob_match") | .file_path' 2>/dev/null |
    sed 's|.*/\.claude/rules/||' |
    awk '!seen[$0]++'
)

[ -z "$RULES" ] && exit 0

LISTA=$(printf '%s' "$RULES" | sed 's/^/  • /')
N=$(printf '%s\n' "$RULES" | grep -c .)

CONTEXTO="⚠️ A compactação derrubou ${N} rule(s) de .claude/rules/ que estavam valendo nesta sessão:

${LISTA}

Elas NÃO são reinjetadas automaticamente (medido: zero eventos load_reason=compact em 4
compactações). Antes de continuar a mexer nos caminhos que essas rules cobrem, toque um
arquivo do glob com Read — é o que dispara o path_glob_match e traz a regra de volta.
Conferir se voltou: a última linha de .claude/.last-instructions.log."

jq -c -n \
  --arg name "$EVENT" \
  --arg ctx "$CONTEXTO" \
  --arg msg "Compactação derrubou ${N} rule(s) do projeto — releia um arquivo do glob para recarregar." \
  '{
    hookSpecificOutput: {
      hookEventName: $name,
      additionalContext: $ctx
    },
    systemMessage: $msg
  }'

exit 0
