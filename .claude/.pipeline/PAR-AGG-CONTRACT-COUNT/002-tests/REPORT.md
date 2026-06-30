# W0 — Testes RED · PAR-AGG-CONTRACT-COUNT

> Skill: `tdd-strategist` · Outcome: **RED** · Driver: memory (`fastify.inject`)

## Arquivo

`tests/modules/partners/adapters/http/partners-aggregate-contract-count.routes.test.ts` (novo).

## Cobertura

1 teste cobrindo CA1+CA2+CA3 no agregado `GET /api/v1/partners`: 4 tipos semeados; contagem só p/
supplier (3) e collaborator (5); financier e act sem entrada (→ 0).

- **CA1** — supplier → `contractCount = 3`; collaborator → `5`.
- **CA2** — financier e act (sem entrada no read-model) → `contractCount = 0`.
- **CA3** — valores 3/5 vêm só do read-model semeado (sem `contracts` montado).

## Resultado (RED esperado)

```
✖ CA1+CA2+CA3 → AssertionError: undefined !== 3
# tests 1 · pass 0 · fail 1
```

RED pela razão certa: `contractCount` não existe nas linhas do agregado. Sem crash de import.

## Contrato para o W1 (GREEN)

1. `partnerListItemSchema` += `contractCount: z.number().int().nonnegative()`.
2. Handler `GET /partners`: após `aggregatePartners`, enriquecer a página com
   `getContractCounts(items.map(id))` (batch, já em `PartnersHttpDeps`) → `contractCount` (0 se ausente).
3. `aggregatePartners` permanece **pura** (não recebe contagem).
