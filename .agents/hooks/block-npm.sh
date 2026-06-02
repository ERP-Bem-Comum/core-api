#!/usr/bin/env bash
# Claude Code hook — PreToolUse(Bash) — bloqueia comandos `npm`.
#
# Razão: o projeto usa pnpm canonicamente (ADR-0012). `npm install`/`npm run`
# corrompem o pnpm-lock.yaml e violam a política de supply-chain (ADR-0011).
#
# Stdin: JSON com `tool_name=Bash` + `tool_input.command=<string>`
# Stdout: JSON com hookSpecificOutput.permissionDecision (allow|deny)
#
# IMPORTANTE: a doc do Claude Code (hooks.md §304) diz que o `if: "Bash(npm *)"`
# em settings.json **sempre dispara quando o comando é complexo demais para
# parsear** (multilinha, loops, heredocs). Por isso este script TEM que validar
# o comando de novo internamente — não pode confiar que o `if` filtrou.
#
# Estratégia de detecção:
#   1. Lê command da stdin.
#   2. Procura `npm` como TOKEN ISOLADO (com word boundaries) — não substring.
#   3. Se achar, devolve `deny` com explicação pedagógica.
#   4. Caso contrário, exit 0 SEM JSON (= allow + sem mensagem extra).

set -euo pipefail

COMMAND=$(jq -r '.tool_input.CommandLine // .tool_input.command // ""')

# Detecção robusta de `npm` como token isolado:
#   - Início de linha + `npm ` → match
#   - Após `;`, `&&`, `||`, `|`, `&`, `(`, `\n` + opcional spaces + `npm ` → match
#   - `npx` (executor) é PERMITIDO — só `npm` mesmo é bloqueado.
#
# Regex aplicada (extended grep -E):
#   (^|[;&|()\n[:space:]])npm([[:space:]]|$)
#
# Casos cobertos:
#   ✗ npm install            → bloqueia
#   ✗ FOO=bar npm test       → bloqueia (após assignment)
#   ✗ pnpm test && npm test  → bloqueia (após &&)
#   ✗ (npm test)             → bloqueia (após paren)
#   ✓ npx prettier           → permite
#   ✓ pnpm install           → permite
#   ✓ name=$(basename foo)   → permite (assignment sem comando npm)

if echo "$COMMAND" | grep -qE '(^|[;&|()[:space:]])npm([[:space:]]|$)'; then
  read -r -d '' REASON <<'EOF' || true
Use `pnpm` em vez de `npm` neste projeto.

Razão canônica:
  • ADR-0012 (handbook/architecture/adr/0012-pnpm-package-manager.md) define
    pnpm como package manager único do core-api.
  • ADR-0011 (supply-chain hardening) exige --frozen-lockfile + approve-builds,
    workflow que só funciona com pnpm.
  • `npm install` regrava package-lock.json em paralelo, criando drift
    silencioso com pnpm-lock.yaml.

Substituições:
  npm install            →  pnpm install
  npm install <pkg>      →  pnpm add <pkg>
  npm install -D <pkg>   →  pnpm add -D <pkg>
  npm run <script>       →  pnpm run <script>   (ou apenas `pnpm <script>`)
  npm test               →  pnpm test
  npm exec <cmd>         →  pnpm exec <cmd>
  npx <cmd>              →  pnpm dlx <cmd>      (ou `pnpm exec <cmd>` se já instalado)
EOF

  jq -c -n \
    --arg name 'PreToolUse' \
    --arg dec 'deny' \
    --arg reason "$REASON" \
    --arg cmd "$COMMAND" \
    '{
      decision: $dec,
      reason: ($reason + "\n\nComando bloqueado:\n" + $cmd),
      hookSpecificOutput: {
        hookEventName: $name,
        permissionDecision: $dec,
        permissionDecisionReason: ($reason + "\n\nComando bloqueado:\n" + $cmd)
      }
    }'
  exit 0
fi

# Comando não usa npm — permite silenciosamente (exit 0 sem stdout JSON = allow).
exit 0
