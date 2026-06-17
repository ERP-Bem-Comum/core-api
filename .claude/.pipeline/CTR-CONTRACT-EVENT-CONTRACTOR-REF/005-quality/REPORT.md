# W3 — Gate de Qualidade (GREEN) · CTR-CONTRACT-EVENT-CONTRACTOR-REF (US6a)

**Agente:** ts-quality-checker · **Outcome:** GREEN.

| Comando | Resultado |
|---------|-----------|
| `pnpm run typecheck` | ✅ OK |
| `pnpm run format:check` | ✅ OK |
| `pnpm run lint` | ✅ OK |
| `pnpm test` | ✅ **2735 tests · 2717 pass · 0 fail · 18 skipped** |

Regressão zero: nenhuma falha; os 18 skipped são integração gated (`MYSQL_INTEGRATION`).

## Entregue (US6a — produtor `contracts`, ADR-0046 Opção A)
- `contractEventsToOutboxInserts` enriquece `ContractCreated`/`Cancelled`/`Ended` com `contractorRef` aditivo (sem bump); `eventToOutboxInsert`/domínio/decoder de domínio intocados.
- `decodeContractContractorRefV1` no public-api expõe `{ contractRef, contractorRef, occurredAt }` ao consumidor (US6b).
- Wiring `contract-repository.save → appendOutboxInTx(contractor)`.
- CA1–CA5 verde. W2 APPROVED (4 Minors; m3 corrigido com CA5).

## Desbloqueia
**US6b** `PAR-CONTRACT-COUNT-READMODEL` (consumidor `par_*`: worker `contract-count-projection` + `par_contract_count_view`).
