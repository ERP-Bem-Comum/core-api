#!/usr/bin/env bash
# Claude Code hook — PostToolUse(Edit|Write) — aplica Prettier no arquivo tocado.
#
# Por quê: nos últimos tickets (CTR-SHARED-IMMUTABLE, CTR-DOMAIN-TAGGED-ERRORS)
# o W3 detectou drift de Prettier que W1/W2 deixaram passar. Esta heurística
# elimina a classe inteira no momento certo — logo após o Edit/Write.
#
# Stdin: JSON com `tool_input.file_path=<absolute path>`
# Estratégia:
#   1. Extrai file_path.
#   2. Filtra: só roda em arquivos que o Prettier reconhece (`.ts`, `.tsx`,
#      `.js`, `.json`, `.md`, `.yaml`, etc).
#   3. Skip silencioso se arquivo está em `node_modules/`, `.pipeline/`,
#      `handbook/reference/` (cópia offline da doc — não auto-formatar).
#   4. Roda `npx prettier --write --ignore-unknown <file>` com timeout curto.
#   5. Sucesso → exit 0 (Claude não vê nada). Falha → exit 0 mas printa stderr
#      (não bloqueia o turno; só sinaliza).

set -uo pipefail

FILE=$(jq -r '.tool_input.file_path // ""')

# Sem file_path? Ignora (alguns Edit/Write podem não ter este campo).
if [[ -z "$FILE" || "$FILE" == "null" ]]; then
  exit 0
fi

# Arquivo não existe mais? (Write seguido de delete acontece raramente.)
if [[ ! -f "$FILE" ]]; then
  exit 0
fi

# Pasta-blocklist: não auto-formatar nesses paths.
case "$FILE" in
  */node_modules/*) exit 0 ;;
  */\.git/*)        exit 0 ;;
  */\.pipeline/*)   exit 0 ;;
  */handbook/reference/*) exit 0 ;;
  */dist/*)         exit 0 ;;
  */build/*)        exit 0 ;;
esac

# Extensão-allowlist: Prettier conhece bem essas.
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.jsonc|*.md|*.mdx|*.yaml|*.yml|*.html|*.css|*.scss) ;;
  *) exit 0 ;;  # qualquer outra extensão → skip
esac

# Roda Prettier; ignora código de saída pra não bloquear o turno (apenas log).
if ! npx --no-install prettier --write --ignore-unknown --log-level warn "$FILE" 2>&1 | grep -v '^$' >&2; then
  # Prettier não instalado ou erro real — silencioso (não atrapalha o Claude).
  :
fi

exit 0
