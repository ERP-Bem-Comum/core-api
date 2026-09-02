#!/usr/bin/env bash
# PROPOSTA — não foi aprovada nem executada na sessão de 02/09.
#
# 1. Remove `needs-triage` das 55 issues que foram efetivamente triadas (cada uma tem
#    veredito e evidência em dados/issues-classificadas.csv).
# 2. Aplica labels nas 16 que estão sem label nenhuma — as sugestões em
#    dados/sem-label.tsv são um chute informado pelo título. REVISE ANTES.
#
# Uso:
#   ./02-labels.sh              # DRY-RUN
#   ./02-labels.sh --apply      # executa
set -euo pipefail
REPO="${REPO:-ERP-Bem-Comum/core-api}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPLY=0
[[ "${1:-}" == "--apply" ]] && APPLY=1
run(){ if [[ $APPLY -eq 1 ]]; then "$@"; else printf '   [dry-run] '; printf '%q ' "$@"; echo; fi; }

echo "== Removendo needs-triage das issues já triadas =="
tail -n +2 "$DIR/dados/needs-triage-a-remover.tsv" | while IFS=$'\t' read -r n acao titulo; do
  [[ -z "${n:-}" ]] && continue
  run gh issue edit "$n" --repo "$REPO" --remove-label needs-triage
done

echo
echo "== Aplicando labels nas issues sem label (REVISE ANTES) =="
tail -n +2 "$DIR/dados/sem-label.tsv" | while IFS=$'\t' read -r n labels titulo; do
  [[ -z "${n:-}" || "$labels" == "REVISAR" || "$labels" == *"JÁ APLICADA"* ]] && continue
  IFS=',' read -ra L <<< "$labels"
  args=(); for l in "${L[@]}"; do args+=(--add-label "$l"); done
  run gh issue edit "$n" --repo "$REPO" "${args[@]}"
done

echo
[[ $APPLY -eq 0 ]] && echo "Nada foi enviado. Rode com --apply." || echo "Feito."
