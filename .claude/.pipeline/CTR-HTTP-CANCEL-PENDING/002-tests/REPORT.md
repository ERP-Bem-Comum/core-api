# 002 — W0 (RED) — CTR-HTTP-CANCEL-PENDING

3 arquivos de teste RED (ADR-0039 — estado `Cancelled`):

- `tests/modules/contracts/domain/contract/contract-cancel.test.ts` — `Contract.cancel` (Pending →
  Cancelled + `endedAt` + evento `ContractCancelled`; rejeita data inválida) e `Contract.parsePending`
  (narrows Pending; rejeita Active/Expired com `ContractNotPending` carregando `currentStatus`).
- `tests/modules/contracts/application/use-cases/cancel-contract.test.ts` — `cancelContract`: Pendente →
  ok + evento no outbox (CA-4); Active → `ContractNotPending` (CA-2); inexistente → `contract-not-found`
  (CA-3).
- `tests/modules/contracts/adapters/http/contracts-cancel.routes.test.ts` — `DELETE /contracts/:id`:
  sem auth → 401; sem `contract:write` → 403; Pendente → 200 (status Cancelled); Active → 409;
  inexistente → 404.

## Resultado da run

`tests 11 · pass 2 · fail 9`. Os 2 verdes são 401/403 (gates de auth pré-existentes — corretos).
Falham por: `Contract.cancel`/`parsePending` inexistentes, `cancel-contract.ts` ausente
(`ERR_MODULE_NOT_FOUND`), e DELETE ainda respondendo 405 incondicional.

GREEN no W1.
