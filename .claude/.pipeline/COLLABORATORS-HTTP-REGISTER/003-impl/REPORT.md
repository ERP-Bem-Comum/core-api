# W1 — GREEN — COLLABORATORS-HTTP-REGISTER (P2)

> Skill: `ports-and-adapters`. Primeiras rotas de escrita (writer pool).

## Arquivos editados

- `adapters/http/composition.ts` — `Pools.collaboratorWriterRepo` (memory: mesmo store; mysql:
  `createDrizzleCollaboratorStore(writerHandle)`); `makeDeps` expõe `registerCollaborator` +
  `completeCollaboratorRegistration` (wirados no writer).
- `adapters/http/schemas.ts` — `createCollaboratorBodySchema` + `completeRegistrationBodySchema`
  (campos pessoais nullable/default null; `dateOfBirth`/`startOfContract` via `z.coerce.date()`).
- `adapters/http/plugin.ts` — `POST /collaborators` (201 + `Location`, sem corpo);
  `PATCH /:id/complete-registration` (200); helper `writeErrorStatus`/`sendWriteError`
  (409 duplicado/already-*, 404 not-found, 400 invalid-id, 422 invariante, 503 repo).
- `tests/.../collaborators-register.routes.test.ts` — `as string` → `!` (lint `--fix`).

## Decisões de design (W1)

- **Writer pool** (ADR-0026): register/complete no `collaboratorWriterRepo`; em memory reader/writer = mesmo store, então POST→PATCH no mesmo id funciona sem seed.
- **201 + `Location: /api/v1/collaborators/{uuid}`** (decisão do dono): espelha o legado (sem corpo) + URL para o detalhe.
- **complete-registration autenticado** (PATCH + `collaborator:write`), `completeCollaboratorRegistration` — não o fluxo público (decisão do dono).
- **Mapa erro→HTTP por sets** + default **422** (invariante de domínio); Zod → 400.

## Saída literal do gate

`pnpm run typecheck`: zero erros. `pnpm run lint`: zero. `pnpm run format:check`: clean.

`pnpm test`:

```
ℹ tests 2036
ℹ pass 2019
ℹ fail 0
ℹ skipped 17
```

Teste P2 isolado: `10 · pass 10 · fail 0`.

→ **GREEN**: 10 CAs; zero regressão (2019 = 2009 + 10 novos).

## Próximo passo

W2 (REVIEW) — `code-reviewer`.
