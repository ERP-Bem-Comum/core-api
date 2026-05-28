#!/usr/bin/env bash
# Claude Code hook — Stop — typecheck final em background.
#
# Por quê: a sessão pode terminar com `tsc --noEmit` quebrado e o dev só
# descobrir muito depois (ou só em W3). Este hook roda `pnpm run typecheck`
# em background no fim do turno; se quebrar, escreve um aviso em
# `.claude/.last-stop-typecheck.log` e imprime stderr (que vira system
# reminder pro Claude no próximo turno via `asyncRewake`).
#
# Stdin: JSON do evento Stop (não usamos campos específicos)
# Exit code:
#   0  → tudo verde (Claude não vê nada)
#   2  → typecheck falhou (com `async: true`, isso vira reminder não-bloqueante
#        no próximo turno se `asyncRewake: true` — aqui usamos só `async`,
#        então só registra log)

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

LOGFILE=".claude/.last-stop-typecheck.log"
mkdir -p .claude

# Cabeçalho com timestamp.
{
  echo "=== Stop hook typecheck — $(date -Iseconds) ==="
} > "$LOGFILE"

# Roda typecheck; captura stdout+stderr no log.
if pnpm run typecheck >> "$LOGFILE" 2>&1; then
  echo "✓ typecheck verde" >> "$LOGFILE"
  exit 0
fi

# Typecheck falhou. Imprime no stderr (pode aparecer pro dev no terminal) e
# preserva o log pra inspeção manual.
{
  echo ""
  echo "⚠️  typecheck falhou no Stop hook — inspecione:"
  echo "    $LOGFILE"
  echo ""
} >&2

# Exit 0 pra não bloquear o Stop (decisão consciente: hook async + non-blocking).
# Se quiser fazer Claude saber, troque `async: true` por `asyncRewake: true`
# em .claude/settings.json e devolva exit 2 aqui.
exit 0
