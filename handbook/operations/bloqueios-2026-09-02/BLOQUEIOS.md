# 🚧 Levantamento de bloqueios — 02/09/2026

> **O que é:** varredura completa do que **impede trabalho** hoje — em produção, no ambiente, no
> backlog, na entrega e na máquina. Não é o backlog: é o subconjunto que **trava alguma coisa**.
>
> **Método:** medido contra `dev@ef034088`, `gh` ao vivo, gate local executado, e o estado real do
> git e da rede — não por leitura de issue. Onde a issue e o repositório discordam, o repositório
> venceu e a divergência está anotada como **premissa vencida**.
>
> **Regra de leitura:** issue aberta **não é** evidência de trabalho pendente — é evidência de que
> ninguém a fechou (lição registrada na #756 e na #750).

---

## 🔴 B0 — A esteira de Contas a Pagar está quebrada em PRODUÇÃO

**Este é o bloqueio principal, e são cinco issues que descrevem UM problema:** hoje, em produção,
**não é possível aprovar nem pagar**. Cada uma foi aberta separadamente e nenhuma diz que as outras
existem — juntas, elas fecham a esteira inteira.

```
aprovar ──✗ #881 ──► Transmitido ──► gerar remessa ──✗ #942 ──► bucket ──► banco
   │                                        │
   └── depende de dado que não existe       └── 5xx opaco: 6 causas, 1 mensagem
       em produção (payable:approve)

     tudo isso sobre:  #930 (31 pools > max_connections)  e  #873 (produção 794 commits atrás)
```

| # | O que trava | Por quê | Severidade |
| :-- | :--- | :--- | :--- |
| **#881** | **Aprovação inoperante para 100% dos usuários** | O gate do #609 lê `payable:approve` **direto da tabela**, que está vazia em produção. `AUTH_RBAC_MODE=bypass` **não alcança** — o que recusa não é o RBAC, é a regra de domínio. Aprovar é pré-requisito de `Transmitido` (`remittance-approval.ts`) ⇒ **trava a esteira inteira** | 🔴 P1 · `needs-decision` |
| **#942** | Gerar remessa falha com **5xx opaco** numa conta-cedente válida | Seis slugs distintos (`remittance-persist-failed`, `-nsa-unavailable`, `-build-failed`, `-file-name-failed`, `-malformed-file`, `-upload-failed`) chegam ao cliente como **o mesmo texto**. Causas pedem ações opostas — "corrija o cadastro" × "tente de novo" × "abra chamado". **A causa-raiz do bloqueio é desconhecida**; é o que a issue pede investigar | 🔴 P1 |
| **#938** | Validar em produção que a conta migrada aceita o convênio | CA5 da #879 · `BlockedBy` | 🔴 P1 |
| **#930** | **31 pools num boot** contra o mesmo banco | Eram **14** no Incident-0001, que esgotou o RDS. O piso ocioso (**62 conexões**) já excede sozinho o `max_connections=60` medido à época. ⚠️ **O CA5 não foi feito:** ninguém confirmou o `max_connections` de hoje — a severidade é estimada, não medida | 🔴 P1 |
| **#873** | Produção **794 commits atrás** da `dev` | A promoção carrega migrations sobre dados vivos e duas decisões que não são técnicas. ⚠️ **Premissa vencida — ver B5** | 🔴 P1 · `needs-decision` |

> **Ordem sugerida:** **#881 primeiro** — é o único que bloqueia 100% dos usuários e não depende de
> investigação. Depois **#930 CA5** (medir o `max_connections` real é barato e decide se a #930 é
> alta ou crítica). **#942** exige investigação com acesso a produção.

---

## 🟠 B1 — Bloqueios de ambiente e de máquina (baratos de resolver)

