# W0 — RED — COLLABORATORS-HTTP-DETAIL (P1a)

> Skill: `tdd-strategist`. Contrato espelha `handbook/legacy_docs/openapi.yaml:2435` (schema `Collaborator`).

## Objetivo

Descrever, por testes RED, o `GET /api/v1/collaborators/:id` com **read-model enriquecido** (agregado +
`legacyId` + `createdAt`/`updatedAt`), o `seed` no composition memory e o DTO espelhando o legado.

## Arquivo criado

- `tests/modules/partners/adapters/http/collaborators-detail.routes.test.ts`

## Testes (intenção)

1. sem `Authorization` → 401.
2. autenticado sem `collaborator:read` → 403.
3. `:id` não-UUID → 400 (Zod).
4. `:id` UUID inexistente → 404.
5. `:id` existente (seed) → 200, DTO com `id` (UUID) + `legacyId` (4242) + campos + `status`=registrationStatus + `active`=true + `disableBy`=null + `createdAt`/`updatedAt` ISO.
6. composition: `buildPartnersHttpDeps({ driver:'memory', seed:{collaborators:[record]} })` expõe `getCollaboratorById`.

## Saída literal do gate (`pnpm test`, arquivo isolado)

```
ℹ tests 6
ℹ pass 1
ℹ fail 5
✖ CA: sem Authorization -> 401
✖ CA: autenticado sem collaborator:read -> 403
✖ CA: :id não-UUID -> 400 (Zod, antes do domínio)
✖ CA: existente -> 200 com DTO espelhando o schema legado Collaborator
✖ CA: buildPartnersHttpDeps memory com seed expõe getCollaboratorById
  (TypeError: deps.getCollaboratorById is not a function)
```

→ **RED correto**: 5/6 falham por ausência da rota `/:id`, do `seed` e do `getCollaboratorById`.

### Falso-verde conhecido (documentado)

- `CA: UUID válido inexistente -> 404` **passa** no W0 por coincidência: a rota `/:id` ainda não existe,
  então o Fastify devolve 404 (rota desconhecida). Vira asserção **genuína** no W1 (rota existe → reader
  retorna `null` → 404 via `sendResult`). Sem teste fraco no conjunto: os demais 5 cobrem a ausência da API.

### Nota para o W1

O teste usa dois `@ts-expect-error` (em `seed` e `getCollaboratorById`) para compilar contra a API ainda
inexistente. **Ao implementar no W1, remover ambos** — senão viram `unused @ts-expect-error` e quebram `tsc`.

## Próximo passo

W1 (GREEN) — `ports-and-adapters`: criar `CollaboratorReader` (port) + adapters drizzle/in-memory,
`seed` + `getCollaboratorById` no composition, `collaboratorToDetailDto` + `collaboratorDetailSchema` +
`collaboratorIdParamSchema`, rota `GET /collaborators/:id`. Remover os `@ts-expect-error` do teste.
