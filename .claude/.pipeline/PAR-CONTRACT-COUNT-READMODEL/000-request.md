# PAR-CONTRACT-COUNT-READMODEL (US6b — consumidor `partners`)

> Decidido por [ADR-0046](../../../handbook/architecture/adr/0046-contracts-contractor-ref-integration-events.md) (Accepted). Segunda metade da US6 (#46); **depende da US6a** (`CTR-CONTRACT-EVENT-CONTRACTOR-REF`, closed-green). **Fecha a feature 015.**

## Objetivo

`partners` mantém o read-model `par_contract_count_view` (`contractor_ref → count`) projetando os eventos de ciclo de vida do `contracts` (enriquecidos com `contractorRef` pela US6a), **sem ler as tabelas do `contracts`** (ADR-0006). Os grids exibem a contagem por contraparte.

## Escopo (somente `par_*` + worker — anti-padrão #4: não tocar `ctr_*`)

Espelha a feature 014 (`supplier-view-projection`): worker no composition root (`src/workers/`) lê a source-outbox e aplica via `EventDelivery` contra o store; nenhum módulo importa o outro (ADR-0006) — a cola é o worker.

- **W1:** `ContractCountStore` port (`applyDelta({ contractorRef, delta, eventId })` **idempotente por eventId** + `getCount`) + adapters InMemory/Drizzle; `applyContractCountEvent({ store })(message)` no `partners/public-api` (decodifica via `contracts/public-api` `decodeContractContractorRefV1` — US6a — e computa o delta); schema `par_contract_count_view` (+ dedup de eventId) na migration **0015**; worker `src/workers/contract-count-projection/{run,delivery}.ts`. **Coluna `active_count`** (nome normativo do ADR-0046 §4). **A leitura/exibição nos grids foi FATIADA para a issue #105** (consumidor downstream — o read-model fica pronto e consumível via `getCount`); o display NÃO é deliverable desta fatia.

## Diferença-chave vs feature 014

A feature 014 projeta **snapshot** (upsert com recency-guard por `occurredAt`). Aqui a projeção é **delta (+1/−1)** — não idempotente sob recency. A idempotência é por **`eventId`**: o receiver registra os eventIds já processados e recusa duplicatas (Vernon, IDDD, p.412 — "track which messages have already been handled").

## Critérios de aceite (viram `it()` no W0)

- [ ] **CA1** — `ContractCreated` com `contractorRef` → contagem do contractor = **+1**.
- [ ] **CA2** — **idempotência**: o mesmo `eventId` aplicado 2x → contagem aplicada **uma vez**.
- [ ] **CA3** — `ContractEnded`/`ContractCancelled` → **−1**.
- [ ] **CA4** — evento sem `contractorRef` (ex.: `AmendmentCreated`) → **no-op**.

## Restrições

- Read-model **derivado/reconstruível** (ADR-0022); idempotente por `eventId`; sem JSON nativo (ADR-0020).
- Consome o `ctr_outbox` **via `contracts/public-api`** (`decodeContractContractorRefV1`), nunca lendo `ctr_*` (ADR-0006).
- `db:generate:partners` isolado → migration `0015` (última do plano 0010→0015).

## Definition of Done

Gate W3 verde + integração `par_*` (Docker). Fecha a feature 015.
