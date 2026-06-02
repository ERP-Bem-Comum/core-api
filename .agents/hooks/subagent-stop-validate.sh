#!/usr/bin/env bash
# Claude Code hook — SubagentStop — detecta interrupção prematura do contratos-orchestrator.
#
# Por quê: Bug #47936 — sub-agents stoppam mid-task em ~14-30% das execuções com
# `stop_reason: null`. Quando isso acontece, o REPORT/STATE da wave NÃO é escrito,
# mas o SDK ainda reporta "completed" ao main. Este hook é executado no main session
# quando o subagent termina (premature ou not), inspeciona o filesystem e o
# transcript JSONL para diagnosticar.
#
# Stdin: JSON SubagentStop event (campos: agent_type, agent_id, transcript_path, etc.)
# Stdout: texto plano que vira contexto para o main session
# Exit code: 0 sempre (não bloqueante)
#
# Saída: grava resumo em `.claude/.last-subagent-stop.log` e emite resumo no stdout.

set -uo pipefail

PROJECT_DIR="${GEMINI_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"
LOG_FILE="${PROJECT_DIR}/.claude/.last-subagent-stop.log"
PIPELINE_DIR="${PROJECT_DIR}/.claude/.pipeline"

# Ler stdin (JSON do evento SubagentStop)
STDIN=$(cat 2>/dev/null || true)

# Extrair campos relevantes (best-effort; jq pode não estar disponível)
AGENT_TYPE=$(echo "$STDIN" | grep -oE '"agent_type":[ ]*"[^"]+"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || echo "unknown")
AGENT_ID=$(echo "$STDIN" | grep -oE '"agent_id":[ ]*"[^"]+"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || echo "unknown")
TRANSCRIPT_PATH=$(echo "$STDIN" | grep -oE '"transcript_path":[ ]*"[^"]+"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || echo "")

# Só aplica análise ao contratos-orchestrator (outros agents não seguem o protocolo W0→W3)
if [[ "$AGENT_TYPE" != "contratos-orchestrator" ]]; then
  exit 0
fi

# Identificar ticket ativo (heurística: pasta com STATE.md mais recentemente modificado)
ACTIVE_TICKET=""
if [[ -d "$PIPELINE_DIR" ]]; then
  ACTIVE_TICKET=$(find "$PIPELINE_DIR" -maxdepth 2 -name STATE.md -type f 2>/dev/null \
    | xargs -I{} stat -f "%m %N" {} 2>/dev/null \
    | sort -rn \
    | head -1 \
    | awk '{print $2}' \
    | xargs dirname 2>/dev/null \
    | xargs basename 2>/dev/null)
fi

TICKET_DIR="${PIPELINE_DIR}/${ACTIVE_TICKET}"

# Identificar a wave em andamento (heurística: primeira wave com REPORT/REVIEW ausente)
WAVE=""
WAVE_DIR=""
for w in "002-tests" "003-impl" "004-code-review" "005-quality"; do
  if [[ -d "${TICKET_DIR}/${w}" ]] && [[ ! -f "${TICKET_DIR}/${w}/REPORT.md" ]] && [[ ! -f "${TICKET_DIR}/${w}/REVIEW.md" ]]; then
    WAVE="$w"
    WAVE_DIR="${TICKET_DIR}/${w}"
    break
  fi
done

# Análise do transcript — verificar se último turn tem stop_reason: null
PREMATURE_STOP="unknown"
LAST_STOP_REASON=""
LAST_TOOL_USE=""
if [[ -f "$TRANSCRIPT_PATH" ]]; then
  LAST_STOP_REASON=$(grep -oE '"stop_reason":[ ]*"?[a-z_]*"?' "$TRANSCRIPT_PATH" 2>/dev/null | tail -1 | sed 's/.*: *"\?\([a-z_]*\)"\?$/\1/' || echo "")
  LAST_TOOL_USE=$(grep -oE '"name":"[A-Z][a-zA-Z]+"' "$TRANSCRIPT_PATH" 2>/dev/null | tail -1 | sed 's/.*"\([A-Z][a-zA-Z]*\)"$/\1/' || echo "")
  case "$LAST_STOP_REASON" in
    end_turn|max_tokens|stop_sequence) PREMATURE_STOP="no" ;;
    null|"") PREMATURE_STOP="LIKELY YES (stop_reason ausente — Bug #47936)" ;;
    *) PREMATURE_STOP="indeterminate (stop_reason=$LAST_STOP_REASON)" ;;
  esac
