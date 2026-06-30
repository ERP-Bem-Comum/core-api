# W1 — GREEN — COLLABORATORS-HTTP-LIFECYCLE (P3)

> Skill: `ports-and-adapters`. Soft-delete via dois endpoints.

## Arquivos editados

- `adapters/http/composition.ts` — expõe `deactivateCollaborator` + `reactivateCollaborator` (writer pool).
- `adapters/http/schemas.ts` — `deactivateCollaboratorBodySchema` (`disableBy` enum dos 4 motivos de RH; `LEGACY_MIGRATION` fora → 400).
- `adapters/http/plugin.ts` — `POST /:id/deactivate` (body `{disableBy}`) + `POST /:id/reactivate` (sem body); `writeErrorStatus` estendido (not-found/invalid-id de deactivate/reactivate).
- `tests/.../collaborators-lifecycle.routes.test.ts` — helpers async com `await` + `body: Record<string,unknown>` (overload do `inject`).

## Decisões / notas (W1)

- **Dois endpoints** (decisão do dono), não o `toggle-active` único do legado.
- `LEGACY_MIGRATION` (marcador de ETL) **não** é aceito na borda humana → 400.
- Gotcha de tipo: `body: unknown` quebrava o overload de `app.inject` (retornava união `void & Promise & Chain`); tipar como objeto resolveu.

## Saída literal do gate (encadeado, exit 0)

```
$ tsc --noEmit            (zero)
$ prettier --check .      All matched files use Prettier code style!
$ eslint .                (zero)
ℹ tests 2044
ℹ pass 2027
ℹ fail 0
ℹ skipped 17
```

Teste P3 isolado: `8 · pass 8 · fail 0`.

→ **GREEN**: 8 CAs; zero regressão (2027 = 2019 + 8 novos).

## Próximo passo

W2 (REVIEW) — `code-reviewer`.
