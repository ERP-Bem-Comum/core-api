# W1 (GREEN) — CONTRACTS-HTTP-E2E-SMOKE (C5)

> Agente: `fastify-server-expert` (main thread) · Outcome: **GREEN** (unitário 6/6 + smoke E2E 4/4)

## O que foi implementado

### Seed RBAC via env (D1)
- `auth/adapters/http/e2e-seed.ts` (novo): `parseE2eAuthSeed(env) => AuthSeed | undefined` — guarda dupla
  `CORE_API_E2E === '1'` + `AUTH_SEED_JSON` válido; type guards; lança em JSON/shape inválido. Reexportado
  em `auth/public-api/http.ts` (+ tipo `AuthSeed`).
- `src/server.ts`: chama `parseE2eAuthSeed(process.env)` e repassa o seed a `buildAuthHttpDeps`. Inerte em
  produção (sem a flag).

### Infra E2E (D2)
- `scripts/e2e-contracts.sh`: sobe `mysql --wait`, server real com auth+contracts mysql + dual-pool
  (writer=root, reader=`readonly_bi`) + S3 config + seed. `trap` teardown **robusto** (`pkill` de fallback
  + limpeza preventiva de órfãos no início). MinIO não sobe (smoke sem upload — SPEC §6).
- `tests/e2e/contracts-smoke.e2e.ts`: CA1-CA4 via `fetch`. `package.json`: `test:e2e:contracts`.

## Bugs reais encontrados pelo smoke (corrigidos)

1. **Seed RBAC quebrava em mysql** (`applyRbacSeed`): criava `Role` inline mas não o persistia; a FK
   `auth_user_role.role_id → auth_role.id` falhava. Fix: `roleRepo.save(role)` **antes** do `userRepo.save`.
   Adicionado `roleRepo` aos `Stores` (memory + mysql). Bug latente do C1, só exposto com mysql.
2. **Migrations de contracts não rodavam** (`auth` + `contracts` no mesmo DB `core`): ambos os drivers
   usavam o journal default `__drizzle_migrations` → o migrator de um módulo pulava o do outro por
   timestamp. Fix: `migrationsTable` por módulo (`__drizzle_migrations_{auth,contracts}`). Bug latente —
   os testes de integração rodam um módulo por vez, nunca pegaram. `ctr_contracts` agora é criada.

## Bugs do próprio smoke (corrigidos)

3. **CA2** assumia 403 na list (`GET /contracts`, C0, só `requireAuth`) — corrigido para validar 403 via
   `GET /contracts/:id` (C1, `authorize('contract:read')`).
4. **CA4** usava `sequentialNumber` fora do formato `/^\d{3}\/\d{4}$/` → 422. Corrigido para `NNN/2026`.
5. **Script** deixava server órfão na 3100 entre runs (zumbi conectado a MySQL destruído respondia /health
   e falhava queries). Fix: `pkill` no cleanup + limpeza preventiva.

## Evidência GREEN

```
e2e-auth-seed.test.ts (unitário, pnpm test) → 6/6
pnpm test (completo) → tests 1553 · pass 1537 · fail 0 · skipped 16
pnpm run test:e2e:contracts (Docker, server real + MySQL dual-pool) → tests 4 · pass 4 · fail 0
  CA1 health · CA2 401+403 · CA3 auth coexistência · CA4 CRUD writer(root)→reader(readonly_bi)→export.csv
```

Gates W3 antecipados: `typecheck` ✓ · `lint` ✓ · `format:check` ✓ · `test` ✓ · smoke E2E ✓.

## Nota para o W2

- Os fixes #1 (seed/role FK) e #2 (migrationsTable) tocam **código de produção** de dois módulos
  (auth composition + ambos os mysql-drivers) — merecem atenção do review. São correções de bugs latentes,
  não regressões. O #2 muda o nome da tabela de journal: em ambiente com `__drizzle_migrations` legado
  exigiria migração do journal (irrelevante em Fase 1, sem prod; E2E sobe do zero).
- Validação E2E confirmada **manualmente** (Docker) — o smoke não entra no `pnpm test`.
