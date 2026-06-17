# W1 — Implementação GREEN · PAR-AGG-CONTRACT-COUNT

> Skill: `ports-and-adapters` + borda HTTP · Outcome: **GREEN** (1/1 teste W0) · Sem regressão

## Mudanças (2 arquivos)

- `partners-schemas.ts` — `partnerListItemSchema` += `contractCount: z.number().int().nonnegative()`.
- `partners-plugin.ts` — handler `GET /partners`: após `aggregatePartners` (puro, **não tocado**),
  enriquece **só a página** com `getContractCounts(items.map(id))` (batch, reusa o port da #105),
  `contractCount` default `0`. Importado `ok`. Store indisponível → `503`.

## Conformidade

- **ADR-0006:** contagem só do read-model do `partners`; handler não toca `contracts`.
- **Anti-N+1:** 1 `getCounts` batch sobre os ids da página (≤ limit).
- **Pureza:** `aggregatePartners` permanece função pura (sem I/O).

## Verificação

```
partners-aggregate-contract-count.routes.test.ts → tests 1 · pass 1 · fail 0
suíte partners HTTP completa → tests 223 · pass 223 · fail 0  (sem regressão)
typecheck · lint · format:check → verdes
```
