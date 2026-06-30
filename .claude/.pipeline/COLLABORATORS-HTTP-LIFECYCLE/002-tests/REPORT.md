# W0 — RED — COLLABORATORS-HTTP-LIFECYCLE (P3)

> Skill: `tdd-strategist`. Soft-delete via dois endpoints.

## Arquivo criado

- `tests/modules/partners/adapters/http/collaborators-lifecycle.routes.test.ts`

## Testes (intenção)

**deactivate:** 401 · 403 · 400 :id não-UUID · 400 disableBy inválido (Zod) · 404 inexistente ·
200 ativo→inativo + 409 na 2ª vez (already-inactive).
**reactivate:** 200 inativo→ativo + 409 quando já ativo (already-active) · 404 inexistente.

## Saída literal (`pnpm test`, isolado)

```
ℹ tests 8
ℹ pass 2
ℹ fail 6
```

→ **RED correto**: 6/6 relevantes falham (rotas inexistentes). Os 2 verdes são os `404` por rota
ausente (Fastify) — viram genuínos no W1.

## Próximo passo

W1 (GREEN) — `ports-and-adapters`: expor `deactivate`/`reactivateCollaborator` no composition;
`deactivateCollaboratorBodySchema` (disableBy enum, sem LEGACY_MIGRATION); rotas POST; estender
`writeErrorStatus` (not-found/invalid-id de deactivate/reactivate).
