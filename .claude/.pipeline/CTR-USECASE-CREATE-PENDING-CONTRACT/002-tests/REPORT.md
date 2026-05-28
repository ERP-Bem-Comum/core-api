# W0 (RED) — CTR-USECASE-CREATE-PENDING-CONTRACT

**Skill:** tdd-strategist
**Data:** 2026-05-27
**Resultado:** 🔴 RED — `ERR_MODULE_NOT_FOUND` (`use-cases/create-pending-contract.ts` inexistente).

## Comando

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/contracts/application/use-cases/create-pending-contract.test.ts
# falha no import (módulo não existe) até o W1
```

## Testes adicionados — `create-pending-contract.test.ts`

Fakes InMemory (contractRepo + outbox) + `ClockFixed('2026-01-10')`. `validCommand` helper.

| Teste | Exige no W1 | W0 |
| :--- | :--- | :--- |
| CA1 | `createPendingContract(cmd)` (sem `signedAt`) → `PendingContract`, persiste; `findBySequentialNumber` confirma | 🔴 |
| CA2 | `sequentialNumber` duplicado → `'contract-sequential-number-duplicated'` | 🔴 |
| CA3 | `originalValueCents` 0 → erro de domínio | 🔴 |
| CA4 | evento `ContractCreated` com `occurredAt = clock.now()` (createdAt, não signedAt) | 🔴 |

## Mapa W1

- `application/use-cases/create-pending-contract.ts`: factory `(deps) => (cmd) => Promise<Result>`.
  Parse (money/period via lógica de `buildContract`, sem `signedAt`) → `findBySequentialNumber`
  (unicidade) → `Contract.createPending({ ..., createdAt: clock.now() })` → `contractRepo.save(pending, [event])`.
- `Deps = { contractRepo, clock }`. Output `{ contract: PendingContract; event }`.
- Reaproveitar parse de `create-contract.ts` sem duplicar (extrair helper de money/period se necessário),
  preservando `create-contract` (Active) intacto.
