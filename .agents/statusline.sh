#!/usr/bin/env bash
# Statusline do ERP-CONTRACTS — duas linhas com:
#   L1: [Modelo] 📁 dir | 🌿 branch | 🎫 ticket-ativo | 🔀 PR#N (status)
#   L2: barra-contexto-colorida | cache-hit-% | cost | rate-limits-5h/7d
#
# Doc: handbook/reference/claude-code/statusline.md
# Performance: cacheia git status + ticket-ativo por 5s usando session_id.

set -euo pipefail

input="$(cat)"

# --- helpers ---
get() { echo "$input" | jq -r "$1 // empty"; }
geti() { echo "$input" | jq -r "$1 // 0" | cut -d. -f1; }
getf() { echo "$input" | jq -r "$1 // 0"; }

# --- campos básicos ---
MODEL=$(get '.model.display_name')
DIR=$(get '.workspace.current_dir')
SESSION_ID=$(get '.session_id')
SESSION_NAME=$(get '.session_name')

# --- ticket ativo + git (cacheado 5s por session) ---
# Formato do cache (uma linha por campo, sufixo `-` indica vazio para evitar
# colapso de tabs adjacentes no `read`):
#   BRANCH=<valor ou ->
#   TICKET=<valor ou ->
#   STAGED=<n>
#   MODIFIED=<n>
CACHE_FILE="/tmp/erp-statusline-${SESSION_ID:-unknown}"
CACHE_MAX_AGE=5

cache_is_stale() {
  [ ! -f "$CACHE_FILE" ] && return 0
  local now mtime
  now=$(date +%s)
  mtime=$(stat -f %m "$CACHE_FILE" 2>/dev/null || stat -c %Y "$CACHE_FILE" 2>/dev/null || echo 0)
  [ $((now - mtime)) -gt $CACHE_MAX_AGE ]
}

