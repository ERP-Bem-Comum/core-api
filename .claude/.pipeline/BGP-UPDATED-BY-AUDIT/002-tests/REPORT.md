# W0 — Testes RED · BGP-UPDATED-BY-AUDIT (#373)

**Skill:** tdd-strategist. **Arquivo:** `tests/modules/budget-plans/adapters/http/updated-by-audit.routes.test.ts`.

## Contrato (CA1/CA2/CA4 via rota E2E)
`requireAuth` fake injeta `req.userId` do Bearer (`Bearer <userId>::<perms>`) → varia o ator por request.
- **CA1:** `POST /budget-plans` (A) → item de GET expõe `updatedByRef = A`.
- **CA2:** `POST /:id/budgets` (B) → `updatedByRef` do plano vira B (última mutação vence).
- **CA4:** `POST /:id/scenery` (C) → filho (GET /:id/children) tem `updatedByRef = C`.
- Contrato: item expõe o campo `updatedByRef`.

CA3 (legado null) + CA6 (domínio: 6 factories) serão adicionados junto do W1 (unidade de domínio/mapper).

## RED confirmado
```
tests 4 · pass 0 · fail 4
```
Todos falham — `updatedByRef` não existe. RED válido.

## Nota de escopo (W1 pesado)
Multi-camada: agregado (+campo) + 6 factories + 6 use cases + 6 handlers + mapper + repo in-memory + schema + migration 0005 (x99) + projeção DTO. Ver `000-request.md` §Escopo e as decisões D1–D6.
