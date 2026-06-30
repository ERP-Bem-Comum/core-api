# W0 — RED — COLLABORATORS-HTTP-E2E-SMOKE (P4-SMOKE)

> Skill: `tdd-strategist`. Ticket de **verificação E2E** (não fail-first de código novo — a API já
> existe de P0–P3). O "RED" é estrutural: o smoke não roda sem o script de orquestração.

## Arquivo criado

- `tests/e2e/collaborators-smoke.e2e.ts` — smoke via `fetch` (sufixo `.e2e.ts` → **fora** do `pnpm test`).

## Cenários (CA)

- CA1: `/health` → 200.
- CA2: `GET /api/v1/collaborators` sem token → 401; com user sem permissão → 403.
- CA3: operador seedado → POST 201 + Location → **GET /:id 200 (reader reflete o writer)** → lista contém.
- CA4: complete → deactivate → reactivate (transições persistidas no MySQL).

## Estado no W0

Sem `scripts/e2e-collaborators.sh` + sem server up, `node --test tests/e2e/collaborators-smoke.e2e.ts`
falha no `before(waitReady)` (nenhum server em :3100). RED estrutural. GREEN no W1 = script sobe
MySQL+server e o smoke passa.

## Próximo passo

W1 — `ports-and-adapters`: `scripts/e2e-collaborators.sh` (partners=mysql RW split, seed RBAC) +
`package.json` (`test:e2e:collaborators`); executar a prova real com Docker.
