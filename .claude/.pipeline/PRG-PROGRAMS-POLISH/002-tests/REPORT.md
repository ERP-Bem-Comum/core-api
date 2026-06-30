# 002 — W0 — Cenários Bruno (spec executável) — PRG-PROGRAMS-POLISH

> Polish E2E: a coleção `.bru` É a especificação executável da borda `/api/v1/programs`.
> Para feature já implementada, W0 (cenários) e W1 (integração + execução) se fundem; a
> disciplina real é a **Invariante #1 (ADR-0038)**: rodar via `bru run` e passar.

## Cenários criados — `api-collections/core-api/8-programs/` (17 `.bru` + `folder.bru`)

| Arquivo | Asserção |
| --- | --- |
| `01-list-no-auth` | GET /programs sem token → 401 |
| `02-list-bare-user-403` | GET /programs sem `program:read` → 403 |
| `03-create-program` | POST → 201 + `Location` + corpo (ATIVO, version 1, programNumber); captura `id` via `setVar` |
| `04-get-program-by-id` | GET /:id → 200, id bate com o criado |
| `05-list-contains-created` | lista contém o criado; `meta` com campos de paginação |
| `06-update-program` | PUT (version correta) → 200, nome atualizado, version incrementada |
| `07-update-version-conflict` | PUT (version obsoleta) → 409 `program-version-conflict` |
| `08-deactivate-program` | POST /:id/deactivate → 200 INATIVO |
| `09-deactivate-already-inactive` | segunda desativação → 409 `program-not-active` |
| `10-reactivate-program` | POST /:id/reactivate → 200 ATIVO |
| `11-reactivate-already-active` | reativar ativo → 409 `program-not-inactive` |
| `12-create-sigla-duplicada` | sigla repetida → 409 `program-sigla-duplicated` |
| `13-create-nome-invalido-422` | nome <2 → 422 `program-name-required` |
| `14-create-sigla-invalida-422` | sigla fora de `[A-Z0-9]{2,20}` → 422 `program-sigla-invalid` |
| `15-logo-no-auth-401` · `16-logo-bare-user-403` · `17-logo-unsupported-type-415` | logo: auth/perm/tipo |

Login do operador: `0-auth/08-login-programs-operator.bru` (seta `programsOperatorToken`).

## Decisão sobre o logo (consciente)

O upload binário (content-type `image/png|jpeg|webp`, sem multipart) é coberto na coleção
por **401/403/415** (não dependem de body válido). O **200** do upload fica nos testes
`fastify.inject` já verdes (`tests/modules/programs/adapters/http/programs-logo.routes.test.ts`):
enviar bytes binários de forma confiável via `.bru` exigiria assets externos e aumentaria a
fragilidade do runner. Documentado em `folder.bru`.
