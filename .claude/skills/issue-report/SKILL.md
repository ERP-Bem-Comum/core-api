---
name: issue-report
description: >-
  Registra um problema/achado (bug, gap de contrato, débito técnico, smell, risco de segurança) como
  GitHub Issue PADRONIZADA, TESTÁVEL e SEM DUPLICATA. Use SEMPRE que, durante qualquer trabalho, encontrar
  um problema FORA do escopo do ticket atual — em vez de consertar na hora (scope-creep) ou perder o achado.
  Garante título normalizado, causa-raiz, critérios de aceite Dado/Quando/Então e Definition of Done amarrada
  ao gate W3. Deduplica via `gh issue list` antes de criar. Aciona em: "abre uma issue disso", "registra esse
  problema", "isso é um bug pra depois", "achei um gap", "tem um débito aqui", "isso foge do escopo".
---

# issue-report — registrar um achado como GitHub Issue testável

> **Por que existe:** o melhor detector de problemas do projeto é o próprio agente, codando. Esta skill captura
> o achado **no momento certo**, com qualidade suficiente para que outro agente conserte "tintin por tintin" —
> sem duplicar e sem virar scope-creep. O destino é GitHub Issues (`ERP-Bem-Comum/core-api`); a notificação no
> Discord sai pelo webhook nativo (`…/github`). Faz parte da decisão do [ADR-0040](../../../handbook/architecture/adr/0040-agent-findings-as-github-issues.md).

## Quando usar / quando NÃO usar

- **USE** quando encontrar um problema **fora do escopo do ticket atual** e decidir **não consertar agora**.
- **NÃO use** para o trabalho do ticket corrente (isso é o pipeline W0→W3). NÃO use para abrir issue de algo que
  você vai consertar nos próximos minutos.
- **NÃO abra** uma issue se não conseguir escrever **critérios de aceite testáveis** — então o problema ainda não
  está entendido; investigue mais primeiro (ver Fundamento canônico).

## Fundamento canônico (princípio IX — por que o template é assim)

Citações do fallback local `acdg/skills_base/shared-references/` (MCP `acdg-skills` via path — [[acdg-skills-base-fallback]]):

> O terceiro questionamento remete aos critérios de aceitação. Isso (…) traz a visão de testabilidade da
> funcionalidade em sua definição. Estes critérios, além de ajudar a perceber as diferentes situações no qual esta
> funcionalidade deve se enquadrar, complementam as suas informações.
> — _Histórias de Usuário_ (`requirements/historias-de-usuario.md:19`)

> Testable (deve ser testável). (…) uma boa história (…) deve ser testável.
> — INVEST, _Histórias de Usuário_ (`requirements/historias-de-usuario.md:235,237`)

> Em todos os casos que o saldo foi manipulado nós registramos exemplos práticos nos critérios de aceitação.
> Isto ajuda muito no processo de teste. (…) a mensagem de erro já estava especificada no próprio critério de aceitação.
> — _Histórias de Usuário_ (`requirements/historias-de-usuario.md:424,425`)

> A interpretação de um requisito deve ser consistente independentemente de quem o leia.
> — _Gerenciamento de Requisitos_ (`requirements/gerenciamento-de-requisitos.md:248`)

Daí as 3 exigências do template: **(1)** problema em 1 frase sem ambiguidade; **(2)** critérios de aceite
**Dado/Quando/Então** com exemplo concreto e **caminho de erro** (slug/status); **(3)** Definition of Done amarrada ao gate W3.

## Procedimento

### 0. Confirme que entende o problema

Você consegue escrever ≥1 critério de aceite **verificável** (um teste o confirmaria)? Se não, investigue mais. Não
abra issue de palpite.

### 1. Defina a `dedup-key` e procure duplicata (idempotência)

A `dedup-key` é estável: `<modulo>:<area>:<slug-curto>` (ex.: `contracts:create:program-id`).

```bash
# procura por chave OU termos no título/corpo, incluindo fechadas
gh issue list --repo ERP-Bem-Comum/core-api --state all --search "<slug-ou-termos>" \
  --json number,title,state,body --limit 20
```

- **Achou aberta com a mesma `dedup-key`** → **não duplique.** Comente o novo contexto:
  `gh issue comment <n> --body "Reincidência em <contexto>: <detalhe>."`
- **Achou fechada e o problema voltou** → reabra + comente:
  `gh issue reopen <n> && gh issue comment <n> --body "Regressão: <evidência>."`
- **Nada parecido** → siga para criar.

### 2. (Bootstrap, só na 1ª vez) garanta as labels

```bash
for l in "agent-found:0e8a16:Achado por agente IA" "needs-triage:fbca04:Aguardando triagem" \
         "bug:d73a4a:Defeito" "gap-contrato:1d76db:Lacuna de contrato API" "smell:cfd3d7:Code smell" \
         "debito-tecnico:c5def5:Dívida técnica" "seguranca:b60205:Risco de segurança"; do
  IFS=: read -r name color desc <<< "$l"
  gh label create "$name" --color "$color" --description "$desc" --force --repo ERP-Bem-Comum/core-api
done
```

### 3. Preencha o template e crie a issue

Copie `.github/ISSUE_TEMPLATE/agent-finding.md`, preencha **TODAS** as seções (sem deixar `<!-- ... -->` por
preencher), grave num arquivo temporário e crie:

```bash
gh issue create --repo ERP-Bem-Comum/core-api \
  --title "[<modulo>] <resumo imperativo>" \
  --body-file /tmp/issue-<dedup-key>.md \
  --label "agent-found,needs-triage,<tipo>,<severidade-opcional>"
```

> O `--title` deve ter o prefixo `[<modulo>]`. O corpo MUST conter a linha `dedup-key: <key>` (vem do template) —
> é o que a busca do passo 1 encontra da próxima vez.

### 4. Reporte ao usuário

Devolva o número + URL da issue (ou "atualizei a #N existente"), e **uma frase** do que foi registrado. Volte ao
trabalho original — você NÃO conserta o achado agora (a menos que o usuário peça).

## Checklist de qualidade (a issue está boa?)

- [ ] Título `[<modulo>] <verbo + objeto>` — específico, não "erro no contrato".
- [ ] Problema em 1 frase sem ambiguidade + `arquivo:linha`.
- [ ] Causa-raiz (não sintoma) + regra/ADR violado + impacto.
- [ ] ≥1 critério **Dado/Quando/Então** testável, **com caminho de erro** (slug/status).
- [ ] Definition of Done com o gate W3.
- [ ] `dedup-key` presente; busca de duplicata feita.
