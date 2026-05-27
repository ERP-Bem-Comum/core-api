# Code Review — CTR-USECASE-CREATE-PENDING-CONTRACT — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-27
**Escopo revisado:** `application/use-cases/create-pending-contract.ts` (novo) + `create-pending-contract.test.ts` (novo).

---

## Conformidade (regras de application)

- ✅ **Factory** `(deps) => (cmd) => Promise<Result>`; `Deps` `Readonly<>` com ports + `clock`
  (usado de fato em `createdAt`, sem dead dependency).
- ✅ **Sequência canônica:** validar (period/money) → fetch (`findBySequentialNumber`, unicidade R4)
  → domain (`Contract.createPending`) → persist (`save`). Evento só vai ao `save`.
- ✅ **Regra no domínio:** o use case não decide estado — `Contract.createPending` valida cadastro
  (incl. `originalValue ≠ 0`). `create-contract` (Active) intacto.
- ✅ Erros: union completo; sem `throw`/`class`/`any`; `return ok(created.value)` enxuto.
- ✅ Testes: 4 CAs (happy + duplicado + valor-zero + evento `occurredAt = clock.now()`), fakes
  InMemory + `ClockFixed`.

## 🔵 Sugestões (não bloqueiam)

1. **Duplicação de parse → EXTRAÍDA.** Novo `contract-input-parse.ts` com
   `parseOriginalValueAndPeriod`; `create-contract` (`buildContract`) e `create-pending` o consomem.
   Refactor comportamento-preservado — `create-contract`/`import-contracts` seguem GREEN.
2. **Literais → CENTRALIZADOS** em `ContractInputParseError` (helper compartilhado), não mais soltos
   no use case pending. Semântica neutra (parse de input de contrato).

Resolvidas a pedido do usuário ("resolver todas as dívidas"). Gate verde (suíte 1235/0). APPROVED mantido.

## Gate verificado (read-only)

```
pnpm run typecheck   → OK
pnpm run format:check → OK
pnpm run lint        → OK
node --test create-pending-contract.test.ts → 4/4
```

## Próximo passo

**APPROVED → W3.** As 2 🔵 ficam registradas (refactor de parse fora de escopo).
