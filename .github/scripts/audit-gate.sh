#!/usr/bin/env bash
# Gate de auditoria de dependências — chamado pelo `.github/workflows/audit.yml`.
# Mesma política do ADR-0023 do web-app (espelho no backend: mesma lógica do `.github/scripts/audit-gate.sh` de lá).
#
#   --prod  só dependencies de runtime; sai 1 em high/critical  → BLOQUEIA (check obrigatório)
#   --all   todas as deps, inclusive dev; nunca sai 1           → RELATÓRIO (anota warning)
#
# Distingue achado de indisponibilidade pelo próprio relatório do pnpm: achado real imprime
# "N vulnerabilities found"; erro de rede (registry fora do ar) não imprime. Achado reprova na hora;
# rede tenta de novo e, esgotadas as tentativas, reprova com a causa explícita — FALHA FECHADA.
# Nunca use `--ignore-registry-errors` aqui: ele sai 0 sem ter auditado nada.
set -uo pipefail

mode="${1:---prod}"
args=(audit --audit-level=high)
case "$mode" in
  --prod) args+=(--prod) ;;
  --all) ;;
  *) echo "::error::modo desconhecido: $mode (use --prod ou --all)"; exit 2 ;;
esac

# AUDIT_OUT: onde o relatório fica para o passo de alerta ler (o audit.yml aponta para o RUNNER_TEMP).
out="${AUDIT_OUT:-$(mktemp)}"
for attempt in 1 2 3; do
  pnpm "${args[@]}" >"$out" 2>&1
  code=$?
  cat "$out"

  if [ "$code" -eq 0 ]; then
    echo "✅ nenhuma vulnerabilidade high/critical ($mode)."
    exit 0
  fi

  if grep -qE '[0-9]+ vulnerabilit(y|ies) found' "$out"; then
    summary="$(grep -E '^Severity:' "$out" | tail -1)"
    if [ "$mode" = "--all" ]; then
      echo "::warning title=audit (todas as deps)::${summary:-há vulnerabilidades} — relatório, não bloqueia."
      exit 0
    fi
    echo "::error title=audit (produção)::${summary:-vulnerabilidade high/critical} em dependência de PRODUÇÃO. Atualize para a versão corrigida (ver 'Patched versions' acima)."
    exit 1
  fi

  echo "::warning::registry de advisories indisponível (tentativa ${attempt}/3) — nova tentativa em 20s."
  sleep 20
done

if [ "$mode" = "--all" ]; then
  echo "::warning::registry indisponível — relatório completo não gerado nesta execução."
  exit 0
fi
echo "::error title=audit (produção)::registry de advisories indisponível após 3 tentativas. O gate NÃO aprova sem auditar — rode o job de novo."
exit 1
