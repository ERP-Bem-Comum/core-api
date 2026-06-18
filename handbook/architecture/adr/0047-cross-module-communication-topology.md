[← Voltar para ADRs](./README.md)

# ADR-0047: Topologia de comunicação cross-módulo — read port síncrono vs projeção local

- **Status:** Proposed
- **Date:** 2026-06-17
- **Deciders:** Arquiteto técnico (pendente de ratificação)
- **Estende:** [ADR-0006](./0006-modular-monolith-core-api.md) (fronteira public-api) · [ADR-0015](./0015-mysql-outbox-pattern.md) (mecanismo outbox) · [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) (read-models via projeção) · [ADR-0032](./0032-transient-http-composition-read-until-bff.md) (leitura síncrona cross-módulo via public-api)
- **Instâncias:** [ADR-0043](./0043-partners-supplier-integration-events.md) · [ADR-0045](./0045-financial-supplier-read-model.md) · [ADR-0046](./0046-contracts-contractor-ref-integration-events.md)

---

## Contexto

O `core-api` é um modular monolith (ADR-0006): um processo, um banco por módulo (ADR-0014), módulos conversando **só** via `public-api`. Quando um módulo A precisa de um dado que pertence ao módulo B, hoje existem **duas topologias** em uso, escolhidas caso a caso:

- **Leitura síncrona** via read port da `public-api` (ADR-0032) — ex.: `contracts` lê `ContractorReadPort`/`ProgramReadPort` (`contractor-composition.ts`, `program-composition.ts`).
- **Projeção local** (read-model CQRS) mantida por outbox (ADR-0015/0022) — ex.: `fin_supplier_view` (ADR-0045), `par_contract_count_view` (ADR-0046).

Cada instância foi registrada (0043/0045/0046), mas **nunca houve a regra geral** que diz *quando* cada topologia é a correta. O efeito colateral: casos estruturalmente parecidos ("A precisa de dado de B") receberam topologias diferentes sem critério explícito — `contracts` lê contractor **síncrono**, `financial` espelha supplier **assíncrono** — e a assimetria *parece* inconsistência/gambiarra mesmo quando cada peça está localmente correta.

A teoria canônica é clara em dois pontos que sustentam a regra:

> "Thus, if executing a command on one Aggregate instance requires that additional business rules execute on one or more other Aggregates, use eventual consistency. […] Ask the domain experts if they could tolerate some time delay between the modification of one instance and the others involved."
> — Vaughn Vernon, _Implementing Domain-Driven Design_, p. 464 (`shared-references/ddd/ddd--vernon-livro-vermelho.md:9184`)

> "One of the simplest and most effective ways to publish Domain Events without coupling to components outside the domain model is to create a lightweight Observer […] there is no network involved […] All registered subscribers execute in the same process space with the publisher and run on the same thread. […] all subscribers are running within the same transaction."
> — Vaughn Vernon, _Implementing Domain-Driven Design_, p. 382 (`shared-references/ddd/ddd--vernon-livro-vermelho.md:7320`)

Ou seja: consistência eventual (e, portanto, o outbox) é escolha **deliberada** para regra que cruza fronteira e tolera atraso — **não** o default de "A precisa de um dado de B". Onde há um processo e uma transação, a leitura síncrona é o ponto de partida.

---

## Decisão

Dado que o **módulo A** precisa de um dado que pertence ao **módulo B**, a topologia é escolhida por **um discriminador**: *A apenas EXIBE o dado, ou A CONSULTA por ele?*

| # | Caso | Topologia | Mecanismo |
| :- | :--- | :--- | :--- |
| 1 | A só **EXIBE** (decora uma linha já selecionada pelos critérios próprios de A) | **N1 — read port síncrono** | `public-api` de B (variante batch por página, degradação graciosa). ADR-0032. |
| 2 | A **CONSULTA** por um campo de B (ordena / filtra / busca / pagina sobre ele) | **N4 — projeção local** | read-model CQRS mantido por outbox de B. ADR-0015/0022. Reconciliação periódica obrigatória se a projeção for contador incremental. |
| 3 | A precisa de **SNAPSHOT** histórico (congelar o valor no tempo, p/ auditoria) | **copiar no agregado** de A no momento do fato | não manter espelho vivo. |
| 4 | Read-model/projeção **intra-módulo** (A projeta os próprios eventos) | **projeção via event-delivery** ([ADR-0022](./0022-read-models-via-projection-over-event-stream.md)) | projeção sobre o event stream pelo caminho worker → `EventDelivery` → projetor, idempotente por `eventId`, reconstruível do log. Dado derivado que é **invariante do próprio agregado** pode ser computado síncrono na tx; **read-model consultável segue ADR-0022**. |

**Razão do discriminador:** um predicado de `ORDER BY` / `WHERE` / `LIKE` sobre um campo de B só desce para o SQL paginado de A se o campo **morar local** — daí a projeção (caso 2). Se A nunca consulta por aquele campo, a projeção não compra nada que um read port síncrono não entregue mais simples e com consistência forte (caso 1).

### Classificação dos fluxos atuais sob a regra

