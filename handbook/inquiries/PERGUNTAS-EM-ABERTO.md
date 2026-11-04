[← Voltar ao README de Inquiries](./README.md)

# ❓ Perguntas em Aberto

> Checklist executivo das perguntas pendentes nas inquiries de estado **`open`** e **`blocked`**. O estado
> canônico vive no frontmatter de cada arquivo — este documento **não** é fonte de verdade de estado, é
> recorte de _o que ainda falta responder_. Para contexto, fundamentação e alternativas pesadas, sempre
> voltar à inquiry-fonte linkada em cada bloco.

- **Última revisão da prosa:** 2026-11-04 — revisão dos 90 dias das sete inquiries paradas desde 06/08: 0011, 0014, 0027 e 0028 viraram `decided`, 0012 `superseded`, 0015 e 0019 `deferred` com gatilho; os sete blocos saíram daqui (revisões anteriores em 2026-09-01, 2026-08-17 e 2026-08-07)

<!-- BEGIN:generated -->

- **Inquiries cobertas:** 7 de 38 — [0026](./0026-async-human-in-the-loop-and-drizzle-1-0.md) · [0030](./0030-deadman-switch-nunca-vigiou.md) · [0031](./0031-deadlock-na-reserva-atomica-de-remessa.md) · [0032](./0032-titulo-remetido-fronteira-do-agregado.md) · [0035](./0035-norma-de-migration-e-proibicao-de-odku.md) · [0036](./0036-onde-a-documentacao-deve-viver.md) · [0038](./0038-fim-do-compose-como-modelo-de-execucao.md)
- **Total de perguntas em aberto:** **18**

As demais 31 estão `decided` (23), `deferred` (5, com gatilho declarado) ou `superseded` (3) — nenhuma
espera resposta de alguém. Ver [`INDEX.md`](./INDEX.md).

<!-- END:generated -->

---

## Visão geral

