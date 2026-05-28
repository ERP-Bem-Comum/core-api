#!/usr/bin/env bash
# Claude Code hook — UserPromptSubmit — injeta contexto do ticket ativo.
#
# Por quê: cada sessão hoje começa do zero. Claude precisa rodar `cat
# .claude/.pipeline/<TICKET>/STATE.md` manualmente para saber em qual ticket
# está. Este hook automatiza — detecta o ticket mais recente (último modificado
# em .claude/.pipeline/) e injeta um resumo de 1 parágrafo do STATE.md no
# contexto antes do prompt rodar.
#
# Heurística "ticket ativo":
#   1. Procura ticket cujo STATE.md tem status pending/in_progress.
#   2. Se nenhum, pega o ticket modificado mais recentemente.
#   3. Se .claude/.pipeline/ vazio → no-op silencioso.
#
# Stdin: JSON UserPromptSubmit (não usamos `prompt` field, mas poderia)
# Stdout: texto plano = additionalContext injetado pelo Claude Code
# Exit code: 0 sempre (não bloqueante)

set -uo pipefail

PIPELINE_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/.pipeline"

# Sem pasta de pipeline = sem ticket = no-op silencioso.
if [[ ! -d "$PIPELINE_DIR" ]]; then
  exit 0
fi

# Acha ticket "ativo": prioridade 1 = STATE.md com pending/in_progress;
# prioridade 2 = ticket modificado mais recentemente (mtime).
ACTIVE=""

# Prioridade 1: pending/in_progress
for state in "$PIPELINE_DIR"/*/STATE.md; do
  [[ -f "$state" ]] || continue
  if grep -qE "(⏳ pending|🔄 in.progress|in_progress)" "$state" 2>/dev/null; then
    ACTIVE=$(dirname "$state")
    break
  fi
done

# Prioridade 2: fallback para ticket mais recente
if [[ -z "$ACTIVE" ]]; then
  ACTIVE=$(ls -td "$PIPELINE_DIR"/*/ 2>/dev/null | head -1)
  ACTIVE="${ACTIVE%/}"
fi

# Nenhum ticket encontrado.
if [[ -z "$ACTIVE" || ! -d "$ACTIVE" ]]; then
  exit 0
fi

TICKET_NAME=$(basename "$ACTIVE")
STATE_FILE="$ACTIVE/STATE.md"
REQUEST_FILE="$ACTIVE/000-request.md"

# Sem STATE.md útil → injetar só ponteiro.
if [[ ! -f "$STATE_FILE" ]]; then
  cat <<EOF
[ticket-context] Pipeline mais recente: \`$TICKET_NAME\` (sem STATE.md). Veja \`.claude/.pipeline/$TICKET_NAME/\`.
EOF
  exit 0
fi

# Extrai primeira linha de status (linha que começa com "> ") + tabela de waves
# se existir. Truncar pra não inflar o context window.
STATUS_LINE=$(grep -m1 "^>" "$STATE_FILE" | head -c 300)
WAVES=$(grep -E "^\| W[0-3]" "$STATE_FILE" 2>/dev/null | head -4)

# Header com pointer para arquivos relevantes.
cat <<EOF
[ticket-context] Pipeline ativa detectada: \`$TICKET_NAME\`

**Resumo:** $STATUS_LINE

**Waves:**
\`\`\`
$WAVES
\`\`\`

**Arquivos do ticket:**
- \`.claude/.pipeline/$TICKET_NAME/000-request.md\` — escopo + CAs
- \`.claude/.pipeline/$TICKET_NAME/STATE.md\` — estado atual
$([[ -f "$ACTIVE/002-tests/REPORT.md" ]] && echo "- \`.claude/.pipeline/$TICKET_NAME/002-tests/REPORT.md\` — W0")
$([[ -f "$ACTIVE/003-impl/REPORT.md" ]] && echo "- \`.claude/.pipeline/$TICKET_NAME/003-impl/REPORT.md\` — W1")
$([[ -f "$ACTIVE/004-code-review/REVIEW.md" ]] && echo "- \`.claude/.pipeline/$TICKET_NAME/004-code-review/REVIEW.md\` — W2")
$([[ -f "$ACTIVE/005-quality/REPORT.md" ]] && echo "- \`.claude/.pipeline/$TICKET_NAME/005-quality/REPORT.md\` — W3")

(Este contexto foi injetado automaticamente pelo hook \`UserPromptSubmit\` em \`.claude/hooks/inject-ticket-context.sh\`. Se este ticket NÃO é o foco da sessão atual, basta ignorar e seguir.)
EOF

exit 0
