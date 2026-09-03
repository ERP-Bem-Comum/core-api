#!/usr/bin/env bash
# Claude Code hook — PreToolUse(Bash), filtrado por `if: "Bash(git push*)"`.
#
# Barra o push e diz QUAL revisão rodar, dimensionada pelo tamanho do que está sendo publicado.
#
# ─── Por que um lembrete e não a revisão ────────────────────────────────────────────────────────
# Hook executa COMANDO DE SHELL. `/code-review`, `/security-review` e `/code-review ultra` são slash
# commands do loop conversacional do Claude Code — não existe binário que os dispare, e o ultra é
# explicitamente user-triggered e faturado. Um hook que tentasse invocá-los falharia em silêncio, que
# é a pior forma de gate: a que promete cobertura e não entrega.
#
# O que um hook PODE fazer com honestidade é o que este faz — medir o diff (isso é mensurável, ao
# contrário de "tamanho do contexto", que o hook não enxerga) e recusar o push até que a revisão
# proporcional tenha sido feita. Quem aperta o botão continua sendo o humano.
#
# ─── Por que este arquivo é curto ───────────────────────────────────────────────────────────────
# Três rodadas de revisão acharam nove furos, TODOS no mesmo lugar: a tentativa de parsear shell para
# descobrir em que repositório o push aconteceria. Corrigir `&&` deixou a quebra de linha passar;
# corrigir `-C` deixou `--git-dir` passar; um `head -1` fazia o segundo push de um comando composto
# nunca ser medido. Não é azar — a gramática de shell é infinita e uma enumeração de casos é finita.
#
# A superfície foi então reduzida ao que o gate realmente precisa saber: **isto é um push?** Não há
# exceção nenhuma — nem para a wiki, cuja exceção por substring virou um bypass (ver abaixo). Tudo
# barra, e quem precisa passar usa o sentinela. Falha fechada, que é o lado certo de errar num gate.
#
# ⚠️ E o hook NÃO usa `if:` no settings.json. `Bash(git push*)` é match de PREFIXO: `git -C … push`,
# `git --git-dir=… push`, `sudo git push` e `FOO=1 git push` não começam com `git push` e nunca
# invocariam este arquivo. Três rodadas de revisão "provaram" que o script barra esses casos —
# rodando o script à mão, contornando o matcher que, na vida real, filtra antes. O filtro barato
# custava a cobertura inteira; agora o hook roda em todo Bash e decide aqui.
#
# ─── Escape ────────────────────────────────────────────────────────────────────────────────────
# `touch .claude/.skip-push-review` e faça o push. O arquivo é CONSUMIDO no uso: vale uma vez.
#
# ⚠️ O `touch` tem de ser um comando SEPARADO, executado ANTES. Este hook é `PreToolUse`: dispara
# antes do comando inteiro, então `touch … && git push` numa linha só é barrado — o arquivo ainda não
# existe quando o hook olha. Medido no primeiro uso real.
#
# ⚠️ Não é variável de ambiente, e a tentativa anterior de fazê-lo assim estava quebrada em silêncio.
# Este hook roda num processo à parte, disparado ANTES do comando: `export SKIP_PUSH_REVIEW=1` no
# shell do push nunca chega aqui, e o estado de shell não persiste entre comandos da ferramenta Bash.
# O hook documentava — inclusive na mensagem que o usuário lê — uma saída que não existia. Um gate
# sem escape não é rigoroso, é quebrado: a única saída vira `--no-verify` ou desligar o hook, que é
# exatamente o hábito que ele deveria evitar.
#
# O sentinela é um arquivo: o hook enxerga, o `ls` mostra, o gitignore o mantém fora do repo, e
# consumi-lo impede que vire estado permanente esquecido.

set -euo pipefail

payload="$(cat)"
command="$(printf '%s' "$payload" | jq -r '.tool_input.command // ""')"

# O `if:` do settings.json já filtra por prefixo do comando real. Este teste é defesa em profundidade
# para o caso de o arquivo ser reusado noutro matcher — e é deliberadamente FROUXO: qualquer menção a
# `git push` faz o hook opinar. Um deny espúrio é visível e recuperável; um furo é silencioso.
# ⚠️ Heredoc é CONTEÚDO, não comando. Sem remover o corpo do heredoc, um `git commit -F - <<'EOF'`
# cuja mensagem menciona um push é barrado — o gate impediria documentar o próprio defeito que
# corrige. Aconteceu no primeiro uso, com a mensagem deste commit. Só o corpo sai; o `git … push` em
# posição de comando continua visível, então os bypasses reais seguem fechados.
scrubbed="$(awk '
  /<<-?'"'"'?[A-Za-z_][A-Za-z0-9_]*'"'"'?/ && !inside { delim = $0; sub(/.*<<-?'"'"'?/, "", delim); sub(/'"'"'.*/, "", delim); sub(/[^A-Za-z0-9_].*/, "", delim); inside = 1; print; next }
  inside && $0 == delim { inside = 0; next }
  !inside { print }
' <<<"$command")"

if ! grep -qE 'git[[:space:]]+([^[:space:]]+[[:space:]]+)*push\b' <<<"$scrubbed"; then
  exit 0
