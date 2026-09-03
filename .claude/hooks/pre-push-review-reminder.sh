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
# A superfície foi então reduzida ao que o gate realmente precisa saber: **isto é um push do repo de
# código?** A única exceção legítima medida em uso é a wiki (`core-api.wiki.git`, um clone em
# `.wiki/`), e ela vira uma condição explícita de uma linha. Tudo o mais BARRA — falha fechada, que
# é o lado certo de errar num gate.
#
# ─── Escape ────────────────────────────────────────────────────────────────────────────────────
# `export SKIP_PUSH_REVIEW=1` antes do push — variável de AMBIENTE, não atribuição inline (`FOO=1 git
# push` define a variável para o `git`, não para este processo). É deliberadamente explícito: aparece
# no log e não é o caminho de menor resistência.

set -euo pipefail

payload="$(cat)"
command="$(printf '%s' "$payload" | jq -r '.tool_input.command // ""')"

# O `if:` do settings.json já filtra por prefixo do comando real. Este teste é defesa em profundidade
# para o caso de o arquivo ser reusado noutro matcher — e é deliberadamente FROUXO: qualquer menção a
# `git push` faz o hook opinar. Um deny espúrio é visível e recuperável; um furo é silencioso.
if ! grep -qE 'git[[:space:]]+([^[:space:]]+[[:space:]]+)*push\b' <<<"$command"; then
  exit 0
fi

if [[ "${SKIP_PUSH_REVIEW:-}" == '1' ]]; then
  exit 0
fi

# A wiki é um repositório à parte (sem código, sem CI, sem borda) e a única exceção medida em uso.
# Reconhecê-la pelo caminho do clone é exato e não exige interpretar a sintaxe do comando.
#
# ⚠️ A exceção vale para UM push só. `git -C .wiki push && git push` menciona `.wiki` e publicaria o
# repo de código sem medição — a exceção viraria o furo. Com mais de um push no comando não há como
# saber, sem parsear shell, quais são de onde; então barra. Falha fechada.
# ⚠️ Entre `git` e `push` só podem vir OPÇÕES. Com `([^[:space:]]+[[:space:]]+)*` o padrão é
# ganancioso e casa `-C .wiki push && git ` inteiro, contando dois pushes como um — e a exceção da
# wiki liberava o push do repo de código junto.
pushes="$(grep -oE 'git[[:space:]]+(-[^[:space:]]+[[:space:]]+([^-][^[:space:]]*[[:space:]]+)?)*push\b' <<<"$command" | wc -l | tr -d ' ')"
if [[ "$command" == *".wiki"* && "$pushes" -eq 1 ]]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Contra o upstream quando ele existe; contra a base de integração quando o branch é novo.
upstream="$(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || echo '')"
base="${upstream:-origin/dev}"

if ! git rev-parse --verify --quiet "$base" >/dev/null; then
  # Sem base para comparar não há medição — e um número inventado é pior que nenhum.
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
reason+=$'\n\n  Depois de revisar (e tratar os achados), repita com `export SKIP_PUSH_REVIEW=1` antes do push.'
reason+=$'\n\n  Hook não consegue chamar slash command: quem roda a revisão é você, na sessão. O hook só impede que a etapa seja pulada.'

jq -n --arg reason "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
