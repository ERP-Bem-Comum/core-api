#!/usr/bin/env bash
# Claude Code hook — PreToolUse(Bash) — Bash não LÊ nem ESCREVE arquivo de código deste repositório.
#
# ─── A medição que originou este hook (2026-08-18, Claude Code 2.1.234) ──────────────────────────
#
# As 16 rules de `.claude/rules/` entram em contexto por `load_reason: path_glob_match`, e o gatilho
# é a FERRAMENTA DEDICADA — não o conteúdo lido. Experimento controlado, testemunhado pelo hook
# `InstructionsLoaded` em `.claude/.last-instructions.log`:
#
#   head -15 src/shared/kernel/cnpj.ts   (Bash)  → log NÃO cresce. Nenhuma rule carregada.
#   Read do MESMO arquivo                        → {"load_reason":"path_glob_match",
#                                                   "file_path":".../rules/domain.md",
#                                                   "trigger_file_path":".../shared/kernel/cnpj.ts"}
#
# Ou seja: o agente que lê o código por `cat` opera **sem o harness**. Não é desleixo de julgamento
# — é mecânica. E é silencioso: nada na sessão denuncia que a regra de domínio não estava valendo
# quando o arquivo foi editado. O modo `auto` do Claude Code induz exatamente esse padrão, porque
# instrui a preferir Bash (`cat`, `sed -n`, heredoc) às ferramentas dedicadas.
#
# O segundo vazamento é o `PostToolUse`: o matcher em `settings.json` é `Edit|Write`. Escrita por
# `sed -i` ou `> arquivo.ts` escapa do `prettier-write.sh`, e o `format:check` reprova depois, no
# Stop — longe da causa.
#
# ─── Escopo, e o que deliberadamente NÃO é bloqueado ─────────────────────────────────────────────
#
# O alvo é a SUBSTITUIÇÃO de Read/Edit/Write por shell, não o shell. Um gate que recusasse
# `grep`, `jq` ou `git show` seria desligado na primeira semana — e gate desligado não protege nada.
# Por isso:
#   • leitura só é recusada quando o comando EXIBE o arquivo e nada mais (sem `|`, sem `>`);
#     `cat x.ts | jq`, `head x.ts | grep foo` continuam liberados — ali o shell processa, não lê.
#   • só arquivos que o Prettier conhece e que as rules cobrem. `.log`, `.txt`, `.pdf`, `.sh`,
#     `.sql`, `.env` não entram: `cat .claude/.last-quality-gate.log` é trabalho legítimo.
#   • caminho fora do repositório (absoluto que não começa no CLAUDE_PROJECT_DIR, ou `/tmp/…`)
#     passa sempre — o scratchpad da sessão é o lugar certo para arquivo temporário.
#
# ⚠️ Tensão registrada: `tests/scripts/block-inline-interpreter.test.ts` documenta
# `sed -i '' 's/a/b/' f.ts` como ALLOW. Continua verdade PARA AQUELE hook, cujo alvo é o
# interpretador improvisado. Aqui o alvo é outro — `sed -i` num `.ts` fura o Prettier igual ao
# `perl -0pi` que causou o dano de 14/08. Os dois hooks decidem coisas diferentes sobre o mesmo
# comando; quem manda é a união dos dois.
#
# Stdin: JSON com `tool_name=Bash` + `tool_input.command=<string>`
# Stdout: JSON com hookSpecificOutput.permissionDecision (deny) — vazio = allow silencioso.
#
# ⚠️ Os quatro hooks do `PreToolUse`/`Bash` rodam EM PARALELO ("All matching hooks run in
# parallel" — https://code.claude.com/docs/en/hooks.md), e a doc NÃO especifica como vereditos
# conflitantes se combinam. Aqui isso não morde por desenho: nenhum dos quatro emite
# `permissionDecision: "allow"` explícito — ou recusam, ou saem em silêncio. Só há um veredito
# possível em jogo, então a união dos hooks é bem definida. Quem for acrescentar um `allow`
# explícito a qualquer um deles precisa resolver a combinação antes.

set -uo pipefail

COMMAND=$(jq -r '.tool_input.command // ""')
[ -z "$COMMAND" ] && exit 0

# shellcheck source=./lib/heredoc.sh
. "${BASH_SOURCE[0]%/*}/lib/heredoc.sh"

# Corpo de heredoc não é comando — ver lib/heredoc.sh. A mensagem de commit que descreve este gate
# não pode ser bloqueada por ele.
SCAN=$(printf '%s' "$COMMAND" | strip_heredoc_bodies)

# Extensões que o Prettier formata E que as rules cobrem por glob. Fora daqui, o hook se cala.
CODE_EXT='(ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|mdx|yaml|yml|html|css|scss)'

