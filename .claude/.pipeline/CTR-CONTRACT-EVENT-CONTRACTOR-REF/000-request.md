# CTR-CONTRACT-EVENT-CONTRACTOR-REF (US6a — produtor `contracts`)

> Decidido por [ADR-0046](../../../handbook/architecture/adr/0046-contracts-contractor-ref-integration-events.md) (Accepted). Primeira metade da US6 (#46) do épico Colaborador (#65). **Bloqueia** a US6b (`PAR-CONTRACT-COUNT-READMODEL`).

## Objetivo

Permitir que o `partners` conte contratos por contraparte (read-model `par_contract_count_view`) **sem ler as tabelas do `contracts`** (ADR-0006). Para isso, o `contracts` precisa publicar a **contraparte** (`contractorRef`) nos eventos de ciclo de vida relevantes.

## Escopo (somente `ctr_*` — anti-padrão #4: não tocar `par_*` nesta wave)

**Opção A (ADR-0046, domínio/evento/decoder intocados):** o enriquecimento acontece no **adapter**, a partir do snapshot do agregado. O `contract-repository.drizzle.ts` `save(contract, events)` **já tem** `contract.contractor` em escopo (linha 315) — espelha o `supplier-outbox.mapper.ts` da feature 013/ADR-0043.

- **W1:** nova função `contractEventsToOutboxInserts(events, contractor, now, idGen)` no `outbox.mapper.ts` que estampa `contractorRef` (`{ type, id }`) nos payloads de `ContractCreated`/`ContractCancelled`/`ContractEnded` — **aditivo ao wire-format v1** (sem bump; demais eventos inalterados). O `contract-repository` passa `contract.contractor`. O `outbox.mapper` `deserializeEvent` ignora o campo (retrocompat, como `terminationReason`). Novo accessor `decodeContractContractorRefV1(row)` no `public-api/events.ts` expõe `{ contractRef, contractorRef, occurredAt }` ao consumidor (null para eventos sem contraparte).

## Critérios de aceite (viram `it()` no W0)

- [ ] **CA1** — `ContractCreated` enriquecido carrega `contractorRef { type, id }`; campos v1 (`contractId`, `occurredAt`) preservados; `schemaVersion = 1` (aditivo, sem bump).
- [ ] **CA2** — `ContractCancelled` e `ContractEnded` também carregam `contractorRef`.
- [ ] **CA3** — `public-api` expõe `contractorRef` ao consumidor (`decodeContractContractorRefV1(row)` → `{ contractRef, contractorRef }`); evento sem contraparte (ex.: `AmendmentCreated`) → `null`.
- [ ] **CA4** — retrocompat: o decoder de **domínio** (`outboxRowToEvent`) segue reidratando o `ContractCreated` enriquecido (campo extra ignorado).

## Restrições

- `ContractorRef` referencia agregado de outro BC **por identidade** (Vernon, IDDD, p.460 — já citado em `contractor.ts`). NUNCA compor o objeto rico do contratado no `contracts` (FR-012/ADR-0032).
- Aditivo: nenhum bump de `OUTBOX_SCHEMA_VERSION`. Consumidores existentes (projetor de Timeline) inalterados.

## Definition of Done

Gate W3 verde (`typecheck`+`format:check`+`lint`+`test`) + integração `ctr_*` se aplicável. Desbloqueia a US6b.
