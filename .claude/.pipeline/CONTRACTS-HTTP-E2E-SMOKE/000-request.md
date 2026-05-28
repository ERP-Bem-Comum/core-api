# CONTRACTS-HTTP-E2E-SMOKE (C5) — smoke E2E da borda contracts

## Origem

[`EPIC-CONTRACTS-HTTP`](../../.planning/EPIC-CONTRACTS-HTTP.md) §10 C5 — última fatia. Espelha
`AUTH-HTTP-E2E-SMOKE` (`scripts/e2e-auth.sh` + `tests/e2e/auth-smoke.e2e.ts`): cliente Node + `fetch`
contra o **servidor real** (`src/server.ts`) sobre **MySQL real** (Docker), sem `app.inject`. Valida
**dual-pool (RW split, ADR-0026) + authz (RBAC) + persistência real** ponta-a-ponta. Depende de C0-C4.

## O que este ticket entrega

1. `scripts/e2e-contracts.sh` — orquestra: sobe `mysql` (+ `minio`) via compose `--wait`, inicia o server
   real com `AUTH_DRIVER=mysql` + `CONTRACTS_DRIVER=mysql` + env de storage, roda o smoke, faz teardown
   (`trap`). Espelha `e2e-auth.sh`.
2. `tests/e2e/contracts-smoke.e2e.ts` (sufixo `.e2e.ts` → fora do `pnpm test`) — smoke via `fetch`.
3. Script `test:e2e:contracts` no `package.json`.

## Pontos de atenção / dependências (decisões na SPEC)

1. **Storage obrigatório no boot (herança do C3):** desde o C3, `buildContractsHttpDeps({driver:'mysql'})`
   chama `parseAwsS3Env(process.env)` e **lança no boot** se as `S3_*` faltarem. Logo o smoke **precisa**
   subir o **MinIO** (já há `test:integration:storage` usando o serviço `minio`) e setar `S3_REGION/
   S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/S3_ENDPOINT`. Sem isso o server nem sobe com contracts mysql.
2. **RBAC em mysql — como obter token com `contract:read`/`contract:write`?** `register` cria `roles:[]`
   (→ 403 nas rotas de contract) e o seed RBAC **de contratos** é memory-only (D3 do C2). PORÉM o seed RBAC
   **do auth** (`applyRbacSeed`) é **driver-agnóstico** (roda sobre `userRepo`, mysql inclusive) — só não é
   exposto via env no `src/server.ts`. **Decisão a tomar:**
   - (a) estender `src/server.ts` para aceitar um seed RBAC via env **atrás de flag dev/test** explícita
     (ex.: `AUTH_SEED_JSON` só lido quando `CORE_API_E2E=1`) — habilita o smoke a validar CRUD 200/201;
     **risco**: seed em código de produção (mitigado pela flag + guarda);
   - (b) smoke **sem** user privilegiado: valida só o caminho negativo de contracts (401 sem token, 403 sem
     permissão) + o fluxo auth completo + dual-pool no boot. Menos cobertura, zero mudança em `server.ts`.
3. **Smoke mínimo (independe da decisão 2):** `/health` 200; `GET /api/v2/contracts` sem token → 401;
   com token sem permissão → 403; OpenAPI `/docs/json` servido. **Com** seed (opção 2a): `POST /contracts`
   201 → `GET /contracts/:id` 200 → `GET /contracts/export.csv` 200 (valida reader/dual-pool + CSV real).
4. **Não entra no `pnpm test`** — exige Docker (igual ao auth smoke).

## Critérios de aceitação (a consolidar na SPEC)

- **CA1:** `GET /health` → 200; server sobe com auth+contracts **mysql** (dual-pool + storage) sem erro de boot.
- **CA2 (authz):** `GET /api/v2/contracts` sem token → 401; token sem `contract:read` → 403.
- **CA3 (auth coexistência):** fluxo register→login→/me segue funcional com os dois módulos montados.
- **CA4 (CRUD real — se decisão 2a):** com user seedado (`contract:write`), `POST /contracts` 201 →
  `GET /:id` 200 → `GET /export.csv` 200 (reader). Valida RW split com MySQL real.
- **CA5 (teardown):** `trap` derruba compose + server + secrets mesmo em falha.

## Fora de escopo

- Upload de documento no smoke (exigiria bytes reais + MinIO no fluxo) — avaliar como opcional na SPEC.
- CI wiring (rodar o e2e no pipeline de CI) — ticket próprio.
