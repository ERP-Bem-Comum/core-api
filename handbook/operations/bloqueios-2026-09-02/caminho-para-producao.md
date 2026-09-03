[← Voltar para `operations/`](../README.md)

# 🚚 Qual é o caminho para produção hoje — apuração da premissa vencida da #873

> **O que é:** apuração do item **B5** do levantamento de bloqueios de 02/09/2026. A issue **#873**
> (P1, `needs-decision`) está escrita sobre uma branch que não existe, e o `CLAUDE.md` trata isso
> como **defeito a registrar**, não como texto a reescrever pelo mais plausível.
>
> **Método:** medido em **03/09/2026** contra `origin/dev@459209f7` e `origin/main@571a14d7`, com
> `git` e `gh` ao vivo, e contra os arquivos do repositório de infraestrutura. **Nenhum host foi
> tocado** — a apuração é somente-leitura.
>
> **Escopo:** este documento **apura e propõe**. Não decide. As decisões da #873 (CA0, CA1, CA2)
> continuam com o dono do repositório, e o label `needs-decision` continua onde está.

---

## 1. O veredito, em uma tabela

| A #873 afirma                                                          | O que foi medido                                                                                                                                |
| :--------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| *"A branch `go-live`, que alimenta produção…"*                          | **`go-live` existiu e foi aposentada.** Quem alimenta produção hoje é a **`main`**                                                                |
| *"…está 794 commits atrás da `dev`"*                                    | **Não reproduzível.** 14 medições, nenhuma dá 794. A que corresponde à intenção da frase dá **572** (§4)                                          |
| **CA4** — *"promoção da `go-live` até pelo menos `45b74d2e`"*            | **Já cumprido.** `45b74d2e` é ancestral de `origin/main` desde **25/08 17:19Z** — 2h07 **depois** de a issue ser aberta                           |
| Tabela *"O que produção NÃO tem"* — 9 itens                             | **8 dos 9 verificados já estão na `main`**; o 9º (#804) é issue fechada como `COMPLETED` antes da promoção                                        |

**A leitura curta:** a #873 descreve com precisão um estado que era verdadeiro às 15:12Z de
25/08/2026 e deixou de ser **no mesmo dia**. O que sobrou dela — e continua P1 — são as **três
decisões não-técnicas** (RBAC, rota de download, bucket da VAN), não a promoção de código.

---

## 2. Existe hoje uma branch que alimenta produção?

**Sim: a `main`.** Quatro fontes primárias independentes, todas no repositório de infraestrutura:

| Fonte                                                     | Trecho                                                                             |
| :-------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| `ERP-INFRA/docs/runbooks/ci-cd-pipeline.md:114`            | *"**Source** — observa a branch `main` do core-api no GitHub"*                       |
| `ERP-INFRA/docs/runbooks/ci-cd-pipeline.md:151`            | `BranchName = "main"` (configuração da action de Source)                             |
| `ERP-INFRA/docs/runbooks/deploy-and-operations.md:112`     | *"traduz o `compose.yaml` do core-api (branch `main`)"*                              |
| `ERP-INFRA/docs/adr/0003-producao-aws-ecs.md:55`           | *"A infra traduz o `compose.yaml` do core-api (branch `main`) para o ECS"* — **Aceito** em 30/06/2026 |

### A `go-live` existiu — e isso importa

Não é o caso de "nunca existiu com esse nome". O git guarda a prova:

```console
$ git log --all --oneline --grep='go-live' -i
41f49243 Merge remote-tracking branch 'origin/go-live' into 357-batch-financial-payables

$ gh pr list --state all --json baseRefName,headRefName ...
PR #355 go-live -> dev    Integração: go-live → dev — inversão de responsabilidade core-api ↔ BFF
PR #379 fix/reconciliation-match-fuzzy-signals -> go-live
PR #376 fin-ocr -> go-live
(+ 6 outros PRs com base `go-live`)
```

E o git também prova que ela sumiu:

```console
$ git ls-remote --heads origin | wc -l
34
$ git ls-remote origin | grep -i "go.live"
(nenhuma ref)
```

> **Sobre a memória de sessão.** Havia registro de que a `go-live` foi promovida para a `dev` por
> fast-forward em 09/07/2026 e deletada local e remotamente. A parte verificável **confere**: a
> branch não existe mais no remoto, o PR #355 fez `go-live → dev`, e o último merge que a cita é de
> **07/07/2026**. A data exata da deleção não é auditável pelo git (ref deletada não deixa rastro
> no remoto) e fica como **não verificada**.

**Consequência prática:** qualquer artefato que ainda diga "mirar a `go-live`" está vencido há
quase dois meses. A `dev` é a linha de integração; a `main` é a linha de produção.

---

## 3. O que promove código a produção?

**Um merge na `main`** — feito por Pull Request de `dev → main` — que dispara um pipeline
gerenciado na nuvem, fora do GitHub:

```
merge em main → CodePipeline
  → CodeBuild  : build da imagem → push para o registry (tag :sha-<commit>, imutável)
  → CodeDeploy : task one-shot `migrate` (aplica o schema)
                 → registra a nova Task Definition → atualiza cada Service (API + workers)
```

Fonte: `ERP-INFRA/docs/runbooks/deploy-and-operations.md:118-123` e o guia completo em
`ERP-INFRA/docs/runbooks/ci-cd-pipeline.md`.

### O mecanismo não vive em nenhum dos dois repositórios

Isto é o que torna a pergunta difícil, e vale registrar com precisão:

| Onde se procuraria                | O que há                                                                                                                                                                                    |
| :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `core-api/.github/workflows/`      | 9 workflows: CI, integração, audit, semgrep, commit-policy, notificações e `qa-image`. **Nenhum deploya.**                                                                                    |
| `core-api/.github/workflows/qa-image.yml:7-10` | *"⚠️ A ETAPA DE DEPLOY ESTÁ SUSPENSA (19/08/2026) — este workflow constrói e publica a imagem `qa`, e NÃO a entrega em host nenhum."*                                            |
| `ERP-INFRA/platform/tofu/`         | OpenTofu apenas para a VM de homologação. Não há IaC de produção versionada.                                                                                                                 |
| `ERP-INFRA/platform/README.md:7-8` | *"a IaC do ECS é mantida pelo time de infra (ARNs/região/cluster a confirmar)"*                                                                                                               |

### ⚠️ Um achado colateral: o pipeline documentado referencia arquivos que não existem

O `ci-cd-pipeline.md` afirma três vezes que os artefatos de deploy **moram no core-api**:

- `:221` — *"Mora em `core-api/buildspec.yml`"*
- `:340` — *"Mora em `core-api/appspec.yaml`"*
- `:363` — *"Mora em `core-api/taskdef.json`"*

Nenhum dos três existe, e **nunca existiu**:

```console
$ git log --oneline --all -- buildspec.yml appspec.yaml taskdef.json
(vazio)
```

Isto **não prova** que o pipeline não está provisionado — a configuração pode viver inteiramente no
console da nuvem, com `buildspec` inline. Prova apenas que **o desenho documentado e o repositório
que ele observa não fecham**, e que ninguém consegue verificar o pipeline lendo o core-api. Fica
registrado como divergência, não como conclusão.

### Cadência real de promoção — 4 em 3 meses

Reconstruída pela linha própria da `main` (`git log --first-parent`), que é a única leitura correta
de "onde a `main` esteve":

| Promoção        | Data           | Título                                                             |
| :-------------- | :------------- | :----------------------------------------------------------------- |
| PR #283         | 30/06/2026     | `dev → main`                                                        |
| PR #524         | 22/07/2026     | `dev → main`                                                        |
| **PR #877**     | **25/08/2026** | *"chore(release): promove 1.0.0-rc.1 para produção — 194 unidades desde 23/07"* |
| PR #886         | 01/09/2026     | `dev → main`                                                        |

> **Sobre `--first-parent`.** Sem ele a medição mente: o histórico da `main` **engloba** o da `dev`
> depois de cada merge, então `git rev-list --before` devolve commits que estavam na `dev`, não na
> `main`. Foi exatamente esse erro que fez a primeira rodada desta apuração concluir — errado — que
> `main` e `dev` eram idênticas na abertura da issue.

---

## 4. De onde sai o número 794?

**Não reproduzível.** Este é um achado, não uma lacuna.

Foram medidas 14 distâncias contra todos os pontos de referência plausíveis (cada promoção da
`main`, o alvo do CA4, o ponto de aposentadoria da `go-live`), com e sem merges:

| Medida                                                                     | Valor   |
| :-------------------------------------------------------------------------- | ------: |
| **`main` → `dev` no instante da abertura da #873** *(a que a frase quis dizer)* | **572** |
| idem, sem merges                                                            | 347     |
| `main` → `dev` hoje                                                         | 10      |
| desde a última promoção anterior à issue (22/07) até a `dev` de hoje         | 673     |
| desde a aposentadoria da `go-live` (09/07) até a `dev` de hoje               | 870     |
| desde a promoção de 30/06 até a `dev` de hoje                                | 966     |
| total de commits na `dev`                                                    | 1694    |

Nenhuma dá 794, e nenhuma chega perto o bastante para ser arredondamento.

### A hipótese mais econômica — declarada como hipótese

**`794` é o número de um Pull Request, não uma contagem de commits.** O PR **#794**
(*"fix(financial): remessa por título — o título mantém a identidade…"*, `MERGED` em 21/08/2026) é
a **primeira linha** da tabela *"O que produção NÃO tem"* dentro da própria #873:

> | **#794** — contrato da remessa **por título** | ❌ | **o front da `develop` quebra**… |

Um número de PR ao lado de uma lista de pendências migrou para o título e para a frase-problema como
se fosse uma métrica. É plausível e coerente com o material, **mas não é demonstrável** — só quem
escreveu a issue pode confirmar. Fica como hipótese nomeada.

> **O que isto custou.** A premissa já se propagou: a Discussion **#958** (02/09) repete
> *"#873 — produção está **794 commits atrás** da `dev`"* como contexto. Um número não medido virou
> insumo de uma segunda conversa antes de qualquer verificação.

---

## 5. Qual commit está em produção hoje?

### 🔴 EM ABERTO — e a impossibilidade é, ela própria, o achado

Não é determinável a partir deste repositório, e não é por falta de acesso: **é por falta de
mecanismo**. Três medições, cada uma fechando um caminho:

| Caminho que se tentaria                    | Por que não fecha                                                                                            |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| Perguntar à aplicação no ar                | `src/shared/http/app.ts:186` — `app.get('/health', () => ({ status: 'ok' }))`. **Não devolve versão nenhuma.** |
| Perguntar ao artefato (a imagem)           | `Dockerfile:84-89` — os `LABEL` OCI trazem título, vendor, licença e imagem-base, **mas não `revision`**. A imagem não sabe de que commit veio. |
| Perguntar ao histórico de execuções         | O pipeline é gerenciado na nuvem, não no GitHub. Não há `gh run list` que mostre um deploy.                    |

**Quem saberia:** quem tem acesso ao console ou à CLI da nuvem. O procedimento existe e está escrito
— `ERP-INFRA/docs/runbooks/deploy-and-operations.md:179-186` (estado dos Services) e `:217-221`
(*"Descubra a revision ATUAL … da família"*): consultar o Service, ler a revisão da Task Definition
em uso e extrair a tag `:sha-<commit>` do campo `image`. **De fora, não se responde de jeito
nenhum.**

**O melhor palpite verificável daqui, e ele é inferência:** a `main` aponta hoje para `571a14d7`
(merge do PR #886, 01/09). *Se* o pipeline disparou e passou, produção está nesse commit. Nada neste
repositório confirma que disparou.

> **Por que não fui medir num host.** Mesmo com acesso de rede, o `/health` devolve
> `{ status: 'ok' }` — medir não responderia a pergunta. A sonda que não existe não é a rede: é o
> campo de versão.

**Esta é exatamente a pergunta da Discussion #958**, que está sem resposta. O achado acima a
responde pelo lado negativo: *não há caminho consultável hoje*. Se a decisão for criar um, o diff é
pequeno e mora no core-api — gravar `org.opencontainers.image.revision` na imagem e expor a versão
numa rota. **Nenhuma issue foi aberta para isso**: a #958 já é o canal, e escolher o remédio é
decisão do dono do repositório, não desta apuração.

---

## 6. O CA4 da #873 é executável como está escrito?

**Não** — e por dois motivos independentes, dos quais o segundo é o que mais importa.

> **CA4** — *"promoção da `go-live` até pelo menos `45b74d2e` (merge do #872)"*

1. **O objeto não existe.** Não há `go-live` para promover (§2).
2. **O objetivo já foi alcançado.** `45b74d2e` está na `main` desde 25/08:

```console
$ git merge-base --is-ancestor 45b74d2e origin/main && echo "já é ancestral"
já é ancestral

$ gh pr view 877 --json title,mergedAt
#877 dev -> main | merged: 2026-08-25T17:19:50Z
"chore(release): promove 1.0.0-rc.1 para produção — 194 unidades desde 23/07"
```

A issue foi aberta às **15:12:15Z**; a promoção que a satisfaz saiu às **17:19:50Z** do mesmo dia —
**2h07 depois**. Desde então houve mais uma promoção (PR #886, 01/09).

### E a tabela "O que produção NÃO tem" também venceu

Verificado item a item por ancestralidade em `origin/main`:

| Item da tabela | Está na `main`? | Item | Está na `main`? |
| :------------- | :-------------: | :--- | :-------------: |
| #794           | ✅ sim          | #855 | ✅ sim          |
| #804           | — *(issue, fechada `COMPLETED` em 22/08, antes da promoção)* | #857 | ✅ sim |
| #814           | ✅ sim          | #867 | ✅ sim          |
| #848           | ✅ sim          | #872 | ✅ sim          |
| #850           | ✅ sim          |      |                 |

Comando: `gh pr view <n> --json mergeCommit` seguido de
`git merge-base --is-ancestor <sha> origin/main`.

**Portanto a frase *"hoje, uma remessa emitida em produção sai inválida"* não se sustenta mais pelo
motivo que a issue dá** — o código dos 8 PRs está na branch que alimenta produção. Ela pode
continuar verdadeira por outro motivo (se o pipeline não rodou, §5), e é justamente isso que não se
consegue verificar daqui.

---

## 7. Proposta de reescrita — sugestão, não decisão

O que a #873 ainda guarda de vivo são as **três decisões não-técnicas**, que nenhuma promoção
resolve. Sugestão de substituição dos critérios que dependiam da `go-live`:

| CA atual | Situação | Sugestão                                                                                                                                  |
| :------- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **CA4**  | vencido  | Trocar por: *"confirmar que o pipeline de produção promoveu a `main` até `571a14d7` (PR #886) — e registrar aqui como isso foi confirmado"*. O objeto deixa de ser uma branch e passa a ser **a confirmação do deploy**, que é o que ninguém consegue fazer hoje (§5) |
| **CA3**  | válido   | Mantém — o `migrate` antes de promover os Services é invariante do ADR-0003                                                                 |
| **CA5**  | válido   | Mantém — a ordem front-depois-do-backend não muda                                                                                           |
| **CA0 · CA1 · CA2** | **válidos e são o gargalo real** | Mantêm-se intocados. São o motivo de a issue continuar P1 e `needs-decision`                                          |

Sugere-se também **retirar do corpo** a frase *"794 commits atrás"* e a tabela *"O que produção NÃO
tem"*, ambas vencidas — mas **a edição do corpo é do dono da issue**, e esta apuração não a executa.

---

## 8. O que fica em aberto

| # | Pergunta                                                             | Por que continua aberta                                                                                              |
| :- | :------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| 1 | **Qual commit está em produção agora?**                              | Não há mecanismo de consulta (§5). Só responde quem tem acesso ao console da nuvem                                     |
| 2 | **O pipeline de produção disparou nos merges #877 e #886?**          | Nenhum registro no GitHub. Mesma dependência da pergunta 1                                                             |
| 3 | **De onde veio o 794, de fato?**                                     | Hipótese nomeada em §4, não demonstrável. Só quem escreveu a issue confirma                                            |
| 4 | **Quando exatamente a `go-live` foi deletada?**                      | Ref deletada não deixa rastro auditável no remoto. A memória diz 09/07/2026; verificável só indiretamente              |
| 5 | **O pipeline documentado corresponde ao provisionado?**              | Três artefatos que o runbook localiza no core-api nunca existiram (§3). Divergência registrada; resolvê-la é com infra |

---

## 9. Como reproduzir esta apuração

```bash
# ⚠️ export TZ=UTC é obrigatório: `gh` devolve UTC e `git log` devolve o fuso local.
# Sem isso, a medição da abertura da issue erra por 3 horas — e o veredito inverte.
export TZ=UTC

# 1. A go-live não existe mais (e existiu)
git ls-remote origin | grep -i "go.live"           # vazio
git log --all --oneline --grep='go-live' -i        # 41f49243, de 07/07/2026

# 2. Onde a main REALMENTE esteve (--first-parent, ou a medida mente)
git log --first-parent origin/main --format='%h %ad %s' --date=iso-strict | head

# 3. A distância na abertura da #873 (2026-08-25T15:12:15Z)
MAIN=$(git rev-list -1 --first-parent --before="2026-08-25T15:12:15Z" origin/main)
DEV=$(git rev-list -1 --first-parent --before="2026-08-25T15:12:15Z" origin/dev)
git rev-list --count $MAIN..$DEV                   # 572 — não 794

# 4. O alvo do CA4 já está na main
git merge-base --is-ancestor 45b74d2e origin/main && echo "já é ancestral"

# 5. A aplicação não sabe dizer sua própria versão
grep -n "'/health'" src/shared/http/app.ts         # → { status: 'ok' }
```

---

## 10. Fontes primárias usadas

Nenhuma afirmação deste documento se apoia em outro documento do `handbook/`.

- **Comandos executados** — `git ls-remote`, `git log --first-parent`, `git rev-list --count`,
  `git merge-base --is-ancestor`, `gh pr view`, `gh issue view` (saída literal citada em cada seção).
- **Código do core-api** — `src/shared/http/app.ts:186` · `Dockerfile:84-89` ·
  `.github/workflows/qa-image.yml:7-10`.
- **Repositório de infraestrutura** — `docs/adr/0003-producao-aws-ecs.md` (Aceito, 30/06/2026) ·
  `docs/runbooks/ci-cd-pipeline.md` · `docs/runbooks/deploy-and-operations.md` ·
  `platform/README.md` · `platform/aws-ecs-prod/README.md` · `docs/environments.md`.

> **Uma divergência interna do repositório de infraestrutura, para quem for atrás.**
> `docs/environments.md:53-66` descreve a promoção como `dev → staging → prod` por *"tag de release
> + janela de deploy"* e afirma *"❌ **Nunca** deploy direto de `dev` para `prod`"*. Esse caminho
> **não existe**: o mesmo arquivo marca `staging` como *"🔵 a provisionar"* (`:16`), e o ADR-0003 —
> posterior e **Aceito** — descreve o gatilho como a `main`. O próprio `environments.md` se declara
> *"🔵 PLANEJADA"* na primeira linha. **O ADR vence**; o `environments.md` descreve um alvo, não o
> presente.

---

<sub>Apurado em 03/09/2026 contra `origin/dev@459209f7` e `origin/main@571a14d7`. Somente-leitura:
nenhum host foi tocado e nada foi alterado fora desta branch. Este documento é um **recorte
datado** — o estado canônico vive no git, no `gh` e no console da nuvem.</sub>