| # | Bloqueio | Efeito medido | Como sai |
| :-- | :--- | :--- | :--- |
| **B1.1** | **Tailscale está parado** neste Mac (`Tailscale is stopped`) | 🔴 **6 MCP servers caídos** (`acdg-skills`, `database`, `docker-docs`, `incus`, `reverse-proxy`, `security`) — os hosts não resolvem. Sem eles: sem consulta à teoria canônica, sem MySQL do x99, sem Incus. **E sem o x99 não há onde validar PR nem rodar a simulação da VAN** | ligar o Tailscale |
| **B1.2** | Sem `MYSQL_INTEGRATION=1` a suíte de integração **pula e finge verde** | Cobertura ilusória em qualquer validação local | exportar a env ao validar |
| **B1.3** | Não há workflow de **deploy** neste repositório | `.github/workflows/` tem só CI, integração, audit, semgrep, `qa-image` (publica imagem em merge na `dev` — **não deploya**). O deploy vive fora (ERP-INFRA / CodePipeline) — por isso ninguém aqui consegue responder "qual commit está em cada ambiente" | é a **Discussion #958** |

---

## 🟡 B2 — Bloqueios de decisão humana (esperam gente, não código)

Todos já têm canal aberto em **Discussions › Q&A** (habilitado em 02/09). Nenhum sai sozinho.

| Discussion | Espera | Trava | Parado desde |
| :-- | :--- | :--- | :--- |
| **#955** | banca de arquitetura + DevOps + dono do legado | schema do marco M3 · migração do Financial Core · fronteira de entrada (ADR-0018) | **07/05 e 14/05** (~3 meses) |
| **#956** | P.O. / consultoria + TL | **~470 h** de escopo comercial (M1–M4 + bundle P0). **D3 e D4 bloqueiam os dois relatórios Nibo; D2 bloqueia a M4 inteira** | 06/08 |
| **#957** | banco · infra · P.O. | 7 incógnitas operacionais da VAN — certificado, SLA de retorno, rede, custo, rotação de segredo. Nada quebra hoje; **tudo quebra no 1º incidente** | 24/08 |
| **#954** | P.O. (e talvez o banco) | Pix por chave × bloco bancário. **Caminho empírico já existe** e não depende do banco: emitir com zeros em homologação → Validador Universal → o laudo vira o teste. **Falta dono para executar** | 02/09 |
| **#958** | quem opera o pipeline | qual commit está em cada ambiente (cruza com #873 e #407) | 31/08 |

**Inquiries `blocked`/`open` sem canal (por escolha):** 0015 (upstream do Drizzle, sem interlocutor) ·
0026 (falta **medir**, não decidir) · 0030 (falta **desenho**) · 0031 (**zero perguntas** — só falta
promover a `decided`) · 0027 e 0035 (decisão só do dono do repo) · 0019 (já tem recomendação, falta
ratificar).

---

## 🟣 B3 — Bloqueios de dependência entre tarefas

| Cadeia | Regra |
| :--- | :--- |
| **#826** `BlockedBy` | PATCH de vencimento exige `expectedDueDate` — **BREAKING já na `dev`**. Fica 400 até o front enviar. Bloqueio **cruzado de repositório** |
| **#132 / #131** `BlockedBy` | bounce handling e observabilidade do outbox de e-mail |
| **#938** `BlockedBy` | depende da validação em produção da #879 |
| **CNAB — ordem obrigatória** | `#837 → #891 → #838` (as três **já fechadas em 01/09**) — registrado porque cada uma sozinha **reabre a #837**; vale para qualquer reversão |
| **#945 — ordem obrigatória** | emissor escreve zeros ⟶ homologação ⟶ Validador ⟶ **só então** o pré-voo relaxa. Inverter reabre a #837, e a recusa cai **depois** do `allocateNsa` ⇒ **queima NSA a cada tentativa** |
| **#948** | 3 recusas do emissor Pix sem contraparte no pré-voo — mesma classe, portas novas |

---

## 🔵 B4 — Bloqueios de entrega (o que está pronto e não passou)

**Gate local: ✅ VERDE** em `dev@ef034088` — medido, não presumido:

```
typecheck  ✅  tsc --noEmit limpo
lint       ✅  eslint limpo
test       ✅  tests 11656 · pass 11632 · fail 0 · skipped 19 · todo 5 · 123s
```

⚠️ **Duas leituras que enganam neste output, e ambas já mordidas antes:**

