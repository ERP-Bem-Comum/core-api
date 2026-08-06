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
#   - nenhum arquivo alterado                → exit 0 imediato
#   - só .md / .yaml / .sh / qualquer não-.ts → exit 0 (format já roda no PostToolUse)
#   - QUALQUER .ts, em qualquer diretório     → gate completo
#   - tsconfig.json, eslint.config.js, package.json → gate completo
#
# ⚠️ O escopo é o REPOSITÓRIO INTEIRO, não `src/` e `tests/`. Um `.ts` em `scripts/`,
# `db/drizzle/` ou na raiz dispara o gate igual — e deve mesmo: `scripts/ci/*.ts` roda em
# CI e `db/drizzle/*.ts` decide o que a migration gera. A versão anterior deste comentário
# dizia ".ts em src/ ou tests/" e omitia os três arquivos de config, descrevendo um recorte
# que o código nunca teve.
#
# Exit code:
#   0 → nada a verificar, ou gate verde
#   2 → gate vermelho: bloqueia o Stop e devolve o erro para o Claude corrigir

set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

LOGFILE=".claude/.last-quality-gate.log"
mkdir -p .claude

# O log é o único testemunho de que este hook rodou, e é truncado a cada execução
# (senão cresce sem limite). Por isso TODO caminho de saída registra seu veredito —
# inclusive os dois que não rodam gate nenhum. Antes, o truncamento acontecia aqui e
# as saídas antecipadas devolviam exit 0 sem escrever nada: um arquivo de zero byte
# não distinguia "gate passou" de "gate nem rodou", e o mtime recente dizia apenas
# que ALGO aconteceu. Com todo caminho registrado, zero byte passa a significar uma
# única coisa — o hook começou e morreu antes de decidir.
: > "$LOGFILE"
log() { printf '%s\n' "$*" >> "$LOGFILE"; }
log "=== Stop hook — $(date -Iseconds) ==="

# ── o que mudou desde o último commit (working tree + staged) ────────────────
changed=$(git status --porcelain 2>/dev/null | awk '{print $NF}')
if [ -z "$changed" ]; then
  log "veredito: NÃO SE APLICA — working tree limpa, nada a verificar."
  exit 0
fi

n_changed=$(printf '%s\n' "$changed" | wc -l | tr -d ' ')

needs_gate=0
while IFS= read -r f; do
  case "$f" in
    # `*.ts` casa QUALQUER caminho — em `case`, o `*` atravessa `/`. As alternativas
    # `src/*.ts|tests/*.ts|…` que existiam aqui eram código morto, subsumidas por ele.
    *.ts) needs_gate=1; break ;;
    tsconfig.json | eslint.config.js | package.json) needs_gate=1; break ;;
  esac
done <<< "$changed"

log "arquivos alterados: ${n_changed}"

if [ "$needs_gate" -eq 0 ]; then
  log "veredito: PULADO — nenhum alterado aciona o gate (sem .ts, tsconfig.json,"
  log "          eslint.config.js ou package.json). Formatação já rodou no PostToolUse."
  log ""
  log "alterados:"
  printf '%s\n' "$changed" | sed 's/^/  /' >> "$LOGFILE"
  exit 0
fi

# ── gate: os 4 comandos, na ordem mais barata primeiro ───────────────────────
log "veredito: EXECUTANDO — há .ts ou arquivo de config na lista."

failed=""
run() {
  local name="$1"; shift
  log ""
  log "── $name"
  if "$@" >> "$LOGFILE" 2>&1; then
    log "   ✓ verde"
  else
    log "   ✗ VERMELHO"
    failed="${failed}${name} "
  fi
}

run "typecheck"    pnpm run typecheck
run "format:check" pnpm run format:check
run "lint"         pnpm run lint
run "test"         pnpm test

if [ -z "$failed" ]; then
  log ""
  log "veredito: VERDE — typecheck, format:check, lint e test passaram."
  exit 0
fi

log ""
log "veredito: VERMELHO — falharam: ${failed}"

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