fi

# Sentinela de uso único: se existe, some e o push passa desta vez.
sentinel="${CLAUDE_PROJECT_DIR:-.}/.claude/.skip-push-review"
if [[ -f "$sentinel" ]]; then
  rm -f "$sentinel"
  exit 0
fi

# ⚠️ NÃO há exceção automática para a wiki, e a tentativa de criar uma foi um furo de segurança.
#
# A versão anterior liberava quando o comando continha a substring `.wiki`. Substring casa o comando
# INTEIRO, não o destino: `git push origin dev  # .wiki` — um COMENTÁRIO de shell — desligava o gate.
# O mesmo com `git push origin dev:dev.wiki` e com uma branch `feature/x.wiki`. Os três foram
# medidos, e os três liberavam: um bypass repetível e invisível, ao contrário do sentinela, que some
# no uso e aparece no `ls`.
#
# Saber o destino real exigiria resolver o remote, o que exige interpretar a sintaxe do comando — a
# corrida que este arquivo já perdeu três vezes. Então não há exceção: push de wiki usa o sentinela
# como qualquer outro. Um `touch` a mais numa operação rara, contra um furo permanente.

cd "${CLAUDE_PROJECT_DIR:-.}"

# Contra o upstream quando ele existe; contra a base de integração quando o branch é novo.
upstream="$(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || echo '')"
base="${upstream:-origin/dev}"

# ⚠️ Sem base, NEGA. A versão anterior fazia `exit 0` aqui — allow — com o comentário "um número
# inventado é pior que nenhum". O raciocínio estava certo e a conclusão invertida: não medir não é
# motivo para liberar, é motivo para não deixar passar sem revisão. Num clone raso, com remote de
# outro nome, ou sem `origin/dev` buscado, o gate desligava sozinho e em silêncio.
if ! git rev-parse --verify --quiet "$base" >/dev/null; then
  jq -n --arg base "$base" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("Push barrado: não consegui medir o diff — a base `" + $base + "` não resolve neste clone.\n\n  Sem medição não há porte, e sem porte não há revisão dimensionada. Busque a base (`git fetch origin dev`) ou, se a revisão já foi feita, use `touch .claude/.skip-push-review` como comando separado.")
    }
  }'
  exit 0
fi

read -r files insertions <<<"$(
  git diff --shortstat "$base"...HEAD 2>/dev/null |
    awk '{f=0; i=0; for (n=1; n<=NF; n++) { if ($n ~ /^file/) f=$(n-1); if ($n ~ /^insertion/) i=$(n-1) } print f+0, i+0}'
)"
files="${files:-0}"
insertions="${insertions:-0}"

# Faixas por tamanho do que está sendo PUBLICADO — não por esforço de quem escreveu.
if ((files <= 3 && insertions <= 100)); then
  review='/code-review'
  porte="pequeno (${files} arquivos, ${insertions} linhas)"
elif ((files <= 20 && insertions <= 800)); then
  review='/code-review high'
  porte="médio (${files} arquivos, ${insertions} linhas)"
else
  review='/code-review ultra'
  porte="grande (${files} arquivos, ${insertions} linhas)"
fi

# Segurança não é faixa de tamanho: é faixa de SUPERFÍCIE. Um diff de 5 linhas em auth vale mais
# revisão de segurança que 500 linhas de relatório.
#
# ⚠️ Sem pipe para o `grep`. Sob `pipefail`, `git diff … | grep -q …` devolve 141 quando a saída do
# `git` passa do buffer do pipe: o `grep -q` sai no primeiro acerto, o `git` leva SIGPIPE, e o `if`
# fica FALSO APESAR DE TER CASADO — a nota sumia justamente nos diffs grandes que tocam auth.
sensitive=''
changed="$(git diff --name-only "$base"...HEAD 2>/dev/null || true)"
if grep -qE '^(src/modules/auth/|src/modules/[a-z-]+/adapters/http/|src/shared/http/|\.github/workflows/|compose|Dockerfile|src/modules/financial/adapters/cnab/)' <<<"$changed"; then
  sensitive=$'\n  • Tocou auth, borda HTTP, workflow de CI, imagem ou CNAB → rode TAMBÉM `/security-review`.'
fi

# ⚠️ `$'…'` para quebra de linha REAL. `"\n"` entre aspas duplas é backslash-n literal em bash, e o
# `jq --arg` escapa essa barra: a mensagem chega numa linha só, com `\n` visível. Aconteceu, e passou
# despercebido porque se conferiu se o hook BARRAVA, não se ele COMUNICAVA.
reason="Push barrado até a revisão do diff."
reason+=$'\n\n  Porte '"${porte}"$' → rode `'"${review}"$'`.'"${sensitive}"
reason+=$'\n\n  Depois de revisar (e tratar os achados): rode `touch .claude/.skip-push-review` COMO COMANDO SEPARADO, e então o push. O arquivo vale uma vez e some no uso; na mesma linha do push ele não existe ainda quando este hook olha.'
reason+=$'\n\n  Hook não consegue chamar slash command: quem roda a revisão é você, na sessão. O hook só impede que a etapa seja pulada.'

jq -n --arg reason "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
