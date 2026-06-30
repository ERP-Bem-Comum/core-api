# W1 — GREEN — COLLABORATORS-HTTP-DETAIL (P1a)

> Skill: `ports-and-adapters`. Read-model enriquecido + rota de detalhe espelhando o legado.

## Arquivos criados

- `src/modules/partners/application/ports/collaborator-reader.ts` — port `CollaboratorReader` + `CollaboratorReadRecord` (agregado + legacyId + createdAt/updatedAt).
- `src/modules/partners/adapters/persistence/repos/collaborator-reader.in-memory.ts` — store semeável.
- `src/modules/partners/adapters/persistence/repos/collaborator-reader.drizzle.ts` — SELECT por id → `collaboratorFromRow` + projeta legacyId/timestamps (padrão `contractor-read.drizzle.ts`).

## Arquivos editados

- `adapters/http/schemas.ts` — `collaboratorIdParamSchema` (uuid) + `collaboratorDetailSchema` (~27 campos, espelha `Collaborator` legado).
- `adapters/http/collaborator-dto.ts` — `collaboratorToDetailDto(record)` (status←registrationStatus, active←status==='Active', disableBy null se Active, datas ISO).
- `adapters/http/composition.ts` — `PartnersSeed` + `seed` (memory) + `getCollaboratorById(id)` (rehydra UUID → reader); wira reader memory/drizzle no reader pool.
- `adapters/http/plugin.ts` — rota `GET /collaborators/:id` (`authorize('collaborator:read')`; 404 inexistente; 503 reader indisponível).
- `tests/.../collaborators-detail.routes.test.ts` — removidos os 2 `@ts-expect-error` (API agora existe); seed tipado `CollaboratorReadRecord[]`.

## Decisões de design (W1)

- **Read-model separado do agregado** (não enriqueci o agregado com infra): o `CollaboratorReader` projeta a row; o agregado segue puro. Alinha ADR-0022 (read-model por projeção).
- **`getCollaboratorById(string)`** no deps faz o rehydrate do UUID (Zod já garante o formato na rota; rehydrate defensivo → `ok(null)`), mantendo o port tipado por `CollaboratorId`.
- **id = UUID + legacyId** no DTO; `status`/`active`/`disableBy` mapeados ao shape legado.

## Saída literal do gate

`pnpm run typecheck`:

```
$ tsc --noEmit
(zero erros — inclui validação de que os @ts-expect-error removidos não deixaram resíduo)
```

`pnpm test`:

```
ℹ tests 2011
ℹ suites 648
ℹ pass 1994
ℹ fail 0
ℹ skipped 17
```

Teste isolado P1a: `tests 6 · pass 6 · fail 0` — incl. o `404` agora **genuíno** (rota existe, reader → null).

→ **GREEN**: 6/6 da P1a; zero regressão (1994 = 1988 da P0 + 6 novos).

## Próximo passo

W2 (REVIEW) — `code-reviewer`: audit dos 3 novos + 4 editados (read port read-only, Result→HTTP,
mapeamento legado, ADR-0006/0014/0026/0033).
