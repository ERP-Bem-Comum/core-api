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
# proporcional tenha sido feita. Quem aperta o botão continua sendo o humano; o hook só impede que a
# etapa seja pulada por esquecimento.
#
# ─── Escape ────────────────────────────────────────────────────────────────────────────────────
# `SKIP_PUSH_REVIEW=1 git push …` — para quando a revisão já rodou nesta sessão. É deliberadamente
# um envelope explícito: some do histórico do shell, aparece no log, e não é o caminho de menor
# resistência.

set -euo pipefail

payload="$(cat)"
command="$(printf '%s' "$payload" | jq -r '.tool_input.command // ""')"

# O `if:` do settings.json já filtra por prefixo, mas um hook que confia no chamador vira surpresa
# quando alguém reusa o arquivo noutro matcher.
#
# ⚠️ Casar `git push` em QUALQUER posição confunde uso com menção — a primeira versão barrou o
# próprio comando que a testava, um `echo` que só montava o payload. `git push` tem de estar na
# posição de COMANDO: no início, ou logo depois de um separador.
#
# ⚠️ E a posição de comando admite prefixos: atribuições inline (`FOO=1 git push`), `time`, `command`,
# e `git -C <dir> push`. A segunda versão ignorava os quatro, e QUALQUER um deles furava o gate — o
# mais irônico sendo `SKIP_PUSH_REVIEW=1 git push`, que "funcionava" por não ser reconhecido, não
# pelo teste da variável lá embaixo.
#
# ⚠️ Aceitar prefixo de atribuição amplia o que o padrão confunde com MENÇÃO: uma string que contenha
# `FOO=1 git push` passa a casar. É trade-off assumido, não descuido — aqui se falha FECHADO. Um
# `deny` espúrio é visível, explicável e some com uma reescrita do comando; um furo é silencioso e só
# aparece depois de ter passado. Num gate, essa assimetria decide.
if ! printf '%s' "$command" |
  grep -qE '(^|[;&|]|&&|\|\|)[[:space:]]*((command|time|env|nice)[[:space:]]+|[A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*git[[:space:]]+(-[A-Za-z-]+([[:space:]]+[^[:space:]]+)?[[:space:]]+)*push\b'; then
  exit 0
fi

# O escape é uma variável do AMBIENTE do hook, não uma atribuição inline no comando: `FOO=1 git push`
# define FOO para o `git`, não para este processo. Quem quiser pular exporta antes — e isso aparece
# no log, que é o ponto.
if [[ "${SKIP_PUSH_REVIEW:-}" == '1' ]]; then
  exit 0
fi

# ─── Só o repositório de CÓDIGO ────────────────────────────────────────────────────────────────
# O comando pode ter feito `cd` para outro repositório antes do push — a wiki (`core-api.wiki.git`)
# é o caso concreto: repo separado, sem código, sem CI, sem borda. Medi-la contra `origin/dev` do
# repo principal dá "0 arquivos" e barra uma edição de documentação por engano.
#
# Isso aconteceu no primeiro uso real deste hook, em 03/09/2026. Um gate que barra o que não deveria
# treina o reflexo do escape — e aí para de valer no caso em que importa.
# ⚠️ Só um `cd` que acontece ANTES do push muda o repositório do push. A primeira versão casava `cd`
# em qualquer posição, e `git push && cd ..` desligava o gate: o `cd` posterior era lido como se
# tivesse ocorrido antes, o toplevel batia noutro repo, e o hook saía mudo.
target_dir="${CLAUDE_PROJECT_DIR:-.}"
before_push="${command%%git *}"
if [[ "$before_push" != "$command" && "$before_push" =~ (^|[;&|])[[:space:]]*cd[[:space:]]+([^[:space:]\;\|\&]+) ]]; then
  candidate="${BASH_REMATCH[2]}"
  [[ -d "$candidate" ]] && target_dir="$candidate"
fi

main_repo="$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --show-toplevel 2>/dev/null || echo '')"
push_repo="$(git -C "$target_dir" rev-parse --show-toplevel 2>/dev/null || echo '')"

if [[ -z "$push_repo" || "$push_repo" != "$main_repo" ]]; then
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
# A borda HTTP real vive em `modules/*/adapters/http/`; `src/shared/security/` não existe. A primeira
# versão listava um caminho inexistente e não listava o que precisava — um PR que adicionasse rota
# sem `requireAuth` não disparava nada.
sensitive=''
if git diff --name-only "$base"...HEAD 2>/dev/null |
  grep -qE '^(src/modules/auth/|src/modules/[a-z-]+/adapters/http/|src/shared/http/|\.github/workflows/|compose|Dockerfile|src/modules/financial/adapters/cnab/)'; then
  sensitive='\n  • Tocou auth, borda HTTP, workflow de CI, imagem ou CNAB → rode TAMBÉM `/security-review`.'
fi

# ⚠️ O JSON é montado com `jq`, não com heredoc.
#
# A primeira versão usava `sensitive=$'\n …'`, que produz um NEWLINE REAL, e o interpolava dentro da
# string JSON. Newline cru é caractere de controle não-escapado: o parser recusa o objeto inteiro, o
# `permissionDecision: "deny"` some junto — e o push PASSA.
#
# O efeito era o pior possível para um gate de segurança: ele barrava o diff inócuo (JSON válido) e
# liberava o diff que toca auth, CI ou CNAB (JSON quebrado). Falhava aberto exatamente onde existia
# para fechar. Passou por quatro pipe-tests porque nenhum deles tocava superfície sensível.
#
# `jq -n --arg` escapa o que precisa ser escapado, e não há como esquecer.
reason="Push barrado até a revisão do diff."
reason+="\n\n  Porte ${porte} → rode \`${review}\`.${sensitive}"
reason+="\n\n  Depois de revisar (e tratar os achados), repita o push definindo SKIP_PUSH_REVIEW=1 no ambiente."
reason+="\n\n  Hook não consegue chamar slash command: quem roda a revisão é você, na sessão. O hook só impede que a etapa seja pulada."

jq -n --arg reason "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
