# W0 — RED — COLLABORATORS-HTTP-REGISTER (P2)

> Skill: `tdd-strategist`. Primeiras rotas de escrita (writer pool).

## Arquivo criado

- `tests/modules/partners/adapters/http/collaborators-register.routes.test.ts`

## Testes (intenção)

**POST /collaborators:** 401 sem token · 403 sem write · 201 + Location (body válido) · 409 CPF
duplicado · 400 cpf curto (Zod) · 422 CPF DV inválido (domínio).

**PATCH /:id/complete-registration:** 403 sem write · 400 :id não-UUID · 404 inexistente · 200
pré-cadastro + 409 na 2ª vez (already-complete). POST→PATCH no mesmo writer repo (sem seed).

## Saída literal (`pnpm test`, isolado)

```
ℹ tests 10
ℹ pass 1
ℹ fail 9
```

→ **RED correto** (9/9 relevantes). O único verde (`id inexistente -> 404`) é coincidência (rota
POST/PATCH ainda não existe → 404 do Fastify); vira genuíno no W1.

## Próximo passo

W1 (GREEN) — `ports-and-adapters`: writer repo no composition + `registerCollaborator`/
`completeCollaboratorRegistration`; `createCollaboratorBodySchema` + `completeRegistrationBodySchema`;
rotas POST (201+Location) e PATCH (200); helper de mapeamento erro→HTTP (409/404/422/503).
