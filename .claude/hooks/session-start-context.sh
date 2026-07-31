#!/usr/bin/env bash
# Claude Code hook — SessionStart — injeta resumo do estado do projeto.
#
# Dispara no início de cada sessão, fornecendo uma visão estratégica única
# para Claude se orientar no boot.
#
# Stdout: vira contexto adicional na primeira mensagem do usuário.
# Exit code: 0 sempre (não bloqueante).

set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
PLANNING_DIR="${PROJECT_DIR}/.claude/.planning"

# 1. Detectar planejamento pausado
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

# 2. Stats git (commits ahead se há remote)
git_summary=""
if git -C "$PROJECT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "?")
  modified=$(git -C "$PROJECT_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  git_summary="branch=$branch · arquivos modificados=$modified"
fi

# 3. Emitir contexto
cat <<EOF
[session-context] Estado do projeto ao iniciar sessão:

- **Git:** ${git_summary:-sem repo}
EOF

if [[ -n "$planning_pending" ]]; then
  echo "- **Planejamento pausado** (aguardando decisão):"
  echo -e "$planning_pending"
fi

cat <<EOF

Padrões ativos:
- Fluxo spec-driven em \`specs/<feature>/\` (\`/speckit-specify\` → \`plan\` → \`tasks\` → \`implement\`)
- Gate de qualidade: \`pnpm run typecheck\` + \`format:check\` + \`lint\` + \`test\`
- Série Outbox MySQL (ADR-0015) entregue — ver \`.claude/.planning/OUTBOX-MYSQL.md\` para histórico

EOF

exit 0
