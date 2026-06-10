# 002 — W0 (RED) — PAR-GEO-ADDED-MUNICIPALITIES

- `tests/modules/partners/application/use-cases/list-added-partner-municipalities.test.ts` — use case
  cross-state (Active de qualquer UF, name resolvido, ignora Inactive, ordena, vazio). RED: use case inexistente.
- `tests/modules/partners/adapters/http/partner-municipalities-added.routes.test.ts` — `GET
  /partner-municipalities/added` (paginado, busca por nome, 401/403, vazio). RED: rota 404.

Confirmado RED (MODULE_NOT_FOUND + rota ausente).