if cache_is_stale; then
  BRANCH=""
  TICKET=""
  STAGED=0
  MODIFIED=0
  if git -C "$DIR" rev-parse --git-dir >/dev/null 2>&1; then
    BRANCH=$(git -C "$DIR" branch --show-current 2>/dev/null || true)
    STAGED=$(git -C "$DIR" diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
    MODIFIED=$(git -C "$DIR" diff --numstat 2>/dev/null | wc -l | tr -d ' ')
  fi
  # Ticket ativo: primeiro STATE.md em .claude/.pipeline/ cuja primeira ocorrência
  # de "OPEN" (no resumo do topo) vem antes de "CLOSED".
  PIPELINE_DIR="$DIR/.claude/.pipeline"
  if [ -d "$PIPELINE_DIR" ]; then
    for state in $(ls -t "$PIPELINE_DIR"/*/STATE.md 2>/dev/null | head -8); do
      header=$(head -10 "$state" 2>/dev/null || true)
      if echo "$header" | grep -qE '\bOPEN\b' && ! echo "$header" | grep -qE '\bCLOSED\b'; then
        TICKET=$(basename "$(dirname "$state")")
        break
      fi
    done
  fi
  {
    printf 'BRANCH=%s\n' "${BRANCH:--}"
    printf 'TICKET=%s\n' "${TICKET:--}"
    printf 'STAGED=%s\n' "${STAGED:-0}"
    printf 'MODIFIED=%s\n' "${MODIFIED:-0}"
  } > "$CACHE_FILE"
fi

# shellcheck disable=SC1090
. "$CACHE_FILE"
[ "$BRANCH" = "-" ] && BRANCH=""
[ "$TICKET" = "-" ] && TICKET=""
STAGED=${STAGED:-0}
MODIFIED=${MODIFIED:-0}

# --- contexto ---
PCT=$(geti '.context_window.used_percentage')
CACHE_READ=$(getf '.context_window.current_usage.cache_read_input_tokens')
CACHE_WRITE=$(getf '.context_window.current_usage.cache_creation_input_tokens')
FRESH_INPUT=$(getf '.context_window.current_usage.input_tokens')

# Cache hit ratio: cache_read / (cache_read + cache_write + fresh_input)
TOTAL_INPUT=$(awk "BEGIN {print $CACHE_READ + $CACHE_WRITE + $FRESH_INPUT}")
if [ "$(awk "BEGIN {print ($TOTAL_INPUT > 0)}")" = "1" ]; then
  HIT_PCT=$(awk "BEGIN {printf \"%.0f\", ($CACHE_READ / $TOTAL_INPUT) * 100}")
else
  HIT_PCT="--"
fi

# --- custo + tempo ---
COST=$(getf '.cost.total_cost_usd')
DUR_MS=$(geti '.cost.total_duration_ms')
DUR_MIN=$((DUR_MS / 60000))
DUR_SEC=$(((DUR_MS % 60000) / 1000))

# --- rate limits (só Pro/Max) ---
RL5H=$(get '.rate_limits.five_hour.used_percentage')
RL7D=$(get '.rate_limits.seven_day.used_percentage')

# --- PR ---
PR_NUM=$(get '.pr.number')
PR_STATE=$(get '.pr.review_state')

# --- effort ---
EFFORT=$(get '.effort.level')

# --- cores ANSI ---
RESET='\033[0m'
DIM='\033[2m'
BOLD='\033[1m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
MAGENTA='\033[35m'
BLUE='\033[34m'

# Cor da barra de contexto: verde < 70%, amarelo 70-89%, vermelho >= 90%
PCT=${PCT:-0}
if [ "$PCT" -ge 90 ]; then
  BAR_COLOR="$RED"
elif [ "$PCT" -ge 70 ]; then
  BAR_COLOR="$YELLOW"
else
  BAR_COLOR="$GREEN"
fi

# Barra de 10 chars
FILLED=$((PCT / 10))
EMPTY=$((10 - FILLED))
BAR=""
if [ $FILLED -gt 0 ]; then
  printf -v FILL "%${FILLED}s"
  BAR="${FILL// /█}"
fi
if [ $EMPTY -gt 0 ]; then
  printf -v PAD "%${EMPTY}s"
  BAR="${BAR}${PAD// /░}"
fi

# Cor do PR
PR_COLOR="$DIM"
PR_ICON="●"
case "$PR_STATE" in
  approved) PR_COLOR="$GREEN" ;;
  pending) PR_COLOR="$YELLOW" ;;
  changes_requested) PR_COLOR="$RED" ;;
  draft) PR_COLOR="$DIM" ;;
esac

# --- Montagem L1 ---
L1="${CYAN}${BOLD}[$MODEL]${RESET}"
[ -n "$EFFORT" ] && L1="$L1 ${DIM}(effort:$EFFORT)${RESET}"
L1="$L1 ${DIM}📁${RESET} ${DIR##*/}"
if [ -n "$BRANCH" ]; then
  GIT_BIT="${GREEN}🌿 $BRANCH${RESET}"
  [ "${STAGED:-0}" -gt 0 ] && GIT_BIT="$GIT_BIT ${GREEN}+${STAGED}${RESET}"
  [ "${MODIFIED:-0}" -gt 0 ] && GIT_BIT="$GIT_BIT ${YELLOW}~${MODIFIED}${RESET}"
  L1="$L1 │ $GIT_BIT"
fi
if [ -n "$TICKET" ]; then
  L1="$L1 │ ${MAGENTA}🎫 $TICKET${RESET}"
fi
if [ -n "$SESSION_NAME" ]; then
  L1="$L1 │ ${BLUE}📛 $SESSION_NAME${RESET}"
fi
if [ -n "$PR_NUM" ]; then
  L1="$L1 │ ${PR_COLOR}🔀 PR#${PR_NUM} ${PR_ICON}${RESET}"
fi

# --- Montagem L2 ---
COST_FMT=$(awk "BEGIN {printf \"\$%.3f\", $COST}")
L2="${BAR_COLOR}${BAR}${RESET} ${PCT}%"
L2="$L2 │ ${DIM}cache${RESET} ${HIT_PCT}%"
L2="$L2 │ ${YELLOW}${COST_FMT}${RESET}"
L2="$L2 │ ${DIM}⏱${RESET} ${DUR_MIN}m${DUR_SEC}s"
if [ -n "$RL5H" ] || [ -n "$RL7D" ]; then
  RL_BIT=""
  [ -n "$RL5H" ] && RL_BIT="5h:${RL5H%.*}%"
  [ -n "$RL7D" ] && RL_BIT="${RL_BIT:+$RL_BIT }7d:${RL7D%.*}%"
  L2="$L2 │ ${DIM}quota${RESET} $RL_BIT"
fi

printf '%b\n%b\n' "$L1" "$L2"
