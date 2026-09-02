#!/usr/bin/env bash
# Confere o estado atual contra a classificação da triagem de 02/09.
# Útil para saber o que mudou desde então antes de aplicar qualquer coisa.
set -euo pipefail
REPO="${REPO:-ERP-Bem-Comum/core-api}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Issues abertas agora:"
gh issue list --repo "$REPO" --state open --limit 300 --json number --jq 'length'

echo
echo "Das 27 fechadas em 02/09, alguma foi reaberta?"
for n in 798 792 690 681 923 893 894 895 896 569 525 505 502 466 335 268 135 129 117 114 113 95 63 62 897 864 892; do
  s=$(gh issue view "$n" --repo "$REPO" --json state --jq .state)
  [[ "$s" != "CLOSED" ]] && echo "  ⚠ #$n está $s"
done
echo "  (silêncio acima = todas seguem fechadas)"

echo
echo "A branch do fix da #879 voltou ao remoto?"
if gh api "repos/$REPO/branches/fix/convenio-legado-879" >/dev/null 2>&1; then
  echo "  ✓ sim — dá para abrir o PR: gh pr create --repo $REPO --base dev --head fix/convenio-legado-879"
else
  echo "  ✗ não. O commit 1837299e1caaf20c9869f7db10875706f72d3522 segue solto."
  echo "    git fetch origin 1837299e1caaf20c9869f7db10875706f72d3522"
  echo "    git branch fix/convenio-legado-879 1837299e1caaf20c9869f7db10875706f72d3522"
  echo "    git push -u origin fix/convenio-legado-879"
fi
