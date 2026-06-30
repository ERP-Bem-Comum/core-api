# W1 (GREEN) — CTR-USECASE-CREATE-PENDING-CONTRACT

**Skill:** ports-and-adapters
**Data:** 2026-05-27
**Resultado:** 🟢 GREEN — 4/4 do ticket; suíte 1217/0; typecheck/format/lint OK.

## Implementação

`src/modules/contracts/application/use-cases/create-pending-contract.ts` — factory
`(deps) => (cmd) => Promise<Result>`. Sequência: parse `periodStart`/`money`/`period` (sem
`signedAt`) → `findBySequentialNumber` (unicidade R4) → `Contract.createPending({ ..., createdAt:
clock.now() })` → `contractRepo.save(pending, [event])` → `ok(created.value)`.

- `Deps = { contractRepo, clock }`; `clock` usado para `createdAt` (o `Pending` não tem `signedAt`).
- `create-contract` (caminho Active) **intacto**.

## Gate

```
node --test create-pending-contract.test.ts → 4/4 (CA1, CA2, CA3, CA4)
pnpm run typecheck   → OK
pnpm run format:check → OK
pnpm run lint        → OK
pnpm test            → tests 1233 · pass 1217 · fail 0 · skipped 16
```

## Nota (dívida potencial — W2 avalia)

O parse de `period`/`money` espelha o de `create-contract.ts` (`buildContract`). Optei por **não
extrair helper compartilhado** agora (isola o ticket, não toca o `create-contract`). Se o W2 julgar
a duplicação relevante, um refactor `buildOriginalValueAndPeriod` compartilhado é o caminho — em
ticket próprio (toca o `create-contract` existente).

## Fora deste ticket (próximo)

- **CLI**: `criar-contrato` ganha o caminho Pending (sem `--assinado-em` → chama `createPendingContract`)
  ou comando dedicado; + comando `activar-contrato`.
- Realinhamento de labels de status.
