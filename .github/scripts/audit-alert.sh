#!/usr/bin/env bash
# Alerta do audit agendado — chamado pelo job `scheduled` do `.github/workflows/audit.yml`.
#
#   open   vermelho: abre a issue de alerta, ou comenta na que já está aberta (dedup)
#   close  verde: fecha a issue aberta, se houver
#
# Evolução do alerta que existia (#633): mesmo dedup pelo marcador estável do título — `gh issue create`
# não é idempotente, e foi assim que o #368 abriu 14 issues idênticas — e o mesmo Discord best-effort.
# O que muda: a issue nasce ATRIBUÍDA (o GitHub manda e-mail na hora; sem responsável, a #1087 ficou
# aberta sem ninguém agir) e o marcador leva a branch, porque o agendado agora audita main E dev.
#
# Env: GH_TOKEN, REF (branch auditada), RUN_URL, ASSIGNEES (logins separados por vírgula, só no open),
#      AUDIT_OUT (relatório do audit-gate.sh), DEADMAN_DISCORD_WEBHOOK (opcional).
set -uo pipefail

action="${1:?use open ou close}"
marker="[audit-prod:${REF}] advisories high/critical em dependência de produção"

existing="$(gh issue list --state open --search "\"${marker}\" in:title" --json number --jq '.[0].number' 2>/dev/null || true)"

if [ "$action" = "close" ]; then
  if [ -n "$existing" ]; then
    gh issue close "$existing" --comment "✅ \`audit --prod\` da \`${REF}\` voltou a verde em $(date -u +%Y-%m-%d). Run: ${RUN_URL}" \
      || echo "::warning::falha ao fechar a #${existing}"
  fi
  exit 0
fi

pkgs="$(grep -oE '^│ (high|critical) +│ [^│]+' "${AUDIT_OUT:-/dev/null}" 2>/dev/null | sed -E 's/^│ +([a-z]+) +│ +(.*[^ ]) *$/- **\1** — \2/' | sort -u | head -30)"
if [ -z "$pkgs" ]; then
  pkgs="- (sem lista: o registry pode ter ficado indisponível — ver o log do run)"
fi

body="$(printf '%s\n\n%s\n\n%s\n\n%s\n\n%s\n' \
  "O \`audit --prod\` agendado da **\`${REF}\`** falhou em **$(date -u +%Y-%m-%d)**." \
  'Achados (título do advisory):' \
  "$pkgs" \
  "Como tratar: atualizar para a versão em *Patched versions* respeitando \`minimumReleaseAge\` e \`trustPolicy\` do \`pnpm-workspace.yaml\` (nunca contornar), PR para a \`dev\`, depois promoção." \
  "Run: ${RUN_URL}")"

if [ -n "$existing" ]; then
  gh issue comment "$existing" --body "$body" || echo "::warning::falha ao comentar na #${existing}"
  echo "::notice::alerta anexado à issue #${existing} (dedup)"
else
  gh issue create --title "🔴 ${marker}" --body "$body" \
    --label "seguranca,needs-triage" --assignee "${ASSIGNEES:-}" \
    || echo "::warning::falha ao abrir a issue de alerta"
fi

# Discord é o empurrão (best-effort); a issue é o registro auditável. Falha dele não suprime nada.
if [ -n "${DEADMAN_DISCORD_WEBHOOK:-}" ]; then
  curl -fsS -X POST "$DEADMAN_DISCORD_WEBHOOK" -H 'Content-Type: application/json' \
    -d "$(jq -nc --arg c "🔴 audit --prod vermelho na ${REF} — ${RUN_URL}" '{content:$c}')" \
    >/dev/null || echo "::warning::Discord não notificado (best-effort)"
fi

# O passo de alerta não pode mascarar a falha do audit.
exit 1
