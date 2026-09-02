#!/usr/bin/env bash
# Aplica as reescritas do bloco B (título novo + comentário) e do bloco C (só comentário).
#
# Uso:
#   ./01-reescritas.sh          # DRY-RUN: só imprime o que faria
#   ./01-reescritas.sh --apply  # executa de verdade
#
# Requer: gh autenticado com escrita no repositório.
set -euo pipefail

REPO="${REPO:-ERP-Bem-Comum/core-api}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPLY=0
[[ "${1:-}" == "--apply" ]] && APPLY=1

run() {
  if [[ $APPLY -eq 1 ]]; then "$@"; else printf '   [dry-run] '; printf '%q ' "$@"; echo; fi
}

# --- Bloco B: prefixo do título preservado + título novo + comentário ---
# O prefixo entre colchetes de cada issue é mantido; só a parte descritiva muda.
declare -A PREFIXO=(
  [787]="[financial] "
  [497]="[reports] "
  [407]="[deploy/infra] "
  [61]="[financial] "
  [59]="[financial] "
  [145]=""
)

echo "== Bloco B — título + comentário =="
while IFS=$'\t' read -r n titulo; do
  [[ -z "${n:-}" ]] && continue
  echo " #$n"
  run gh issue edit "$n" --repo "$REPO" --title "${PREFIXO[$n]}${titulo}"
  run gh issue comment "$n" --repo "$REPO" --body-file "$DIR/reescritas/comentarios/$n.md"
done < "$DIR/reescritas/titulos.tsv"

echo
echo "== Bloco C — só comentário de estado =="
for n in 839 756 634 808 406 291; do
  echo " #$n"
  run gh issue comment "$n" --repo "$REPO" --body-file "$DIR/reescritas/comentarios/$n.md"
done

echo
if [[ $APPLY -eq 0 ]]; then
  echo "Nada foi enviado. Rode com --apply para executar."
else
  echo "Feito. Confira: gh issue list --repo $REPO --limit 200"
fi
