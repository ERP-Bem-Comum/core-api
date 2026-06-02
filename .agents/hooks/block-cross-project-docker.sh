#!/usr/bin/env bash
# Claude Code hook — PreToolUse(Bash) — isolamento core-api <-> legacy.
#
# Razão: o Docker tem UM daemon por máquina, compartilhado por todos os chats.
# Não existe parede por diretório — `docker ps`/`prune`/`rm` de qualquer chat
# atingem o daemon global. Este hook impede que ESTE chat (core-api):
#   1. rode comandos docker mirando recursos do LEGACY (containers erp-mysql /
#      erp-backend, projeto compose erp-backend, db legacy_app, paths legacy*);
#   2. rode prunes GLOBAIS (system/builder/buildx/image/volume/network/
#      container prune), que varrem TODOS os projetos de uma vez.
#
# Stdin : JSON com tool_input.command (string).
# Stdout: JSON com hookSpecificOutput.permissionDecision="deny" ao bloquear;
#         exit 0 sem stdout = allow.
#
# O espelho deste hook vive em legacy-project/.claude/hooks/ e bloqueia o
# sentido inverso (chats do legacy mirando o core-api).

set -euo pipefail

COMMAND=$(jq -r '.tool_input.CommandLine // .tool_input.command // ""')

# Só comandos docker interessam — o resto passa direto.
case "$COMMAND" in
  *docker*) ;;
  *) exit 0 ;;
esac

deny() {
  jq -c -n \
    --arg name 'PreToolUse' \
    --arg reason "$1" \
    --arg cmd "$COMMAND" \
    '{
      decision: "deny",
      reason: ($reason + "\n\nComando bloqueado:\n" + $cmd),
      hookSpecificOutput: {
        hookEventName: $name,
        permissionDecision: "deny",
        permissionDecisionReason: ($reason + "\n\nComando bloqueado:\n" + $cmd)
      }
    }'
  exit 0
}

# 1) Prunes globais — atingem TODOS os projetos da máquina, não só o core-api.
if echo "$COMMAND" | grep -qE 'docker[[:space:]]+(system|builder|buildx|image|volume|network|container)[[:space:]]+prune'; then
  deny "Prune GLOBAL do Docker é proibido em chats de projeto: ele afeta TODOS os projetos da máquina (o legacy inclusive), não só o core-api.

Para limpar apenas o core-api, derrube o stack pelo nome do projeto compose:
  docker compose -p core-api-dev down        # para os containers
  docker compose -p core-api-dev down -v     # + remove o volume core-api-mysql-data

Limpeza global de cache/imagens só deve ser feita fora de um chat de projeto, com intenção explícita."
fi

# 2) Comandos mirando recursos do LEGACY.
if echo "$COMMAND" | grep -qiE '(erp-mysql|erp-backend|legacy-api|legacy-project|legacy_app|/bem_comum/legacy)'; then
  deny "Este chat é do projeto CORE-API e não pode rodar comandos docker mirando o legacy.

Os recursos do legacy (containers erp-mysql / erp-backend, projeto compose erp-backend, db legacy_app) são gerenciados em um chat do legacy. Mexa neles de lá."
fi

exit 0
