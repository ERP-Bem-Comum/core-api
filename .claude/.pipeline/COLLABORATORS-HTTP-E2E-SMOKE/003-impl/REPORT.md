# W1 — GREEN — COLLABORATORS-HTTP-E2E-SMOKE (P4-SMOKE)

> Skill: `ports-and-adapters` (orquestração/tooling). Prova real contra MySQL.

## Arquivos criados/editados

- `scripts/e2e-collaborators.sh` — sobe MySQL (compose `--wait`), server real com `PARTNERS_DRIVER=mysql`
  (writer=root, reader=readonly_bi), seed RBAC (`collaborator:read`+`write`), roda o smoke, `trap` teardown.
  **Parametrizado por `MYSQL_PORT`** (default 3306) — evita conflito com um MySQL já na 3306 (stack `bemcomum-*`).
- `package.json` — `test:e2e:collaborators`.
- `tests/e2e/collaborators-smoke.e2e.ts` — ajustes de lint/tsc (optional-chain/array-type/`?? ''`).

## Decisões

- **auth/contracts em memory** (não participam do fluxo); foco no **partners MySQL**. Sem S3.
- **read-after-write**: POST (writer root) → GET /:id (reader readonly_bi) no mesmo banco `core` — o que o
  driver memory (stores distintos) não exercita.

## Saída literal da prova (`MYSQL_PORT=3307 pnpm run test:e2e:collaborators`)

```
 Container core-api-mysql Healthy
▶ COLLABORATORS-HTTP-E2E-SMOKE — borda /api/v1 (server real + partners MySQL RW split)
  ✔ CA1: GET /health -> 200
  ✔ CA2: GET /api/v1/collaborators sem token -> 401; sem permissao -> 403
  ✔ CA3: operador -> POST 201 + Location -> GET /:id 200 (reader reflete writer) -> lista contem
  ✔ CA4: complete -> deactivate -> reactivate (transicoes no MySQL real)
ℹ tests 4
ℹ pass 4
ℹ fail 0
```

Teardown verificado: nenhum `core-api-mysql` órfão; `bemcomum-mysql` intacto.

→ **GREEN**: smoke ponta-a-ponta contra MySQL real valida RW split + RBAC + persistência das transições.

## Próximo passo

W2 (REVIEW) — `code-reviewer`.