| Inquiry | Estado | Aguardando | Bloqueia | # |
| :--- | :--- | :--- | :--- | ---: |
| [0026](#inquiry-0026--assíncrono-human-in-the-loop-drizzle-10-e-bruno--ts) | `open` | Gatilho declarado — só (c) é medível hoje | Épico de aprovação por e-mail; major do ORM; possível supersede do ADR-0038 | 4 |
| [0030](#inquiry-0030--o-dead-mans-switch-que-nunca-vigiou) | `open` | Ninguém — falta desenho, não decisão | Supersede do [ADR-0042](../architecture/adr/0042-deadman-switch-redundant.md); detecção de job morto segue descoberta | 2 |
| [0031](#inquiry-0031--deadlock-na-reserva-atômica-de-remessa) | `open` | **Nada — o gatilho de fechamento está cumprido.** Falta decidir se vira `decided` | PR [#814](https://github.com/ERP-Bem-Comum/core-api/pull/814); a proteção contra dupla emissão da [#789](https://github.com/ERP-Bem-Comum/core-api/issues/789) não entra em produção; piloto VAN (#756) | 0 |
| [0032](#inquiry-0032--título-remetido-pertence-ao-documento) | `open` | ✅ P.O. respondeu a forma da recusa na tela em 02/09; restam as 4 saídas, que são execução | ADR novo sobre a fronteira `Document`↔`Payable`; a Fatia B do ajuste de nota, cuja decisão de base era esperar o merge do PR [#814](https://github.com/ERP-Bem-Comum/core-api/pull/814) — premissa vencida, ele já está integrado; a `.claude/rules/domain.md`, que passa a mentir sobre o código assim que a S1 entrar | 4 |
| [0035](#inquiry-0035--duas-normas-que-a-medição-contradiz) | `open` | Dono do repo — as duas saídas mexem em norma, não em código | Anti-padrão nº 4 do `CLAUDE.md`; §"Padrão de upsert" do [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) — nenhuma bloqueia código hoje | 4 |
| [0036](#inquiry-0036--onde-a-documentação-deve-viver) | `open` | Dono do repo + o MCP `acdg-skills` de volta ao ar, para inventariar o que já indexa | Nada de código — decide o layout do repositório: 1.442 arquivos (84 % do volume) e 707 citações do harness | 2 |
| [0038](#inquiry-0038--o-fim-do-composeyaml-como-modelo-de-execução) | `open` | Dono do repo em (a); em (b), olhar o `ERP-INFRA` | Remoção dos serviços do `compose.yaml` — hoje o único caminho local de integração, usado pelos 4 scripts de e2e; e a direção `compose → taskdef` que três artefatos afirmam e o [ADR-0068](../architecture/adr/0068-env-fail-fast-every-environment.md) nega | 2 |

---

## Inquiry-0026 — Assíncrono human-in-the-loop, Drizzle 1.0 e Bruno × TS

> **Origem:** [`0026-async-human-in-the-loop-and-drizzle-1-0.md`](./0026-async-human-in-the-loop-and-drizzle-1-0.md) §2 e §3
> **Aberta em:** 2026-08-05 · **Destinatário:** investigação interna medida — sem consulta externa
> **Por que importa:** o [ADR-0058](../architecture/adr/0058-runtime-tracks-recommended-lts.md) §3 exige que troca
> estrutural seja justificada por inquiry que **meça**, não que argumente. Esta é o instrumento que ele nomeia.

- [ ] **1.** O outbox + polling atual sustenta um fluxo **human-in-the-loop** (solicitação → e-mail → callback externo → transição de estado), ou o desenho pede fila/workflow engine? _Falta medir: latência do `runLoop`; se o callback é entrada HTTP comum e já cabe; retry e dead-letter; agendamento futuro ("reenviar em 3 dias"); coordenação multi-instância do worker de outbox._
- [ ] **2.** Quais limitações do outbox são reais **neste** volume e quais são teóricas?
- [ ] **3.** O `drizzle-orm@1.0.0` muda alguma premissa de (1), e o que custa em 8 módulos? **Medido em 2026-09-01 — 3 dos 4 itens fechados:** o custo **não** é "8 módulos"; **6 dos 7 breaking changes obrigatórios são inertes** aqui, `relations-v2` não obriga reescrever **nada** (o repo nunca adotou o RQB v1 — zero `relations()`/`db.query.*`), e o `drizzle-kit` **não tem `1.0`**, o que torna o major inexecutável hoje. O que resta é o formato v3 da pasta de migração — 123 `.sql`, 123 snapshots, 7 journals já aplicados em produção. _Falta medir: se collation ganhou suporte de primeira classe (aposentando o `customType`), que cruza com a [0015](./0015-charset-drizzle-roadmap.md)._
- [ ] **4.** Os 242 `.bru` cobrem algo que os 179 `inject` não cobrem, ou são camada duplicada com supply-chain próprio? _Falta medir: quanto é duplicata; o que só o servidor real pega (rede, CORS, helmet, rate-limit); o que se perde sem o app do Bruno; se as 2 exceções de supply-chain saem junto; o custo dos 17 ponteiros históricos._

**Gatilhos declarados — o que destrava cada uma:**

| Troca | Gatilho | Medível hoje? |
| :--- | :--- | :--- |
| (a) assíncrono | o épico de aprovação entrar no roadmap | não — seria especular sobre requisito inexistente |
| (b) Drizzle 1.0 | **duplo (refinado em 2026-09-01):** `drizzle-orm@1.0.0` **e** `drizzle-kit@1.x` ambos em `latest`, ambos cumprida a quarentena de 24h (`minimumReleaseAge`) | não — `drizzle-orm` em `1.0.0-rc.5` (2026-08-12) e **`drizzle-kit` sem `1.0`**; sem o kit, o formato v3 de migração não existe |
| (c) Bruno × TS | nenhum evento externo | **sim, e barato** — cruzar as rotas dos 242 `.bru` com as dos 179 `inject` responde em uma sessão |

⚠️ **A armadilha que (c) precisa evitar:** o ADR-0038 nasceu de 24 de 26 falhas serem `.bru` desalinhados com o
servidor, porque a coleção não tinha runner e apodreceu sem ninguém ver. Trocar Bruno por TS resolve isso **se e
somente se as coleções morrerem junto** — se sobreviverem como documentação, o problema volta com os papéis invertidos.

---

## Inquiry-0030 — O dead-man's switch que nunca vigiou

> **Origem:** [`0030-deadman-switch-nunca-vigiou.md`](./0030-deadman-switch-nunca-vigiou.md) §5 e §7
> **Aberta em:** 2026-08-17 · **Destinatário:** ninguém — não espera resposta de terceiro, espera **desenho**
> **Por que importa:** o mecanismo do ADR-0042 foi construído inteiro (emissor Go com HMAC, dois planos de
> ingestão, dois workflows, contratos de dados) e **nunca recebeu um único ping** — `deadman/history.jsonl`
> ficou em 0 linhas do início ao fim, porque o emissor jamais foi implantado. O auditor rodou 23 vezes e
> escreveu 22 vereditos, todos em bootstrap. Em 2026-07-24 parou até de rodar, quando a proteção da `main`
> passou a recusar o `git push` do keep-alive — e ficou **24 dias vermelho sem ninguém notar**, porque o
> único canal por onde ele se manifestava era justamente esse push. Código removido em 2026-08-17.

**Bloqueador para fechar:** não há pergunta a responder nem terceiro a consultar — falta **desenhar a
substituição**. O ADR-0042 segue `Accepted` e **não superado**: não decidimos parar de detectar job morto,
decidimos parar de manter um mecanismo que nunca detectou. O ponto cego fica descoberto até lá.

- [ ] **D1.** Desenhar a substituição atendendo aos cinco requisitos da §5 — com destaque para os dois que
      mataram a tentativa anterior: **o vigia precisa de quem o vigie** (silêncio não pode ser
      indistinguível de "tudo bem") e **custo de operação compatível com o valor** (o desenho antigo pedia
      emissor compilado, deploy próprio, Object Storage e dois workflows para vigiar **um** job — foi caro
      demais para ser terminado). Vira ADR novo com `supersedes: [ADR-0042]`, e esta inquiry fecha nele.
- [ ] **D2.** Decidir o destino das issues abertas do épico #67 que descrevem o mecanismo removido
      (#70, #71, #72 e a #368 dos 14 falsos positivos).

> _(A §5 da inquiry pede explicitamente para reabrir a rejeição de SaaS de heartbeat: o ADR-0042 a
> descartou pesando controle, custo e privacidade contra um custo de construção que se assumiu pagável — e
> que, medido agora, nunca foi pago.)_

---

## Inquiry-0031 — Deadlock na reserva atômica de remessa

> **Origem:** [`0031-deadlock-na-reserva-atomica-de-remessa.md`](./0031-deadlock-na-reserva-atomica-de-remessa.md) §4 e §6
> **Aberta em:** 2026-08-21 · **Destinatário:** Gabriel — não espera resposta de terceiro, espera **escolha** entre quatro alternativas já medidas
> **Por que importa:** a reserva do PR #814 fecha a janela TOCTOU da #789 (mesmo título em duas remessas =
> pagamento em dobro), mas duas emissões concorrentes entram em **deadlock 1213** — medido em **20/20
> rodadas** contra MySQL 8.4.11 real. A causa é o `SELECT … FROM fin_remittances WHERE id = ? FOR UPDATE`
> do ramo de criação, que busca uma linha **inexistente** e por isso trava o **vão** (gap lock) em vez do
> registro; o `INSERT` da concorrente precisa de _insert-intention_, que conflita com esse vão. O código do
> gap lock é **pré-existente** — o PR só alongou a espera entre pegá-lo e chegar ao INSERT. Comportamento é
> **fail-safe** (nenhuma gravação dupla em 35 rodadas), mas o operador recebe "banco indisponível" em vez de
> "o título já está em outra remessa", e emissão legítima morre por ruído de concorrência.

**Bloqueador para fechar: nenhum.** O gatilho declarado no cabeçalho da inquiry era *"existir decisão
sobre qual das quatro alternativas adotar, com o efeito colateral do braço escolhido medido"* — e as duas
partes estão cumpridas desde 24/08: braço **A** decidido e aplicado, verificado com contrafactual (40
rodadas, 0 deadlocks), efeito colateral medido no ramo de update (sem ciclo novo; custo só de cauda) e a
rota contra o hard replace refutada. **Todas as caixas fechadas.**

⚠️ **Uma inquiry `open` com zero perguntas é uma contradição a resolver, não um estado.** O que falta é a
decisão editorial de promovê-la a `decided` — e as duas lacunas que restam pertencem a outros lugares: o
`delete()` com `CASCADE` (não medido, rota distinta) e a classificação do `1451`, que já é a `S3` da
[0032](#inquiry-0032--título-remetido-pertence-ao-documento).

- [x] **D1.** ~~Escolher entre as quatro alternativas da §4.3~~ — **braço A** (inverter a ordem de
      aquisição), decidido e aplicado em 2026-08-23 na branch `chore/integra-frentes-abertas`: o
      `FOR UPDATE` sobre `fin_payables` subiu para o topo da transação do `save`, antes da busca em
      `fin_remittances`. **Verificado em 2026-08-24** contra MySQL 8.4.11 real: 40 rodadas, **0
      deadlocks**, 40/40 perdedoras com o erro de negócio — e o contrafactual (só a ordem desfeita)
      deadlockando no mesmo instrumento, que é o que autoriza ler o zero como correção.
- [x] **D2.** ~~Medir o efeito colateral do braço (A)/(B)~~ — **medido em 2026-08-24**. O ramo de
      **update** travando `fin_payables` não cria deadlock novo, não gera lock-wait e não bloqueia o
      INSERT de um título novo (20/20 passaram). O custo é de **cauda**: mediana igual (119ms vs
      103ms), pior caso ~3× (428ms vs 140ms) — com N=20, ordem de grandeza, não número fino. A razão
      é o modo do lock: `X,REC_NOT_GAP` sobre os registros pedidos, sem gap com que a
      insert-intention da concorrente pudesse conflitar.
- [x] **D5.** ~~Medir o `save` de update × hard replace do documento~~ — **medido em 24/08 e
      REFUTADO**. 0 deadlocks em 20 rodadas, controle positivo em 6/6 na mesma bancada, e o
      contrafactual `pre` (sem lock algum em `fin_payables` no update) dando resultado idêntico: o
      braço A não mudou nada neste caminho. O ramo de update só faz `UPDATE fin_remittances` e nunca
      insere em `fin_remittance_payables`, logo nunca pede lock em `fin_documents` — sem essa aresta
      não há ciclo. **O ciclo é privativo do ramo de criação**, e o efeito colateral do braço A está
      medido até o fim.
- [x] **D3.** ~~Reforçar o teste `a emissão que perde a corrida não deixa rastro algum`~~ — a cegueira
      foi **confirmada** (verde em 8 de 8 rodadas com deadlock acontecendo), mas o remédio já existia:
      o irmão `duas emissões do mesmo título: exatamente uma grava, a outra perde com nome próprio`
      exige o erro nominal e ficou **vermelho nas mesmas 8**. Em vez de teste novo, os dois ganharam
      a anotação de que **não são duplicata** — um fixa atomicidade, o outro fixa o desfecho.
- [x] **D4.** ~~Corrigir as duas afirmações falsas no comentário de `remittance-repository.drizzle.ts`~~ —
      **feito em 2026-08-23**, na branch `chore/integra-frentes-abertas`. O comentário agora diz que a
      citação do Refman §17.7.3 só vale porque **aqui** o registro é encontrado, atribui o deadlock ao gap
      do passo 1 (id inexistente) e troca a promessa sobre o plano de execução pelo que foi medido:
      `fin_payables_status_idx`, `supremum + 3 registros` com next-key.

> _(As duas afirmações erradas citavam o Refman **corretamente**. O erro foi aplicar a passagem certa ao
> ramo errado — e ambas foram "verificadas" por leitura, nunca por medição. Ver §3.6 e §3.8.)_

---

## Inquiry-0032 — Título remetido pertence ao documento?

> **Origem:** [`0032-titulo-remetido-fronteira-do-agregado.md`](./0032-titulo-remetido-fronteira-do-agregado.md) §5 e §6
> **Aberta em:** 2026-08-23 · **Destinatário:** P.O. (decisão de produto, pendente) e Gabriel (execução das saídas decididas)
> **Por que importa:** um título já enviado ao banco não pode ser apagado por um `save` do documento — e a
> recusa precisa **dizer ao operador o quê e por quê**, não devolver erro genérico. A decisão de produto
> registrada é parcial ("deixe explicado no ERRO que lançarmos que é recusa e por quê; no front a P.O.
> poderá nos corrigir"), e a segunda pergunta — o que o operador deveria ver ao corrigir uma nota cujo
> título já foi remetido — segue sem resposta da P.O.

**Bloqueador para fechar:** as quatro saídas abaixo já estão **decididas** e esperam execução, não decisão.
~~O que ainda espera terceiro é a forma da recusa na tela.~~ ✅ **[02/09] A forma da recusa na tela foi
respondida pela P.O.** — recusa antecipada por `FieldLocks` (campos financeiros somente-consulta, motivo
visível), mensagem nomeando **qual título e em qual remessa**, e **sim** ao caminho de escape para campos
não-financeiros (o `editMetadata` já os preserva). Texto integral em `0032-…md` §3 e na discussion #956.
O encanamento de erro nomeado no front entrou em 02/09 (web-app#396). A decisão de base de 23/08 — a Fatia B esperar o
merge do PR #814, para não resolver conflito à mão na região onde a ordem dos locks se decide — **deixa de
valer nesta branch**, onde o #814 já está integrado.

- [ ] **S1.** Converter `DocumentError` inteiro para tagged error (invariante carrega evidência; validação
      simples fica nulária). Custo medido: **4** comparações por string — `generate-remittance.ts:85` e
      `bulk-update-due-date.ts:38,39,40`. ⚠️ Não converter pontualmente: string e objeto na mesma union
      forçam `typeof e === 'string'` em todo consumidor e quebram o exhaustive switch.
- [ ] **S2.** Atualizar `.claude/rules/domain.md` — ela prescreve string literal union e passaria a mentir
      sobre o código. Não é ADR, pode ser atualizada; mas deliberadamente, não como efeito colateral.
- [ ] **S3.** Classificar `1451` em `driver-error.ts` — o destino é o erro de recusa **com payload**, não um
      503 genérico. **Medido em 24/08:** chamando o repositório direto, o hard replace de documento com
      título em remessa viva falha `1451` **10 de 10 sem concorrência alguma** — é estado, não corrida.
      `driver-error.ts` declara `1213` e `1062`, não `1451` (conferido). ⚠️ O caminho HTTP **está
      guardado** (`adjust-document.ts:246` consulta e o domínio recusa com nome próprio), então o que
      resta é a janela entre a guarda, que roda FORA da transação, e o `DELETE`: se uma remessa nascer
      sobre aquele título nesse intervalo, o operador recebe `document-repository-failure` genérico
      existindo uma recusa nomeada a dois passos. **Severidade: média, latente — perde-se a mensagem,
      nunca o dado.**
- [ ] **S4.** `withDeadlockRetry` no `remittance-repository` — rede, não correção. ⚠️ A política atual é
      `maxAttempts: 3` **sem jitter**: duas transações que colidiram no mesmo instante voltam juntas.

---

## O que bloqueia o quê

```
0026 (a),(b) ──(gatilho)──► nada hoje             0026 (c) ──► medível agora, decide o ADR-0038
0026 (b) ──(quando disparar)──► reabre a 0015 (deferred, mesmo gatilho)
```

**As duas cadeias que esperavam a banca interna fecharam em 2026-11-04:** a fiscal (0014 → 0011 → ADR-0017)
foi respondida pelo ETL, e o ADR-0017 tem sucessor pendente na
[#1096](https://github.com/ERP-Bem-Comum/core-api/issues/1096); a de borda (0012) foi superada pela topologia
real. Das inquiries que restam aqui, nenhuma espera terceiro: ou dependem do dono do repo, ou de um gatilho.

---

## Como atualizar este arquivo

1. O estado canônico é o `state:` do frontmatter da inquiry, validado por [`tests/cleanup/inquiry-hygiene.test.ts`](../../tests/cleanup/inquiry-hygiene.test.ts) contra o conjunto fechado `open · blocked · decided · deferred · superseded`. Este arquivo **segue** aquele campo, nunca o contradiz.
2. Inquiry que sai de `open`/`blocked` → remover o bloco daqui e atualizar a contagem do topo.
3. Inquiry que entra em `open`/`blocked` com perguntas pendentes → adicionar bloco referenciando a fonte.
4. Pergunta respondida antes do fechamento → marcar `[x]` e riscar o texto, preservando o registro de que existiu (o bloco da 0012 fazia isso com a pergunta 6.4, resolvida antes do fechamento — ver a §6 de [`0012-bff-managed-api-gateway-vs-fastify.md`](./0012-bff-managed-api-gateway-vs-fastify.md)).
5. Atualizar **Última atualização** no topo.

---

## Inquiry-0035 — Duas normas que a medição contradiz

> **Origem:** [`0035-norma-de-migration-e-proibicao-de-odku.md`](./0035-norma-de-migration-e-proibicao-de-odku.md) §2 e §5
> **Aberta em:** 2026-09-01 · **Destinatário:** dono do repo — as duas saídas mexem em norma escrita, não em código
> **Por que importa:** nenhuma das duas produz defeito hoje. O custo é o de toda norma ficcional — quem lê o
> absoluto, não encontra a exceção escrita, e ou obedece contra a técnica ou desvia sem declarar. As duas têm a
> mesma forma: uma solução real generalizada para "sempre", que a prática depois teve de contrariar por razão
> técnica legítima.

- [ ] **(a1)** Reescrever o anti-padrão nº 4 do `CLAUDE.md` — hoje _"escrever migration à mão"_ é anti-padrão, e **46 das 123 migrations (37,4 %) foram editadas à mão**, por quatro limitações medidas do gerador (ordem por dependência, `ENGINE`/`CHARSET` que o Drizzle não expõe, fusão de cláusulas para `INPLACE, LOCK=NONE`, backfill entre DDLs). A norma proposta: _"gerar sempre, editar quando necessário, e **declarar** a edição"_ — o padrão que a `contracts/0020_busy_doctor_spectrum.sql` já pratica em 15 linhas de comentário.
- [ ] **(a2)** Se (a1) for aceita: o gate que cobra a declaração (marca de edição ⇒ comentário) entra em `tests/cleanup/`, com allowlist que nasce cheia e esvazia por fatia? _39 das 46 já têm comentário — a distância é curta._
- [ ] **(b1)** A proibição global de `ON DUPLICATE KEY UPDATE` na camada de agregado se sustenta **por uniformidade de padrão**, mesmo sem o risco do manual? _Medido: **0 dos 47 call sites** reúnem a condição do Refman ("tables with multiple unique indexes"); 44 são sobre tabela só-PK._ Se sim, o motivo escrito em `document-repository.drizzle.ts:8-12` precisa ser corrigido — hoje ele cita o manual, e o manual não sustenta o absoluto.
- [ ] **(b2)** Se (b1) for não: ADR novo que `supersede` a §"Padrão de upsert" do [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md), declarando a condição real (tabela com ≥ 2 uniques colidíveis no mesmo caminho de escrita). _ADR aceito não se edita._

⚠️ **Correção de citação, independente da decisão:** o docblock de `document-repository.drizzle.ts` usa a numeração do Refman **8.0** — cita "§13.2.6.2" e "§15.7" (na 8.4: §15.2.7.2 e §17.7) e, em `:20`, "§15.7.2.4", que **na 8.4 é "SET RESOURCE GROUP Statement"**. O texto invocado sobrevive; a paráfrase é que omite a condição.

**O que NÃO se decide aqui:** o custo do substituto de ODKU em contenção — não medido, e exige banco com dado.

---

## Inquiry-0036 — Onde a documentação deve viver

> **Origem:** [`0036-onde-a-documentacao-deve-viver.md`](./0036-onde-a-documentacao-deve-viver.md) §4 e §5
> **Aberta em:** 2026-09-02 · **Destinatário:** dono do repo — move 84 % do volume documental e reescreve 707 citações do harness
> **Por que importa:** o critério que decide o destino de cada pasta não é "isso é documentação?", e sim **"algum
> agente precisa `grep`ar isso?"** — Discussions e Issues são invisíveis para busca local. `handbook/reference/` é o
> caso extremo dos dois lados: quase imóvel (6 commits em 90 dias) e o mais acoplado de todos (707 citações em
> `.claude/`). Tirá-lo limpa toda busca no repositório; tirá-lo errado cega 12 agentes de uma vez.

- [ ] **(a)** Destino do `handbook/reference/` — 1.061 arquivos, 30 MB. Repo separado + submodule (o `grep` sobrevive, o clone emagrece, custa reescrever 707 caminhos) **ou** migrar para o MCP `acdg-skills`? _Bloqueado: o servidor está fora do ar (`ENOTFOUND mcp-server.tailf5e6ca.ts.net`), e decidir sem inventariar o que ele já indexa é escolher no escuro._
- [ ] **(b)** Destino do `handbook/specs/` — 381 arquivos, 2 citações, 4 commits/90d. Provável mesmo caminho de (a), mas o acoplamento é 350× menor: pode sair antes, e sozinho.

**O que NÃO se decide aqui:** o que já foi executado em 02/09 — `context/` removido com lápide declarada, `decisions/` promovido a `handbook/decisions/`, e o datado/episódico destinado a Discussions.

---

## Inquiry-0038 — O fim do `compose.yaml` como modelo de execução

> **Origem:** [`0038-fim-do-compose-como-modelo-de-execucao.md`](./0038-fim-do-compose-como-modelo-de-execucao.md) §9 e §4
> **Aberta em:** 2026-09-04 · **Destinatário:** dono do repo — (a) escolhe como a integração roda; (b) depende de olhar o `ERP-INFRA`
> **Por que importa:** o `compose.yaml` acumula **três papéis** (§3.4), e só um deles tem substituto declarado. O
> manifesto de unidades executáveis assume o papel de **declarar o que roda**; o papel de **infraestrutura efêmera de
> teste** segue sem dono. Remover o compose antes de decidir (a) tira o único caminho local de integração — os 4
> scripts de e2e sobem MySQL por ele.

- [ ] **(a)** Como substituir a infraestrutura efêmera de teste? As três opções, com custo medido na §9: `services:` do Actions **perde paridade de config** (sobe antes do checkout) e está barrado por gate ativo; `docker run -v ./docker/mysql/conf.d:…` preserva a paridade e roda em CI, Mac e x99, ao custo de reescrever 3 probes de readiness; compose reduzido só à infra preserva tudo, ao custo de remover ~460 linhas de aplicação (745 → ~270). _Acompanha a questão: manter algum caminho local de integração, ou e2e e integração passam a existir apenas como job do Actions?_
- [ ] **(b)** Existe gerador `compose → taskdef` no `ERP-INFRA`? Fecha a divergência de **direção** da §4: três artefatos (`tests/infra/module-driver-matrix-compose.test.ts:4-5`, `tests/infra/sync-permissions-compose.test.ts:4-5`, `.claude/rules/jobs-and-workers.md:33`) afirmam `compose.yaml → taskdef`; o [ADR-0068](../architecture/adr/0068-env-fail-fast-every-environment.md):28 afirma `console AWS → taskdef`, com o compose restrito ao local. _`grep -i taskdef` fora do `handbook/` devolve só prosa — não há gerador nesta árvore, o que inclina a favor do ADR-0068 mas não fecha: ele poderia viver no `ERP-INFRA`, que não está neste repositório._

**O que NÃO se decide aqui:** o que já está entregue e verde no gate (§8) — o manifesto declara as unidades executáveis e o que cada uma exige. A §7 lista as propriedades de `tests/infra/` que sobrevivem ao fim do compose e precisam ser **reapontadas ao manifesto antes** de remover os serviços, não depois.

---

> ⚠️ Este arquivo é mantido à mão. Ao mexer numa inquiry `open`/`blocked`, passe aqui **no mesmo commit** — a
> versão anterior ficou 3 meses divergindo do disco. Hoje `tests/cleanup/inquiry-hygiene.test.ts` cobra a
> correspondência nos dois sentidos: toda inquiry `open`/`blocked` precisa de bloco próprio, e bloco de inquiry
> já resolvida reprova.

> 🔁 Índice executivo — a fonte de verdade continua sendo cada inquiry individual.
