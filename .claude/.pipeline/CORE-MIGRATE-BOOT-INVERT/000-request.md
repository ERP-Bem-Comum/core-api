# CORE-MIGRATE-BOOT-INVERT — Fase 5 Slice B (inverter o boot)

> **Depende do Slice A** (`CORE-MIGRATE-JOB`, no PR #211): o job `migrate` já existe e aplica o
> schema dos 6 módulos. Este ticket **remove** o migrate-no-boot — o schema passa a ser
> provisionado **somente** pelo job `migrate`. Resolve o race de deploy multi-instância que o
> comentário "M5" dos drivers já antecipa. **Alto risco** (boot sequence) — por isso foi fatiado.

## Escopo

1. **Inverter as 5 compositions HTTP** (`adapters/http/composition.ts`) — `applyMigrations: true → false`:
   `auth`, `contracts`, `financial`, `partners`, `programs`. Atualizar os comentários (o boot deixa
   de migrar; o schema é do release/job).
2. **4 scripts E2E** (`scripts/e2e-{auth,contracts,collaborators,bruno-all}.sh`) — rodar
   `node src/jobs/migrate/run.ts` (via `MIGRATE_DATABASE_URL`) **antes** de subir `src/server.ts`,
   já que esses scripts sobem o server real com `*_DRIVER=mysql` e hoje dependem do migrate-no-boot.
3. **Compose** — o service `migrate` ganha os profiles `app`/`workers`/`jobs` (um serviço pode ter
   vários profiles): assim `--profile app|workers` ativa o migrate como dependência, mas o **default
   (sem profile) continua só-infra**. `http` e os 5 workers ganham
   `depends_on: migrate (condition: service_completed_successfully)`. (docker-compose-expert)
4. **Testes** — remover o guard CA9 do Slice A (`migrate-compose.test.ts`, que afirmava o oposto) e
   criar o novo invariante.

## Critérios de aceite

- **CA-B1** — as 5 compositions HTTP usam `applyMigrations: false` (boot **não** migra). [grep]
- **CA-B2** — no compose, `http` e os 5 workers têm `depends_on.migrate.condition ==
  service_completed_successfully`; o `migrate` está disponível nos profiles `app`/`workers`/`jobs`. [meta config]
- **CA-B3** — cada `e2e-*.sh` executa `src/jobs/migrate/run.ts` **antes** de `src/server.ts` (ordem
  no arquivo). [grep ordenado]
- **CA-B4** — sem profile, `docker compose config --services` **não** lista `migrate` nem `http`
  (default só-infra preservado). [meta]
- **CA-B5** (não-regressão) — `pnpm test` segue verde: a inversão não afeta o gate, pois os testes
  mysql reais chamam `open*Mysql` direto e os testes de composition+mysql só exercitam `assert.rejects`
  sem URL válida (não conectam/migram). [gate]

## Validação Docker real (W3 — o ponto de risco)

Subir `mysql` (compose `--wait`) → rodar `migrate` (cria o schema dos 6 módulos) → subir `http` com
`applyMigrations:false` → `GET /health` 200. Prova que o boot **não** migra mais e o job migra.

## Fora de escopo

ETL (`public-api/etl.ts`) e `seed-partners.ts` seguem migrando (jobs de provisionamento deliberados).
Dockerfile→deploy/ (descartado).

## Tamanho

M — 5 edições de 1 linha + 4 scripts + compose `depends_on` + testes. Mudança pequena em LOC, **alto
risco operacional** (sequência de boot) — daí a validação Docker.
