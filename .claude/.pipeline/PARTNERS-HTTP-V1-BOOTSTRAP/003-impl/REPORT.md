# W1 — GREEN — PARTNERS-HTTP-V1-BOOTSTRAP

> Skill: `ports-and-adapters` (camada `adapters/http/` + wiring; domínio/application intocados).

## Objetivo da wave

Implementar o mínimo para os 11 testes do W0 ficarem verdes: bootstrap do `/api/v1`
(união retrocompatível em `buildApp`), composition root de partners (RW split), catálogo de
permissions e a 1ª rota `GET /api/v1/collaborators`.

## Arquivos criados

- `src/modules/partners/public-api/permissions.ts` — `COLLABORATOR_PERMISSION { read, write }`.
- `src/modules/partners/adapters/http/schemas.ts` — Zod: `collaboratorListItemSchema` + envelope `{ items, meta: { total } }`.
- `src/modules/partners/adapters/http/collaborator-dto.ts` — `collaboratorToListItem` (mapper puro).
- `src/modules/partners/adapters/http/composition.ts` — `buildPartnersHttpDeps` (driver memory|mysql, RW split ADR-0026; reads no reader); expõe `listCollaborators` + `shutdown`.
- `src/modules/partners/adapters/http/plugin.ts` — `collaboratorsHttpPlugin` + `CollaboratorsHttpHooks`; rota `GET /collaborators` com `requireAuth` + `authorize('collaborator:read')`.
- `src/modules/partners/public-api/http.ts` — ponto público (plugin + deps + permissions).

## Arquivos editados

- `src/shared/http/app.ts` — `routes` agora aceita `RouteRegistration = FastifyPluginAsync | { plugin, prefix? }` (união retrocompatível; default `/api/v2`). `onSend` no-store cobre `/api/v1` **e** `/api/v2`.
- `src/server.ts` — `buildPartnersHttpDeps` (env `PARTNERS_DRIVER`/`PARTNERS_DATABASE_URL`/`PARTNERS_READER_URL`); registra `collaboratorsHttpPlugin` sob `prefix: '/api/v1'`; `partnersDeps.shutdown()` no graceful shutdown.

## Decisões de design (W1)

- **União retrocompatível** em `routes` (ADR-0033): zero mudança nos call-sites de auth/contracts (seguem como plugin direto → v2). Evita tocar os ~7 testes de rota existentes (regressão zero).
- **YAGNI**: envelope da lista é `{ items, meta: { total } }` (sem page/limit/order ainda); filtros e paginação real ficam para P1. Item de lista enxuto (id/name/email/cpf/role/occupationArea/employmentRelationship/registrationStatus/status).
- **RW split**: `listCollaborators` wirado ao `collaboratorReaderRepo`; em memory reader=writer (mesmo store).
- Mapeamento erro→HTTP da leitura: `collaborator-repo-unavailable` → 503.

## Saída literal do gate

`pnpm run typecheck`:

```
$ tsc --noEmit
(zero erros)
```

`pnpm test`:

```
ℹ tests 2005
ℹ suites 646
ℹ pass 1988
ℹ fail 0
ℹ skipped 17
ℹ duration_ms 28818
```

Teste isolado da P0: `tests 11 · pass 11 · fail 0`.

→ **GREEN**: os 11 testes do contrato passam; zero regressão (1988 verdes, +11 vs. baseline do W0; 17 skipped pré-existentes de integração opt-in).

## Próximo passo

W2 (REVIEW) — skill `code-reviewer`: audit read-only dos 8 arquivos (6 novos + 2 editados),
checando ADR-0006/0028 (import só via public-api), ADR-0033 (prefixo v1), ADR-0027 (Zod na borda),
Result→HTTP, e ausência de regra de negócio na borda.