1. O `node:test` imprime `todo` **dentro da seção `✖ failing tests`**. Há um ali
   (`native-pdf-real.local.test.ts` — hex Identity-H sem `/ToUnicode`, issue **#388**) e ele **não é
   falha**: `fail 0`, exit code 0. **Ler o sumário, nunca a seção.**
2. Os **19 skipped** não são cobertura — são a suíte de integração pulando por falta de
   `MYSQL_INTEGRATION=1` (ver **B1.2**) e os testes de compose que skipam sem Docker. Verde local
   **não** significa integração provada.

| Item | Estado | O que falta |
| :--- | :--- | :--- |
| **PR #951** (`fix/etl`, fecha a **#487** P1) | ✅ **18/18 checks SUCCESS**, `mergeState=CLEAN` | ~~**review humano** — `reviewDecision` vazio, e a `dev` exige conversa de review resolvida~~ ⚠️ **corrigido em 03/09 — ver B5** |
| **PR #952** (triagem do backlog) | ⚠️ `mergeState=**BEHIND**` | `gh pr update-branch` (**nunca** `--admin`) + ~~review~~ ⚠️ **corrigido em 03/09 — ver B5** |
| Worktrees `resgate-517` e `sanitarizacao` | PRs **#950 e #949 já MERGED** | são **resíduo** — podem ser removidas |
| Branch `chore/rules-and-specs-overhaul` | órfã, **+6 commits**, parada desde **31/07** | é caso da inquiry 0027 (teses órfãs) — decidir o que vira trabalho |
| 28 branches remotas já integradas | não deletadas | limpeza, não bloqueio |
| Árvore local | `handbook/operations/triagem-2026-09-02/` **untracked** na árvore principal enquanto o PR #952 a versiona na worktree; `worktree.ckp` untracked | resolver ao mergear o #952 |

---

## ⚫ B5 — Premissas vencidas (a issue afirma o que o repositório não confirma)

| Onde | A issue diz | O repositório diz |
| :--- | :--- | :--- |
| **#873** (P1) | *"A branch `go-live`, que alimenta produção, está 794 commits atrás"* | **`origin/go-live` NÃO EXISTE.** `git ls-remote --heads origin` lista 31 branches e nenhuma é `go-live`. A `main` está **6 commits** atrás da `dev`. O CA4 pede *"promoção da `go-live` até `45b74d2e`"* — para uma branch inexistente |

⚠️ **Isto precisa ser resolvido antes de qualquer plano de release**, porque o P1 mais estrutural do
backlog está escrito sobre um objeto que não existe. Duas saídas: a branch foi apagada (e o caminho
para produção mudou — qual é?), ou nunca existiu com esse nome. **Nenhuma das duas se resolve
escolhendo o texto mais bonito.**

### Nota de correção (03/09/2026) — a B4 tinha uma premissa vencida da mesma família

O texto original da **B4** dizia que o **PR #951** esperava *"review humano — `reviewDecision` vazio,
e a `dev` exige conversa de review resolvida"*, e que o **#952** esperava *"`update-branch` + review"*.
**Isso funde dois requisitos diferentes e conclui errado.** O texto foi mantido riscado acima porque
o valor deste documento é ser um recorte datado honesto — apagá-lo esconderia o erro em vez de
registrá-lo.

O que a proteção da `dev` realmente exige, medido em **03/09/2026 UTC** (02/09, 23h40, no horário
local — daí a correção ser um dia depois de um documento datado 02/09) com
`gh api repos/ERP-Bem-Comum/core-api/branches/dev/protection`:

| Requisito da `dev` | Valor real | Consequência |
| :--- | :--- | :--- |
| `required_approving_review_count` | **0** | **nenhuma aprovação é exigida para mergear** |
| `required_conversation_resolution` | **true** | threads de review abertos precisam ser resolvidos — **e os três PRs têm 0 threads** |
| `required_status_checks.strict` | **true** | a branch precisa estar **em dia com a `dev`** — é *isto*, e não review, que produzia o `BEHIND` do #952 |
| checks obrigatórios | `integração (gate)` · `typecheck + format + lint + test` · `semgrep (ADR-enforcer)` · `commit-policy (Assisted-by)` | são os quatro contextos que barram |

**A leitura errada foi do campo `reviewDecision`.** Ele vazio significa que ninguém **opinou**, não
que alguém **precise** opinar. A prova literal: os três PRs têm `reviewDecision: null` **e**
`reviews.totalCount: 1` — o review existe (é o bot do Copilot, em estado `COMMENTED`, dizendo que
não conseguiu revisar), e mesmo assim a decisão é nula, porque `COMMENTED` não decide nada.

Quem confirma pelo lado do GitHub é o `mergeStateStatus`: ele devolve `BLOCKED` quando falta
requisito de proteção e `CLEAN` quando o PR está pronto. O **#951** e o **#964** vieram **`CLEAN`**;
o **#952** veio `BEHIND` — resolvido por `gh pr update-branch 952` em 03/09, e hoje também `CLEAN`.

**O que de fato falta aos três PRs, então, é revisão técnica como higiene** — o #951 fecha um P1 —,
não requisito de merge.

---

## 🚨 B6 — Exposição de dado real em repositório público

**A issue #942 (aberta, P1) contém dado bancário real de cadastro** no corpo: identificação da conta,
agência, conta corrente e o número do convênio — repetido duas vezes, uma delas em análise textual.

O `CLAUDE.md` proíbe isto de forma nominal:

> *"Nunca escrever o valor na mensagem de commit, no assert ou na issue — o CI é público, e explicar
> a correção citando o dado a repete."*

**Por que passou:** o gate `tests/cleanup/bank-fixture-masking.test.ts` cobre **fixtures no
repositório**. **Não existe régua alguma para o corpo de uma issue** — que é exatamente o caminho por
onde o dado saiu. É o padrão "a régua certa não se propaga sozinha": existe num lugar e falta em N.

**Varredura feita:** das 400 issues (abertas + fechadas), **só a #942** tem o padrão. Caso único, não
sistêmico.

**Ações:**

1. Redigir o corpo da #942 substituindo os valores por descrição genérica, com nota de edição.
2. Decidir se o gate deve cobrir issues (não é trivial: o gate roda no CI sobre arquivos, não sobre a
   API do GitHub — talvez seja um passo do `issue-report`, não um teste).

---

## 📊 Quadro-resumo

| Grupo | Itens | Natureza |
| :--- | :--: | :--- |
| **B0** esteira de pagamento em produção | 5 | 🔴 trava operação **agora** |
| **B1** ambiente e máquina | 3 | 🟠 barato, destrava validação |
| **B2** decisão humana | 5 | 🟡 **não sai sem gente** |
| **B3** dependência entre tarefas | 6 | 🟣 ordem obrigatória |
| **B4** entrega | 6 | 🔵 mecânico |
| **B5** premissa vencida | 1 | ⚫ **corrigir antes de planejar release** |
| **B6** exposição de dado | 1 | 🚨 corrigir hoje |

### Se for para atacar em ordem

1. **B6** — redigir a #942 (minutos, e é dado exposto agora)
2. **B1.1** — ligar o Tailscale (segundos, destrava 6 MCP + o x99 + validação de PR)
3. **B5** — resolver o que é o caminho para produção hoje (a #873 é P1 e está escrita sobre uma branch inexistente)
4. **B4** — review do **#951** (P1 pronto, 18/18 verde) e `update-branch` no **#952**
5. **B0.#881** — a única coisa que bloqueia 100% dos usuários em produção
6. **B0.#930 CA5** — medir o `max_connections` real (barato, decide a severidade)
7. **B2** — cobrar as 5 discussions; a **#954** é a única que já tem caminho e só precisa de dono

---

<sub>Levantado em 02/09/2026 contra `dev@ef034088`. Gate local verde (typecheck + lint). Este
documento é um **recorte datado**, não fonte de verdade: o estado canônico vive no `gh`, no git e no
código. **Correção de 03/09/2026** aplicada à seção B4 e registrada na B5 — ver *Nota de correção*.</sub>
