#!/usr/bin/env bash
# Claude Code hook — PreToolUse(Bash) — bloqueia interpretador inline (python/perl) para editar
# arquivo ou processar texto.
#
# Razão: o agente tem Edit/Write, que passam pelos PostToolUse (prettier), respeitam o estado de
# leitura do arquivo e falham alto quando o alvo não bate. Um `python3 - <<'PY'` que reescreve
# arquivo contorna tudo isso e já produziu edição silenciosamente errada nesta base — um `perl -0pi`
# de "adicionar campo aos fakes" acertou uns pontos, duplicou outros, e só o typecheck acusou.
#
# Vale também para a preferência registrada do Gabriel: script utilitário nunca em Python.
#
# Stdin: JSON com `tool_name=Bash` + `tool_input.command=<string>`
# Stdout: JSON com hookSpecificOutput.permissionDecision (allow|deny)
#
# IMPORTANTE (mesma nota do block-npm.sh): o `if:` do settings.json é best-effort e FALHA ABERTO —
# https://code.claude.com/docs/en/hooks, §"Common fields": "The filter also fails open, running your
# hook regardless of pattern, when the Bash command can't be parsed." Comando não-parseável é
# justamente a forma dos casos que este hook existe para pegar (heredoc, loop, multilinha), então
# este script roda SEM `if` registrado e a validação aqui dentro é a que vale.

set -euo pipefail

COMMAND=$(jq -r '.tool_input.command // ""')

# Detecção em POSIÇÃO DE COMANDO, não por substring. `python` só é bloqueado quando inicia um
# comando: começo da string, ou depois de um separador (`;`, `&&`, `||`, `|`, `(`, nova linha).
#
# Isto é deliberado para não repetir o erro clássico de varredura desta base — acusar a MENÇÃO em
# vez do USO. Casos:
#   ✗ python3 - <<'PY'          → bloqueia (início)
#   ✗ cat x | python -c '...'   → bloqueia (após pipe)
#   ✗ foo && python3 s.py       → bloqueia (após &&)
#   ✓ grep python arquivo.txt   → permite (menção — `python` é argumento de grep)
#   ✓ ls /usr/bin/python3       → permite (faz parte de um path)
#   ✓ brew list | grep python   → permite (argumento)
#   ✗ FOO=1 python3 x.py        → bloqueia (assignment não disfarça o comando)
#
# O `(VAR=valor )*` cobre o prefixo de assignment, que é posição de comando tanto quanto o início
# da linha — foi o caso que passou na primeira versão deste hook.
ASSIGN='([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*'
CMD_POS="(^|[;&|(]|&&|\\|\\|)[[:space:]]*${ASSIGN}"

# ⚠️ CONTEÚDO DE HEREDOC NÃO É COMANDO — e ignorar isso quase matou este hook na estreia.
#
# A segunda versão bloqueou o próprio commit que a introduzia: a mensagem descrevia o gate e tinha
# `python` e `perl -0pi` abrindo linhas dentro do heredoc do `git commit -F -`. Como o grep casa
# `^` por LINHA, a menção virou "posição de comando". Um gate que recusa qualquer heredoc citando
# `python` é desligado no mesmo dia — e aí não protege de nada.
#
# A linha que ABRE o heredoc é preservada, porque é justamente onde mora o caso a pegar
# (`python3 - <<'PY'`). Some só o corpo, até o delimitador de fechamento.
strip_heredoc_bodies() {
  awk '
    inhd { if ($0 == delim || $0 == delim ";") { inhd = 0 } ; next }
    {
      print
      if (match($0, /<<-?[ \t]*"?'"'"'?[A-Za-z_][A-Za-z0-9_]*'"'"'?"?/)) {
        d = substr($0, RSTART, RLENGTH)
        sub(/^<<-?[ \t]*/, "", d)
        gsub(/["'"'"']/, "", d)
        delim = d
        inhd = 1
      }
    }
  '
}

# `SCAN` é o que se inspeciona; `COMMAND` segue intacto para ser ecoado na recusa — quem lê a
# mensagem precisa ver o que digitou, não a versão podada.
SCAN=$(printf '%s' "$COMMAND" | strip_heredoc_bodies)

BLOCKED=''
if echo "$SCAN" | grep -qE "${CMD_POS}python[0-9.]*([[:space:]]|$)"; then
  BLOCKED='python'
# Perl só é bloqueado no modo INLINE (-e/-E executa código, -p/-n com -i reescrevem arquivo).
# `perl script.pl` continua liberado: o problema é interpretador improvisado, não a linguagem.
#
# A classe da flag inclui DÍGITO: `perl -0pi -e` é a forma que foi usada aqui, e um `[a-zA-Z]*`
# não a alcançava — o gate teria aprovado justamente o comando que causou o dano.
elif echo "$SCAN" | grep -qE "${CMD_POS}perl[[:space:]]+-[a-zA-Z0-9]*[eEi]"; then
  BLOCKED='perl inline'
fi

if [ -n "$BLOCKED" ]; then
  read -r -d '' REASON <<'EOF' || true
Use as ferramentas Edit/Write em vez de interpretador inline.

Por que este hook existe:
  • Edit/Write passam pelos hooks PostToolUse (prettier), respeitam o estado de
    leitura do arquivo e FALHAM quando o alvo não casa. Um script inline que
    reescreve arquivo não tem nenhuma dessas garantias.
  • Já custou caro aqui: um `perl -0pi` de "adicionar campo aos fakes de teste"
    acertou alguns pontos, duplicou outros e passou despercebido até o typecheck.
  • Preferência registrada do Gabriel: script utilitário nunca em Python.

Substituições:
  editar trecho de arquivo      →  Edit (old_string/new_string)
  reescrever arquivo inteiro    →  Write
  ler parte de arquivo          →  Read (offset/limit)
  buscar padrão                 →  Grep
  transformar texto em lote     →  script .ts com node --experimental-strip-types
                                   (é o runtime do projeto — ver scripts/)

Se precisar mesmo de processamento pontual em shell, `jq`, `grep`, `sed` e `awk`
continuam liberados.
EOF

  jq -c -n \
    --arg name 'PreToolUse' \
    --arg dec 'deny' \
    --arg reason "$REASON" \
    --arg what "$BLOCKED" \
    --arg cmd "$COMMAND" \
    '{
      hookSpecificOutput: {
        hookEventName: $name,
        permissionDecision: $dec,
        permissionDecisionReason: ($reason + "\n\nDetectado: " + $what + "\n\nComando bloqueado:\n" + $cmd)
      }
    }'
  exit 0
fi

# Não usa interpretador inline — permite silenciosamente (exit 0 sem stdout JSON = allow).
exit 0
