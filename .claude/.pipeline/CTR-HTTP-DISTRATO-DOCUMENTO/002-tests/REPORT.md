# 002 — W0 (RED) — CTR-HTTP-DISTRATO-DOCUMENTO (persistência do motivo)

O distrato rico (data efetiva + documento exigido) já existia (commit `9560c8f`). Este ciclo
fecha o Gap restante: **persistir o motivo** (`reason` era capturado mas descartado).

Asserts RED adicionados (campo `terminationReason` inexistente → `undefined`):
- `end-contract.test.ts` — `Contract` Terminated e evento `ContractEnded` carregam o motivo; in-memory persiste.
- `outbox.mapper.test.ts` — round-trip preserva o motivo; **retrocompat**: payload v1 sem o campo → null.
- `contracts-end.routes.test.ts` — detalhe retornado pelo `/end` expõe `terminationReason` (CA3).
- 5 testes que constroem `ContractEnded`/row literais passam a exigir o campo (typecheck RED).
