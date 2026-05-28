#!/usr/bin/env bash
# Claude Code hook — SessionStart — injeta resumo do estado do projeto.
#
# Dispara no início de cada sessão. Complementa `inject-ticket-context.sh`
# (que dispara em cada user prompt) fornecendo uma visão estratégica única
# para Claude se orientar no boot.
#
# Stdout: vira contexto adicional na primeira mensagem do usuário.
# Exit code: 0 sempre (não bloqueante).

set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
PIPELINE_DIR="${PROJECT_DIR}/.claude/.pipeline"
PLANNING_DIR="${PROJECT_DIR}/.claude/.planning"

# 1. Contar tickets fechados vs abertos
closed_count=0
open_count=0
last_closed=""

if [[ -d "$PIPELINE_DIR" ]]; then
  while IFS= read -r state_file; do
    # Casa formato canônico (`Status:** closed-green|closed-rejected`) e legado (`CLOSED`).
    if grep -qiE "status:\*\* +closed|\\bCLOSED\\b" "$state_file" 2>/dev/null; then
      closed_count=$((closed_count + 1))
      ticket_name=$(basename "$(dirname "$state_file")")
      last_closed="$ticket_name"
    # Casa formato canônico (`Status:** open|in-progress`) e legado (`> **OPEN`).
    elif grep -qiE "status:\*\* +(open|in-progress)|^> \*\*OPEN" "$state_file" 2>/dev/null; then
      open_count=$((open_count + 1))
    fi
  done < <(find "$PIPELINE_DIR" -maxdepth 2 -name STATE.md -type f 2>/dev/null)
fi

# 2. Detectar planejamento pausado
planning_pending=""
if [[ -d "$PLANNING_DIR" ]]; then
  for plan in "$PLANNING_DIR"/*.md; do
    [[ -f "$plan" ]] || continue
    # Restringe match às primeiras 15 linhas (cabeçalho do plan) para evitar falso-positivo
    # com "aguardando"/"pausado" no corpo do documento.
    if head -15 "$plan" 2>/dev/null | grep -qiE "pausado|aguardando" 2>/dev/null; then
      planning_pending+="  - $(basename "$plan")\n"
    fi
  done
fi

# 3. Stats git (commits ahead se há remote)
git_summary=""
if git -C "$PROJECT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "?")
  modified=$(git -C "$PROJECT_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  git_summary="branch=$branch · arquivos modificados=$modified"
fi

# 4. Emitir contexto
cat <<EOF
[session-context] Estado do projeto ao iniciar sessão:

- **Pipeline:** $closed_count tickets CLOSED · $open_count abertos · último fechado: ${last_closed:-nenhum}
- **Git:** ${git_summary:-sem repo}
EOF

if [[ -n "$planning_pending" ]]; then
  echo "- **Planejamento pausado** (aguardando decisão):"
  echo -e "$planning_pending"
fi

cat <<EOF

Padrões ativos:
- Pipeline W0→W3 fail-first em \`.claude/.pipeline/<ticket>/\`
- Sub-agent \`contratos-orchestrator\` (Opus + checklist + Bug #47936 mitigado via maxTurns + SubagentStop hook)
- Série Outbox MySQL (ADR-0015) entregue — ver \`.claude/.planning/OUTBOX-MYSQL.md\` para histórico

EOF

exit 0
