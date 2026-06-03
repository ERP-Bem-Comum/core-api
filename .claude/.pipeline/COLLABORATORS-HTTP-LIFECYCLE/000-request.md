# Ticket COLLABORATORS-HTTP-LIFECYCLE: desativar + reativar (P3)

> Fatia **P3** do `EPIC-COLLABORATORS-HTTP-V1`. Soft-delete via dois endpoints.

## Contexto

Última fatia de write das transições de estado. Decisão do dono (2026-06-03): **dois endpoints
separados** (`POST /:id/deactivate` + `POST /:id/reactivate`), em vez do `PATCH /:id/toggle-active`
único do legado — alinha com o domínio (operações `deactivate`/`reactivate` distintas) e com o estilo
action-based do contracts. Writer pool (já existe desde a P2).

## Escopo

- **`adapters/http/composition.ts`** — expõe `deactivateCollaborator` + `reactivateCollaborator` (writer).
- **`adapters/http/schemas.ts`** — `deactivateCollaboratorBodySchema` (`disableBy` enum dos 4 motivos de RH;
  `LEGACY_MIGRATION` é marcador de ETL, **fora** da borda humana → valor inválido = 400).
- **`adapters/http/plugin.ts`** — `POST /:id/deactivate` (body `{ disableBy }`) e `POST /:id/reactivate`
  (sem body), ambos `authorize('collaborator:write')`, 200; reusa `sendWriteError` (+ not-found/invalid-id).

## Fora de escopo

- `toggle-active` único (legado) — decisão: dois endpoints.
- Edição cadastral → fatia **P4-EDIT** (com RBAC elevado p/ campos vitais).

## Critérios de aceite

- [ ] `POST /:id/deactivate` sem token → 401; sem `collaborator:write` → 403; `:id` não-UUID → 400.
- [ ] `deactivate` body sem/`disableBy` inválido → 400 (Zod); id inexistente → 404.
- [ ] `deactivate` de um ativo → **200**; 2ª vez → **409** (`collaborator-already-inactive`).
- [ ] `POST /:id/reactivate` de um inativo → **200**; de um ativo → **409** (`collaborator-already-active`); inexistente → 404.
- [ ] `tsc` + `format:check` + `test` + `lint` verdes; zero regressão.

## Referências

- `handbook/legacy_docs/openapi.yaml:209` (toggle-active legado, referência).
- `deactivate-collaborator.ts`, `reactivate-collaborator.ts`, `disable-reason.ts`.
- ADR-0033 (v1), ADR-0026 (writer), ADR-0027 (Zod), ADR-0024 (RBAC).
- Spec: `.claude/.planning/EPIC-COLLABORATORS-HTTP-V1.md` §5 (P3).
