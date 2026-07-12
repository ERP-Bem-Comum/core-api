# W0 — Testes RED · BGP-SCENARIO-CHILDREN (#401)

**Skill:** tdd-strategist. **Arquivo:** `tests/modules/budget-plans/adapters/http/scenario-children.routes.test.ts`.

## Contrato (CA1..CA3 + RBAC)
- **CA1:** `GET /budget-plans/:id/children` → 200 lista os filhos (id, version, scenarioName, status, totalInCents); plano sem filhos → `items: []`.
- **CA2:** `:id` inexistente → 404; `:id` malformado → 400 (Zod).
- **CA3:** ordenação determinística por versão (1.1, 1.2).
- **RBAC:** 401 sem token · reader (`budget-plan:read`) autorizado · sem permissão → 403.

Filhos criados no teste via `POST /:id/scenery {name}` (cenário RASCUNHO, version minor+1).

## RED confirmado
```
✖ Route not found (404) — a rota GET /:id/children ainda não existe
```
Todos os CAs que dependem da rota falham (404 "Route not found"). RED válido. Próximo: W1 implementa use case `list-scenario-children` + rota + schema.
