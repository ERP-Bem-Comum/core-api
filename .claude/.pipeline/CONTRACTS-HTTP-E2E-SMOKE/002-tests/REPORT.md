# W0 (RED) — CONTRACTS-HTTP-E2E-SMOKE (C5)

> Skill: `tdd-strategist` · Outcome: **RED** (fail-first em 2 camadas — D4)

## Testes escritos

### Camada 1 — unitário (entra no `pnpm test`)
`tests/modules/auth/public-api/e2e-auth-seed.test.ts` — 6 casos de `parseE2eAuthSeed(env)`:
sem `CORE_API_E2E` → undefined; `CORE_API_E2E != 1` → undefined; `=1` sem `AUTH_SEED_JSON` → undefined;
`=1` + JSON válido → `AuthSeed`; `=1` + JSON malformado → lança; `=1` + shape inválido → lança.

### Camada 2 — smoke E2E (Docker, fora do `pnpm test`)
`tests/e2e/contracts-smoke.e2e.ts` — via `fetch` contra o server real, espelhando `auth-smoke.e2e.ts`:
- CA1 `/health` 200 (boot auth+contracts mysql + storage);
- CA2 `GET /contracts` sem token → 401, token sem `contract:read` → 403;
- CA3 register→login→`/me` (coexistência);
- CA4 operador seedado → `POST /contracts` 201 (writer) → `GET /:id` 200 (reader) → `export.csv` 200 →
  `list` 200 (RW split com creds distintas).

## Evidência RED

```
e2e-auth-seed.test.ts → tests 1 · pass 0 · fail 1
  SyntaxError: módulo '#src/.../auth/public-api/http.ts' não exporta 'parseE2eAuthSeed'
```

O import inexistente derruba o arquivo (RED limpo). O smoke `.e2e.ts` está **fora** do glob `*.test.ts`
(confirmado) — só roda via `pnpm run test:e2e:contracts` (a criar no W1), com Docker.

## API que o W1 deve entregar

```
auth/public-api/http.ts: export parseE2eAuthSeed(env) => AuthSeed | undefined (guarda dupla
                         CORE_API_E2E==='1' + AUTH_SEED_JSON válido; lança em JSON/shape inválido).
                         Reexportar AuthSeed.
src/server.ts: const seed = parseE2eAuthSeed(process.env); repassar a buildAuthHttpDeps quando definido.
scripts/e2e-contracts.sh (novo): compose mysql+minio --wait; server com AUTH/CONTRACTS mysql + S3 (MinIO) +
                         CONTRACTS_READER_URL=readonly_bi + CORE_API_E2E=1 + AUTH_SEED_JSON; trap teardown.
package.json: script test:e2e:contracts.
```

GREEN do W1 = `pnpm test` (unitário) verde + `pnpm run test:e2e:contracts` (Docker) sai 0.
