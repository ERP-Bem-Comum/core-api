#!/usr/bin/env bash
# Biblioteca dos hooks — remoção do CORPO de heredoc antes de qualquer varredura por padrão.
#
# Existe porque dois hooks precisam da mesma coisa (`block-inline-interpreter.sh` e
# `block-bash-file-io.sh`) e porque a alternativa — copiar o awk — é a fábrica de drift conhecida
# desta base: a segunda cópia diverge da primeira no dia em que só uma for corrigida.
#
# O QUE resolve: `grep` casa `^` por LINHA, então uma menção dentro de um heredoc — a mensagem de
# commit que descreve o próprio gate, por exemplo — vira "posição de comando" e é bloqueada. Isso
# já quase matou o `block-inline-interpreter` na estreia: ele recusou o commit que o introduzia.
#
# O QUE preserva: a linha que ABRE o heredoc continua no texto varrido. É justamente onde mora o
# caso real (`python3 - <<'PY'`, `cat > arquivo.ts <<'EOF'`). Some só o corpo, até o delimitador.
#
# Uso: source este arquivo e passe o comando por stdin.
#   SCAN=$(printf '%s' "$COMMAND" | strip_heredoc_bodies)

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