fi

# Verificar artefatos de fechamento da wave
REPORT_MISSING="unknown"
STATE_UPDATED="unknown"
if [[ -n "$WAVE_DIR" ]]; then
  if [[ -f "${WAVE_DIR}/REPORT.md" ]] || [[ -f "${WAVE_DIR}/REVIEW.md" ]]; then
    REPORT_MISSING="no"
  else
    REPORT_MISSING="YES (REPORT/REVIEW da wave ${WAVE} ausente)"
  fi
fi
if [[ -f "${TICKET_DIR}/STATE.md" ]]; then
  # Heurística: STATE foi atualizado se "completed" aparece com a wave em curso
  if [[ "$WAVE" == "002-tests" ]] && grep -q "W0 — RED | ✅ completed" "${TICKET_DIR}/STATE.md" 2>/dev/null; then
    STATE_UPDATED="yes"
  elif [[ "$WAVE" == "003-impl" ]] && grep -q "W1 — GREEN | ✅ completed" "${TICKET_DIR}/STATE.md" 2>/dev/null; then
    STATE_UPDATED="yes"
  elif [[ "$WAVE" == "004-code-review" ]] && grep -q "W2 — REVIEW | ✅" "${TICKET_DIR}/STATE.md" 2>/dev/null; then
    STATE_UPDATED="yes"
  elif [[ "$WAVE" == "005-quality" ]] && grep -q "W3 — QUALITY | ✅" "${TICKET_DIR}/STATE.md" 2>/dev/null; then
    STATE_UPDATED="yes"
  else
    STATE_UPDATED="NO (STATE.md não marca wave atual como completed)"
  fi
fi

# Gravar log persistente
{
  echo "==== SubagentStop @ $(date -u +%Y-%m-%dT%H:%M:%SZ) ===="
  echo "agent_type:     ${AGENT_TYPE}"
  echo "agent_id:       ${AGENT_ID}"
  echo "ticket:         ${ACTIVE_TICKET:-none-detected}"
  echo "wave:           ${WAVE:-none-detected}"
  echo "transcript:     ${TRANSCRIPT_PATH:-none}"
  echo "last_stop_reason: ${LAST_STOP_REASON:-none}"
  echo "last_tool_use:  ${LAST_TOOL_USE:-none}"
  echo "premature_stop: ${PREMATURE_STOP}"
  echo "report_missing: ${REPORT_MISSING}"
  echo "state_updated:  ${STATE_UPDATED}"
  echo ""
} > "$LOG_FILE"

# Stdout (vira contexto pro main session)
if [[ "$PREMATURE_STOP" == LIKELY* ]] || [[ "$REPORT_MISSING" == YES* ]] || [[ "$STATE_UPDATED" == NO* ]]; then
  cat <<EOF
[subagent-stop-validate] ⚠️  Possível interrupção prematura do sub-agent detectada.
  - Ticket: ${ACTIVE_TICKET:-?}
  - Wave: ${WAVE:-?}
  - last_stop_reason: ${LAST_STOP_REASON:-(vazio — sinal de Bug #47936)}
  - last_tool_use: ${LAST_TOOL_USE:-?}
  - REPORT/REVIEW da wave: ${REPORT_MISSING}
  - STATE.md atualizado: ${STATE_UPDATED}
  - Log completo: .claude/.last-subagent-stop.log
Ação recomendada: verificar transcript ${TRANSCRIPT_PATH:-?}, fechar a wave administrativamente (rodar gate + escrever REPORT + atualizar STATE), e considerar retentar o sub-agent só pra trabalho técnico restante.
EOF
fi

exit 0
