# W1 — Implementação (GREEN) · CTR-CONTRACT-EVENT-CONTRACTOR-REF (US6a)

**Outcome:** GREEN. CA1–CA4 do W0 passam; gates offline verdes.

## Entregue (Opção A do ADR-0046 — domínio/evento/decoder de domínio intocados)

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `adapters/persistence/mappers/outbox.mapper.ts` | `contractEventsToOutboxInserts(events, contractor, now, idGen)` — **pura adição** (wrapper sobre `eventToOutboxInsert`); estampa `contractorRef` ({type,id}) em `ContractCreated`/`ContractCancelled`/`ContractEnded`, **aditivo a `OUTBOX_SCHEMA_VERSION=1`** (sem bump). `eventToOutboxInsert` e os payload types existentes **inalterados**. |
| 2 | `public-api/events.ts` | `decodeContractContractorRefV1(row)` + tipo `ContractContractorAttribution` — visão de **integração** (≠ decoder de domínio); evento sem contraparte → `ok(null)`. |
| 3 | `adapters/persistence/repos/outbox-repository.drizzle.ts` + `contract-repository.drizzle.ts` | `appendOutboxInTx(tx, schema, events, contractor?)` — quando o pai é o contract-repo, passa `contract.contractor`; ausente (amendment/append genérico) → caminho original. |

## CAs (4/4 GREEN)
- CA1 `ContractCreated` → `contractorRef`, v1 preservado, sem bump · CA2 `Cancelled`/`Ended` idem · CA3 `public-api` expõe ao consumidor (sem contraparte → null) · CA4 retrocompat (`outboxRowToEvent` ignora o campo extra).

## Gates
`typecheck` ✅ · `format:check` ✅ · `lint` ✅ · `pnpm test` ✅ **2734 tests, 2716 pass, 0 fail, 18 skipped** (sem regressão; `outbox.mapper.test`/timeline/outbox-repo intactos pois `eventToOutboxInsert` ficou intocado).

## Cobertura
A enriquecimento é unit-testada direto no mapper (CA1–CA4). O wiring #3 (contract-repo save → outbox real) é **aditivo de payload-string** sobre o mesmo INSERT já testado por `outbox-repository.drizzle.test.ts` (integração) — sem nova semântica SQL. Um teste de integração dedicado tem valor baixo (≠ US5, cuja atomicidade do `markUsed` exigia MySQL real); registrável como follow-up se desejado.

## Pendente
W2 (code-review) → W3 (gate final + close). Desbloqueia a US6b (`PAR-CONTRACT-COUNT-READMODEL`).