| Fluxo | Topologia atual | Caso | Veredito |
| :--- | :---: | :---: | :--- |
| `contracts` → `partners` (contractor, exibido no detalhe) | N1 | 1 | ✅ correto |
| `contracts` → `programs` (programa, exibido) | N1 | 1 | ✅ correto |
| `partners` → `contracts` (contagem; grids ordenam/filtram por ela) — `par_contract_count_view` | N4 | 2 | ✅ justificado (ADR-0046) · **requer reconciler** |
| `financial` → `partners` (fornecedor; grids filtram/buscam por nome/CNPJ) — `fin_supplier_view` | N4 | 2 | ✅ justificado (ADR-0045) |
| `contracts` → `ctr_timeline` (projeção via event-delivery) | projeção | 4 | ✅ correto — conforme ADR-0022 |
| `financial` → `fin_document_timeline` (escrita síncrona na tx do save) | sync-in-tx | 4 | ⚠️ desvia de ADR-0022 — decisão pendente |

`contracts` busca contratos por campos **próprios** (número, data) — nunca por nome do contractor/programa —, então contractor/programa são caso 1 (exibe). `partners` e `financial` **consultam** por campo alheio (contagem; fornecedor), então são caso 2 (projeção). A assimetria é **correta** e agora explicada pela regra.

---

## Consequências

### Positivas

- Existe um **critério único e testável** ("exibe vs consulta") que separa projeção justificada de projeção cargo-cult — futuras features deixam de re-derivar a decisão.
- As projeções existentes (ADR-0043/0045/0046) ficam **ratificadas como instâncias** da regra, não como exceções.
- A simetria do sistema fica legível: leitura-só-pra-exibir é síncrona; consulta-por-campo-alheio é projeção.

### Negativas

- A regra **expõe dívidas** que estavam invisíveis (ver "Itens de follow-up").
- Projeção do caso 2 carrega o custo de manutenção (worker + idempotência + reconciliação); aceito **somente** porque a necessidade de consulta o justifica.

### Neutras

- Nenhuma reescrita de fluxo cross-módulo é exigida por este ADR — todos os fluxos atuais já estão no nível correto após a classificação.

### Itens de follow-up (registrados como issues/tickets, fora do escopo deste ADR)

- 🔴 **`financial` produz eventos de forma não-atômica** — `repo.save(...)` seguido de `outbox.append(...)` em awaits separados (7 use-cases: `save-document.ts:151/156`, `save-draft`, `submit-draft`, `adjust-document`, `undo-approval`, `approve-document`, `cancel-document`). Viola a atomicidade que o ADR-0015 garante (evento perdido em crash entre os dois passos). Padrão correto já existe: `appendOutboxInTx` dentro de `db.transaction` (contracts/partners).
- 🟡 **`par_contract_count_view` é contador incremental (`activeCount + delta`)** — como os grids ordenam por ele, drift = ordenação errada. Exige **reconciler/backfill** contra a fonte (espelhar o padrão `supplier-view-backfill`).
- 🟡 **`fin_document_timeline` é escrita síncrona na tx do save** (não via o projetor de event-delivery), divergindo de [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) — read-models são projeções reconstruíveis do log, e o `ctr_timeline` segue isso. Decisão pendente (não é fix mecânico): alinhar o `financial` ao padrão de projeção **ou** registrar o desvio deliberado (eventual emenda ao ADR-0022).

---

## Alternativas Consideradas

### A. Sempre projeção (todo dado alheio vira read-model local)

Rejeitada: paga consistência eventual + manutenção de projeção onde a leitura síncrona basta e é fortemente consistente. Contraria Vernon p. 464 (eventual é escolha deliberada, não default).

### B. Sempre read port síncrono (nunca projetar)

Rejeitada: não há como paginar `ORDER BY`/`WHERE` por um campo que vive noutro módulo através de um port remoto — você teria que carregar tudo e ordenar em memória, quebrando paginação no banco. Inviável para os grids que consultam por contagem/fornecedor.

### C. Broker real (Kafka/NATS/Redis Streams) para o cross-módulo

Rejeitada agora: YAGNI. Single-instance, sem gatilho de throughput/fanout atingido (ADR-0015 §"Quando Re-avaliar", ADR-0030/0041). Adicionar broker é *mais* distribuição, não menos — o oposto do problema, que era complexidade acidental.

---

## Quando Re-avaliar

- Um campo hoje classificado como **caso 1 (exibe)** passa a ser consultado (sort/filter/search) → reclassifica para **caso 2 (projeção)**. Ex.: se `contracts` passar a ordenar contratos por nome do contractor, `#3` vira projeção.
- Os gatilhos de ADR-0015/0030/0041 (latência medida, >3 consumidores do mesmo evento, fanout externo, multi-instância, throughput sustentado) — disparam revisão do **mecanismo** (broker), não desta regra de **topologia**.

---

## Referências

- Vaughn Vernon, _Implementing Domain-Driven Design_ — p. 464 (consistência eventual fora da fronteira) e p. 382 (publish in-process síncrono como default). `shared-references/ddd/ddd--vernon-livro-vermelho.md:9184` e `:7320`.
- [ADR-0006](./0006-modular-monolith-core-api.md) · [ADR-0015](./0015-mysql-outbox-pattern.md) · [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) · [ADR-0032](./0032-transient-http-composition-read-until-bff.md).
- Instâncias: [ADR-0043](./0043-partners-supplier-integration-events.md) · [ADR-0045](./0045-financial-supplier-read-model.md) · [ADR-0046](./0046-contracts-contractor-ref-integration-events.md).
