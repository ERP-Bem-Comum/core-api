# W1 (GREEN) — CTR-USECASE-ACTIVATE-CONTRACT

**Skill:** ports-and-adapters
**Data:** 2026-05-27
**Resultado:** 🟢 GREEN — 4/4 do ticket; suíte 1213/0; typecheck/format/lint OK.

## Implementação

`src/modules/contracts/application/use-cases/activate-contract.ts` — factory
`(deps) => (cmd) => Promise<Result>`. Sequência (validar → fetch → domain → persist):

1. `ContractId.rehydrate(cmd.contractId)` → `ContractIdError`.
2. `new Date(cmd.signedAt)` + `isValidDate` → `'activate-contract-invalid-signed-at'`.
3. `contractRepo.findById` → `'contract-not-found'` se null.
4. **Narrowing inline** `if (contract.status !== 'Pending') → 'contract-not-pending'` (union
   discriminada refina para `PendingContract` — sem `parsePending` novo).
5. **RN-CV-02**: `documentRepo.findByParent('Contract', id)` + `some(d => categoria==='signed_contract'
   && status==='Active')` → `'activate-contract-no-signed-document'`.
6. `Contract.activate(pending, signedAt)` → propaga `ContractError` (`ContractInvalidSignedAt`).
7. `contractRepo.save(active, [event])` — evento `ContractActivated` persistido pós-estado (CA5).

`Deps = { contractRepo, documentRepo }`. **`clock` removido** — não usado (`signedAt` vem do
comando; `Contract.activate` usa-o como `occurredAt`). Evita dead dependency (limpeza pré-W2).

## Gate

```
node --test activate-contract.test.ts → 4/4 (CA1, CA2a, CA2b, CA3)
pnpm run typecheck   → OK
pnpm run format:check → OK
pnpm run lint        → OK
pnpm test            → tests 1229 · pass 1213 · fail 0 · skipped 16
```

## Fora deste ticket (próximo da série)

- **CLI** expondo `criar-contrato` (caminho Pending) + `activar-contrato`.
- Exposição via `public-api`/HTTP (quando a camada HTTP entrar).