# Posição de comando: início da string ou depois de um separador — nunca por substring, para não
# repetir o erro reincidente desta base (acusar a MENÇÃO em vez do USO).
ASSIGN='([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*'
CMD_POS="(^|[;&|(]|&&|\\|\\|)[[:space:]]*${ASSIGN}"

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Há algum token que aponte para arquivo de código DESTE repositório?
#
# Externo passa: caminho absoluto que não começa no projeto, e qualquer coisa sob /tmp. É por isso
# que o scratchpad da sessão continua utilizável sem atrito.
targets_repo_code() {
  local token
  for token in $(printf '%s' "$SCAN" | tr '|&;<>()' '\n' | tr ' \t' '\n'); do
    case "$token" in
      *.[a-zA-Z]*) ;;
      *) continue ;;
    esac
    printf '%s' "$token" | grep -qE "\.${CODE_EXT}$" || continue
    case "$token" in
      /tmp/* | /private/tmp/* | */node_modules/*) continue ;;
      /*) [ "${token#"$PROJECT_DIR"}" = "$token" ] && continue ;;
    esac
    return 0
  done
  return 1
}

BLOCKED=''
ALTERNATIVE=''

# ── ESCRITA ──────────────────────────────────────────────────────────────────────────────────────
# Redirecionamento para arquivo de código, `sed -i`, `tee`. Todos furam o PostToolUse.
if printf '%s' "$SCAN" | grep -qE ">>?[[:space:]]*[^[:space:]|&;]+\.${CODE_EXT}([[:space:]]|$)" && targets_repo_code; then
  BLOCKED='redirecionamento (`>` ou `>>`) para arquivo de código'
  ALTERNATIVE='Write (arquivo inteiro) ou Edit (trecho)'
elif printf '%s' "$SCAN" | grep -qE "${CMD_POS}sed[[:space:]]+(-[a-zA-Z0-9]*[[:space:]]+)*-?[a-zA-Z0-9]*i" && targets_repo_code; then
  BLOCKED='`sed -i` sobre arquivo de código'
  ALTERNATIVE='Edit (old_string/new_string)'
elif printf '%s' "$SCAN" | grep -qE "${CMD_POS}tee([[:space:]]|$)" && targets_repo_code; then
  BLOCKED='`tee` gravando arquivo de código'
  ALTERNATIVE='Write'

# ── LEITURA ──────────────────────────────────────────────────────────────────────────────────────
# Só quando o comando EXIBE o arquivo e nada mais. Presença de `|` significa processamento — ali o
# shell está fazendo o que sabe fazer, e Grep/jq não têm equivalente em ferramenta dedicada.
elif [[ "$SCAN" != *"|"* ]] && printf '%s' "$SCAN" | grep -qE "${CMD_POS}(cat|head|tail|less|more|bat)([[:space:]]|$)" && targets_repo_code; then
  BLOCKED='leitura de arquivo de código por Bash'
  ALTERNATIVE='Read (offset/limit para trecho)'
elif [[ "$SCAN" != *"|"* ]] && printf '%s' "$SCAN" | grep -qE "${CMD_POS}sed[[:space:]]+-n" && targets_repo_code; then
  BLOCKED='leitura de trecho por `sed -n`'
  ALTERNATIVE='Read (offset/limit)'
fi

[ -z "$BLOCKED" ] && exit 0

read -r -d '' REASON <<'EOF' || true
Use as ferramentas dedicadas (Read/Edit/Write) para arquivo de código deste repositório.

Por que este hook existe — medido, não suposto:
  • As 16 rules de `.claude/rules/` carregam por `path_glob_match`, e QUEM DISPARA é a
    ferramenta dedicada. `head arquivo.ts` via Bash não carrega rule nenhuma; o `Read`
    do mesmo arquivo carrega na hora. Lendo por Bash, você trabalha SEM o harness — e
    nada na sessão avisa. Testemunho: `.claude/.last-instructions.log`.
  • Escrita por `sed -i` / `>` fura o PostToolUse (matcher `Edit|Write`), então o
    Prettier não roda e o `format:check` reprova depois, longe da causa.

Substituições:
  ler arquivo / trecho          →  Read (offset/limit)
  editar trecho                 →  Edit (old_string/new_string)
  reescrever arquivo inteiro    →  Write
  buscar padrão                 →  Grep

Continua liberado, de propósito:
  • processar em pipeline: `cat x.ts | jq …`, `head x.ts | grep foo`, `wc -l x.ts`
  • ver versão do git: `git show HEAD:caminho.ts`, `git diff`
  • qualquer coisa fora do repositório e sob /tmp (use o scratchpad da sessão)
  • arquivos que não são código: `.log`, `.txt`, `.sh`, `.sql`, `.env`, PDFs
EOF

jq -c -n \
  --arg name 'PreToolUse' \
  --arg dec 'deny' \
  --arg reason "$REASON" \
  --arg what "$BLOCKED" \
  --arg alt "$ALTERNATIVE" \
  --arg cmd "$COMMAND" \
  '{
    hookSpecificOutput: {
      hookEventName: $name,
      permissionDecision: $dec,
      permissionDecisionReason: ($reason + "\n\nDetectado: " + $what + "\nUse: " + $alt + "\n\nComando bloqueado:\n" + $cmd)
    }
  }'

exit 0
