# Ticket COLLABORATORS-HTTP-E2E-SMOKE: smoke E2E da borda /api/v1 (P4-SMOKE)

> Fatia opcional do `EPIC-COLLABORATORS-HTTP-V1`. Verificação ponta-a-ponta com MySQL real.

## Contexto

As fatias P0–P3 entregaram o CRUD de `/api/v1/collaborators` validado com `app.inject` + driver memory.
Em memory, reader e writer são **stores distintos** (read-after-write não reflete). Este smoke roda o
**servidor real** (`src/server.ts`) com **partners em MySQL** (writer=root, reader=readonly_bi no mesmo
banco `core`) e exercita o fluxo via `fetch` — validando de verdade o **read-after-write via reader pool**
(ADR-0026), RBAC e persistência. Espelha `scripts/e2e-contracts.sh` + `tests/e2e/contracts-smoke.e2e.ts`.

Auth/contracts ficam em **memory** (não participam do fluxo) — foco no partners MySQL. Não usa S3.

## Escopo

- **`tests/e2e/collaborators-smoke.e2e.ts`** — smoke via `fetch` (sufixo `.e2e.ts` → fora do `pnpm test`):
  health → 401/403 → operador seedado → POST cadastro (201+Location) → GET /:id (reader, read-after-write)
  → GET lista → PATCH complete → deactivate → reactivate.
- **`scripts/e2e-collaborators.sh`** — sobe MySQL (compose `--wait`), inicia o server com
  `PARTNERS_DRIVER=mysql` + writer/reader URLs + seed RBAC (`collaborator:read`+`write`), roda o smoke, `trap` teardown.
- **`package.json`** — script `test:e2e:collaborators`.

## Fora de escopo

- `complete-registration` público; edição (P4-EDIT); S3/upload.
- Não entra no `pnpm test` nem no gate W3 (exige Docker) — verificação manual/CI dedicada.

## Critérios de aceite

- [ ] `bash scripts/e2e-collaborators.sh` sobe MySQL + server e o smoke passa (exit 0).
- [ ] Smoke valida: /health 200; 401 sem token; 403 sem permissão; POST 201+Location; **GET /:id 200 (reader) reflete o POST (writer)**; lista contém; complete 200; deactivate 200; reactivate 200.
- [ ] `.e2e.ts` e script passam `tsc`/`format`/`lint`; `pnpm test` puro inalterado (zero regressão).

## Referências

- `scripts/e2e-contracts.sh`, `tests/e2e/contracts-smoke.e2e.ts` (padrão).
- ADR-0026 (RW split), ADR-0033 (v1). Spec: `.claude/.planning/EPIC-COLLABORATORS-HTTP-V1.md` §5 (P4-SMOKE).
