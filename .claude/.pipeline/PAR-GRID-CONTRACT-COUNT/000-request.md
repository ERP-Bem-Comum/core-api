# PAR-GRID-CONTRACT-COUNT — Exibir contagem de contratos por contraparte nos grids

> Issue: [#105](https://github.com/ERP-Bem-Comum/core-api/issues/105) · épico #46 (contagem nos grids) · US6 (display)
> dedup-key: `partners:grids:contract-count-display` · Size: **M** · Branch: `105-partners-grid-contract-count`

## Problema

O read-model `par_contract_count_view` (contagem de contratos ativos por contraparte) já é
mantido pela projeção idempotente da US6b (worker `contract-count-projection`, ADR-0046),
mas **nenhuma rota HTTP do `partners` expõe a contagem**. Falta o consumidor visual: a
coluna `contractCount` nos grids de contraparte.

## Escopo (decisão de produto travada)

Exibir `contractCount` nos **4 grids de contraparte** do `partners`:

| Grid | Rota | Plugin | Schema da linha | Mapper |
| :--- | :--- | :--- | :--- | :--- |
| Colaboradores | `GET /api/v1/collaborators` | `adapters/http/plugin.ts:143` | `collaboratorDetailSchema` (`schemas.ts:129`) | `collaboratorToDetailDto` (`collaborator-dto.ts:15`) |
| Fornecedores | `GET /api/v1/suppliers` | `adapters/http/supplier-plugin.ts` | `supplier-schemas.ts` | `supplier-dto.ts` |
| Financiadores | `GET /api/v1/financiers` | `adapters/http/financier-plugin.ts` | `financier-schemas.ts` | `financier-dto.ts` |
| Atos de cooperação | `GET /api/v1/acts` | `adapters/http/act-plugin.ts` | `act-schemas.ts` | `act-dto.ts` |

Em todos, o `id` da linha é o `contractorRef` usado como chave no read-model.

### Fora de escopo

- Alterar a projeção, o worker ou o read-model (entregues na US6b — `PAR-CONTRACT-COUNT-READMODEL`).
- Tocar o módulo `contracts` (proibido — ADR-0006; a contagem vem só do read-model).
- Filtro/ordenação por `contractCount` no grid (não pedido; YAGNI).

## Pontos de integração (mapeados)

- **Port:** `ContractCountStore` em `src/modules/partners/application/ports/contract-count-store.ts`
  — hoje expõe `getCount(contractorRef): Promise<Result<number, ContractCountStoreError>>`.
- **Adapters:** `contract-count-store.drizzle.ts` (MySQL, lê `par_contract_count_view`) e
  `contract-count-store.in-memory.ts`.
- **Read-model:** `par_contract_count_view` (`schemas/mysql.ts:317`) — PK `contractor_ref varchar(36)`,
  `active_count int NOT NULL DEFAULT 0`.
- **Composition root:** `src/modules/partners/adapters/http/composition.ts` — o `ContractCountStore`
  **ainda não é injetado** em `PartnersHttpDeps`; é o ponto de wiring (Drizzle p/ MySQL, InMemory p/ memória).

## Critérios de aceite (testáveis — valem para os 4 grids)

- **CA1** — **Dado** um contractor com N contratos ativos no `par_contract_count_view`,
  **Quando** o grid é listado, **Então** a linha desse contractor traz `contractCount = N`.
- **CA2** — **Dado** um contractor sem contratos (ausente no read-model),
  **Quando** listado, **Então** `contractCount = 0` (nunca `null`/ausente).
- **CA3** — **Dado** o grid servido, **Então** a leitura usa **somente** o read-model
  `par_contract_count_view`; nenhuma query toca tabelas do `contracts` (ADR-0006).

## Definition of Done

- [ ] Testes de borda (`fastify.inject`) cobrindo CA1–CA3 para os 4 grids.
- [ ] Gate **W3** verde (`typecheck` + `format:check` + `lint` + `test`).
- [ ] Sem regressão nos grids existentes.

## Decisões de design a travar em W0/W1

- **N+1 na borda paginada:** a página tem múltiplas linhas; chamar `getCount` por linha gera N
  lookups. Avaliar em W0 adicionar `getCounts(refs: readonly string[])` ao `ContractCountStore`
  (uma leitura `WHERE contractor_ref IN (...)`) vs. manter `getCount` por linha. Preferir batch
  se o custo de teste/impl for baixo (idiomático p/ grid).
- **Default 0:** refs ausentes no read-model resolvem para `0` (CA2) — decisão no mapper/reader,
  não no schema.
- **Idioma:** schema/DTO/handler em EN; nenhuma string ao humano nova.
