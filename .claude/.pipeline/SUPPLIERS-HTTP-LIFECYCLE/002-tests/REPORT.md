# W0 — RED — SUPPLIERS-HTTP-LIFECYCLE (S3)

> Skill: `tdd-strategist`. Soft-delete de fornecedor via dois endpoints (deactivate sem body).

## Arquivo criado
- `tests/modules/partners/adapters/http/suppliers-lifecycle.routes.test.ts`

## Testes (intenção)
deactivate: 401 · 403 · 400 :id não-UUID · 404 inexistente · 200 ativo→inativo + 409 (already-inactive).
reactivate: 200 inativo→ativo + 409 (already-active) · 404 inexistente.

## Saída literal (`pnpm test`, isolado)
```
ℹ tests 7
ℹ pass 2
ℹ fail 5
```
→ RED correto (5/5 relevantes). Os 2 verdes são os `404` por rota inexistente (Fastify) — viram genuínos no W1.

## Próximo passo
W1 — expor deactivate/reactivateSupplier no composition; POST /:id/deactivate + /:id/reactivate (sem body).
