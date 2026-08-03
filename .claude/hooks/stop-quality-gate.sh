#!/usr/bin/env bash
# Claude Code hook — Stop — gate de qualidade BLOQUEANTE (o antigo W3).
#
# Substitui a wave W3 da pipeline: em vez de uma skill que escreve REPORT.md
# afirmando verde, este hook roda o gate e devolve exit 2 se algo falhar —
# o turno não termina até passar. Claude Code libera após 8 bloqueios
# consecutivos, então isso não trava a sessão para sempre.
#
# Custo controlado: o gate completo leva minutos, e o Stop dispara a cada
# turno. O hook decide sozinho o que rodar, pelo que mudou:
#   - nada em src/tests/config  → exit 0 imediato (turno de conversa/doc)
#   - só .md                    → exit 0 (format já roda no PostToolUse)
#   - .ts em src/ ou tests/     → gate completo
#
# Exit code:
#   0 → nada a verificar, ou gate verde
#   2 → gate vermelho: bloqueia o Stop e devolve o erro para o Claude corrigir

set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

LOGFILE=".claude/.last-quality-gate.log"
mkdir -p .claude
: > "$LOGFILE"

# ── o que mudou desde o último commit (working tree + staged) ────────────────
changed=$(git status --porcelain 2>/dev/null | awk '{print $NF}')
[ -z "$changed" ] && exit 0

needs_gate=0
while IFS= read -r f; do
  case "$f" in
    src/*.ts|tests/*.ts|src/*/*.ts|tests/*/*.ts|*.ts) needs_gate=1; break ;;
    tsconfig.json|eslint.config.js|package.json)      needs_gate=1; break ;;
  esac
done <<< "$changed"

[ "$needs_gate" -eq 0 ] && exit 0

# ── gate: os 4 comandos, na ordem mais barata primeiro ───────────────────────
{
  echo "=== gate de qualidade (Stop hook) — $(date -Iseconds) ==="
  echo "arquivos alterados: $(echo "$changed" | wc -l | tr -d ' ')"
} >> "$LOGFILE"

failed=""
run() {
  local name="$1"; shift
  echo "" >> "$LOGFILE"
  echo "── $name" >> "$LOGFILE"
  if "$@" >> "$LOGFILE" 2>&1; then
    echo "   ✓ verde" >> "$LOGFILE"
  else
    echo "   ✗ VERMELHO" >> "$LOGFILE"
    failed="${failed}${name} "
  fi
}

run "typecheck"    pnpm run typecheck
run "format:check" pnpm run format:check
run "lint"         pnpm run lint
run "test"         pnpm test

[ -z "$failed" ] && exit 0

# ── vermelho: bloqueia e entrega o diagnóstico ───────────────────────────────
{
  echo ""
  echo "🔴 GATE DE QUALIDADE VERMELHO — turno bloqueado."
  echo ""
  echo "Falharam: ${failed}"
  echo ""
  echo "Política de regressão zero: vermelho é regressão a corrigir AGORA, tenha"
  echo "ou não sido causado por esta mudança. Três saídas aceitáveis:"
  echo "  1. consertar a causa;"
  echo "  2. corrigir o gate que classifica errado — e PROVAR o verde no caminho certo;"
  echo "  3. escalar ao humano com causa-raiz, explicitamente."
  echo ""
  echo "Saída completa: ${LOGFILE}"
  tail -30 "$LOGFILE"
} >&2

exit 2
