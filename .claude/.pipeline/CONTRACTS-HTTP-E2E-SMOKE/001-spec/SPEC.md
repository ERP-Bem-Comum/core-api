# SPEC — CONTRACTS-HTTP-E2E-SMOKE (C5)

> Refina [`000-request.md`](../000-request.md). **Decisão (a) aprovada** (2026-05-28, Gabriel): seed RBAC
> via env atrás de flag dev/test, habilitando o smoke a validar o CRUD real. Espelha `AUTH-HTTP-E2E-SMOKE`.

## 1. Decisões cravadas

- **D1 — Seed RBAC via env (opção a):** função **pura** `parseE2eAuthSeed(env) => AuthSeed | undefined`,
  exportada (de `auth/public-api`), com **guarda dupla**: só retorna seed quando `CORE_API_E2E === '1'` **e**
  `AUTH_SEED_JSON` presente/válido. `src/server.ts` chama essa função e repassa o seed a `buildAuthHttpDeps`.
  Em produção (`CORE_API_E2E` ausente) → `undefined`, seed **nunca** lido. JSON inválido sob a flag → erro de boot.
  Formato: `{"users":[{"email","password","permissions":["contract:read","contract:write"]}]}` (= `AuthSeed`).
- **D2 — Infra do smoke (`scripts/e2e-contracts.sh`):** sobe `mysql` + `minio` via `docker compose --wait`
  (o `minio-bootstrap` já cria o bucket `contracts-documents`). Env do server real:
  - `AUTH_DRIVER=mysql` · `AUTH_DATABASE_URL=mysql://root:<rootpw>@127.0.0.1:3306/core`
  - `CONTRACTS_DRIVER=mysql` · `CONTRACTS_DATABASE_URL` (writer, root) ·
    **`CONTRACTS_READER_URL=mysql://readonly_bi:<ropw>@127.0.0.1:3306/core`** (reader SELECT-only — valida o
    RW split com credenciais distintas; reader abre com `applyMigrations:false`).
  - `S3_REGION=us-east-1` · `S3_BUCKET=contracts-documents` · `S3_ACCESS_KEY_ID=dev-access-key` ·
    `S3_SECRET_ACCESS_KEY=dev-secret-key-min-8-chars` · `S3_ENDPOINT=http://127.0.0.1:9000` (boot do C3).
  - `CORE_API_E2E=1` · `AUTH_SEED_JSON=<operador com contract:read+write>` · `PORT=3100`.
  - `trap` faz teardown (mata server, `docker compose down -v`, remove secrets) mesmo em falha.
- **D3 — Reader com `readonly_bi`:** reads (`list`/`get`/`export.csv`) roteiam ao reader (SELECT-only);
  writes (`POST`) ao writer (root). Se uma escrita vazasse para o reader, falharia por falta de privilégio —
  o smoke prova o roteamento correto.
- **D4 — Fail-first em duas camadas:**
  - **Unitário (entra no `pnpm test`):** `parseE2eAuthSeed` — guarda, parse, rejeição de JSON inválido.
    RED no W0 (função inexistente).
  - **E2E (Docker, fora do `pnpm test`):** `tests/e2e/contracts-smoke.e2e.ts` via `fetch` — RED/GREEN
    rodando `pnpm run test:e2e:contracts`. Docker disponível no ambiente → validação real no W0/W1.
- **D5 — `test:e2e:contracts`** novo script no `package.json` (não entra no `pnpm test`).

## 2. Smoke (`contracts-smoke.e2e.ts`) — casos

- **CA1:** `GET /health` → 200 (server sobe com auth+contracts mysql + storage, dual-pool, sem erro de boot).
- **CA2 (authz negativo):** `GET /api/v2/contracts` sem token → 401; user `register`+login normal (roles:[])
  → `GET /api/v2/contracts` → 403 (sem `contract:read`).
- **CA3 (auth coexistência):** register→login→`/me` 200 com os dois módulos montados.
- **CA4 (CRUD real — reader/writer):** login do **operador seedado** (`contract:read`+`write`) →
  `POST /api/v2/contracts` (mode Active) 201 → `GET /api/v2/contracts/:id` 200 (reader, readonly_bi) →
  `GET /api/v2/contracts/export.csv` 200 `text/csv` (reader) → `GET /api/v2/contracts` 200 contém o criado.
- **CA5 (teardown):** `trap` derruba tudo mesmo se o smoke falhar (verificado: rodar 2x não conflita).

## 3. Critérios de aceitação

Mapeiam 1:1 aos casos CA1-CA5 acima. GREEN = `pnpm run test:e2e:contracts` sai 0 com todos verdes;
`pnpm test` (unitário do `parseE2eAuthSeed`) verde; gates W3 (`typecheck`/`lint`/`format`) verdes.

## 4. Segurança (D1 — revisão no W2)

- Guarda **dupla** (`CORE_API_E2E==='1'` **E** `AUTH_SEED_JSON` presente) — sem a flag, o código de seed é
  inerte. O seed só **adiciona** um user; não altera fluxo de auth. Senha forte. Documentar no `server.ts`
  que `CORE_API_E2E`/`AUTH_SEED_JSON` são **exclusivos de dev/test/E2E** e nunca setados em produção.
- `web-security-backend` pode revisar a guarda no W2 (mexe em código de produção, ainda que inerte em prod).

## 5. Arquivos previstos (W1)

- `auth/public-api/` (ou `src/`): `parseE2eAuthSeed(env)` + export.
- `src/server.ts`: chamar `parseE2eAuthSeed` e repassar o seed a `buildAuthHttpDeps`.
- `scripts/e2e-contracts.sh` (novo) — espelha `e2e-auth.sh`, com as env de D2.
- `tests/e2e/contracts-smoke.e2e.ts` (novo).
- `tests/.../e2e-auth-seed.test.ts` (novo, unitário de `parseE2eAuthSeed`) — W0 RED.
- `package.json`: script `test:e2e:contracts`.

## 6. Fora de escopo

- Upload de documento no smoke (bytes reais + MinIO no fluxo) — opcional, deixado fora do smoke mínimo.
- Réplica MySQL física (2 nós) — o reader usa o mesmo MySQL com creds readonly (valida wiring, não replicação).
- CI wiring do e2e — ticket próprio.
